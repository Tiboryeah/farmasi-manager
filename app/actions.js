'use server';

import { Product, Sale, InventoryMovement, Expense, User } from '@/lib/models';
import { connectDB, initDB } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { checkAndRunWeeklyBackup, getBackupData } from '@/lib/backup';

const SECRET_KEY = process.env.JWT_SECRET || "secret-key-change-in-prod";
const key = new TextEncoder().encode(SECRET_KEY);

// Helper to serialize Mongoose docs to plain objectsa 
const serialize = (data) => {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
};

export async function deleteProduct(productId) {
  try {
    await connectDB();
    await Product.findByIdAndDelete(productId);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { error: "Error al eliminar el producto" };
  }
}

// --- DATABASE MAINTENANCE ---
export async function resetDatabaseAction() {
  try {
    await connectDB();
    // Delete all business data but KEEP users
    await Promise.all([
      Product.deleteMany({}),
      Sale.deleteMany({}),
      InventoryMovement.deleteMany({}),
      Expense.deleteMany({})
    ]);

    // Seed basic products again
    await initDB();

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/reports');
    return { success: true };
  } catch (error) {
    console.error("Error resetting database:", error);
    return { error: "Error al reiniciar la base de datos" };
  }
}

// --- AUTH ---
export async function loginAction(formData) {
  const username = formData.get("username");
  const password = formData.get("password");

  try {
    await connectDB();

    const userCount = await User.countDocuments();

    // First Run: Create Test Accounts
    if (userCount === 0) {
      // Create 'prueba' user with 'prueba' password
      const hashedPrueba = await bcrypt.hash("prueba", 10);
      await User.create({ username: "prueba", password: hashedPrueba });

      // If the current login isn't prueba, create that one too
      if (username !== "prueba") {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
      }

      await initDB();
    } else {
      // Check User
      const user = await User.findOne({ username });
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { error: "Usuario o contraseña inválidos" };
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) return { error: "Usuario o contraseña inválidos" };
    }

    // Login Success: Create Session
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const session = await new SignJWT({ username })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(key);

    (await cookies()).set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  } catch (error) {
    // Next.js redirect() throws an error, which should not be caught here.
    // Re-throw if it's a redirect error.
    if (error && error.message && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Login Error:", error);
    return { error: "Error interno del servidor. Revisa los logs." };
  }

  redirect('/');
}

export async function logoutAction() {
  (await cookies()).set("session", "", { expires: new Date(0) });
  redirect('/login');
}


// --- PRODUCTS ---
export async function getProducts(search = '') {
  await connectDB();
  const query = { active: true };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  const products = await Product.find(query).sort({ createdAt: -1 }).lean();
  return serialize(products.map(p => ({ ...p, id: p._id.toString() })));
}

export async function getProduct(id) {
  await connectDB();
  try {
    const product = await Product.findById(id).lean();
    if (!product) return null;
    return serialize({ ...product, id: product._id.toString() });
  } catch (e) {
    return null;
  }
}

export async function createProduct(data) {
  await connectDB();
  const product = await Product.create({
    name: data.name,
    category: data.category || 'General',
    cost: parseFloat(data.cost),
    price: parseFloat(data.price),
    stock: parseInt(data.stock),
    minStock: parseInt(data.minStock || 5),
    image: data.image || '📦'
  });

  // Initial Inventory Movement
  await InventoryMovement.create({
    product: product._id,
    type: 'Inicial',
    quantity: parseInt(data.stock),
    reason: 'Inventario Inicial',
    date: new Date()
  });

  revalidatePath('/inventory');
  revalidatePath('/sales/new');
  return product._id.toString();
}

export async function updateProductStock(id, newStock, reason) {
  await connectDB();
  const product = await Product.findById(id);
  if (!product) return;

  const diff = newStock - product.stock;
  product.stock = newStock;
  await product.save();

  await InventoryMovement.create({
    product: product._id,
    type: 'Ajuste',
    quantity: diff,
    reason: reason,
    date: new Date()
  });

  revalidatePath('/inventory');
}

// --- SALES ---
export async function getSales() {
  await connectDB();
  const sales = await Sale.find().sort({ date: -1 }).limit(50).lean();
  return serialize(sales.map(s => ({ ...s, id: s._id.toString() })));
}

export async function getAllSales() {
  await connectDB();
  const sales = await Sale.find().sort({ date: -1 }).lean();
  return serialize(sales.map(s => ({ ...s, id: s._id.toString() })));
}

export async function createSale(cart) {
  await connectDB();
  // cart: array of { id, qty, price, cost }
  let total = 0;
  let totalProfit = 0;
  const saleItems = [];

  for (const item of cart) {
    const qty = parseInt(item.qty);
    const profit = (item.price - item.cost) * qty;

    total += item.price * qty;
    totalProfit += profit;

    // Prepare item for embedding
    saleItems.push({
      product: item.id,
      name: item.name || 'Unknown', // Mongoose schema has name? Yes I added it to snapshot
      quantity: qty,
      unitCost: item.cost,
      unitPrice: item.price,
      profit: profit
    });

    // Update Stock
    await Product.findByIdAndUpdate(item.id, { $inc: { stock: -qty } });

    // Log Movement
    // Note: We'll do this after creating the sale to have the sale ID if we wanted to link it, 
    // but strictly we just need to log it.
    await InventoryMovement.create({
      product: item.id,
      type: 'Venta',
      quantity: -qty,
      reason: `Venta`, // We don't have the specific sale ID yet if we do it here, but that's fine.
      date: new Date()
    });
  }

  const sale = await Sale.create({
    total,
    profit: totalProfit,
    items: saleItems,
    date: new Date(),
    paymentMethod: 'Efectivo'
  });

  revalidatePath('/');
  revalidatePath('/inventory');
  return serialize(sale);
}

// --- DASHBOARD ---
export async function getDashboardStats() {
  await connectDB();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Sales Today
  const salesToday = await Sale.aggregate([
    { $match: { date: { $gte: today } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$profit' } } }
  ]);

  // Sales Month
  const salesMonth = await Sale.aggregate([
    { $match: { date: { $gte: startOfMonth } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$profit' } } }
  ]);

  // Low Stock
  const lowStock = await Product.countDocuments({
    $expr: { $lte: ["$stock", "$minStock"] },
    active: true
  });

  // Total Products & Items
  const totalProducts = await Product.countDocuments({ active: true });
  const stockAggregation = await Product.aggregate([
    { $match: { active: true } },
    { $group: { _id: null, total: { $sum: '$stock' } } }
  ]);
  const totalStock = stockAggregation[0]?.total || 0;

  return serialize({
    today: {
      revenue: salesToday[0]?.revenue || 0,
      profit: salesToday[0]?.profit || 0
    },
    month: {
      revenue: salesMonth[0]?.revenue || 0,
      profit: salesMonth[0]?.profit || 0
    },
    lowStock: lowStock,
    totalProducts: totalProducts,
    totalStock: totalStock
  });
}

export async function getRecentActivity() {
  await connectDB();
  // Simulate the old join: get recent sales and flatten the list or just return sales
  // The UI likely expects a list of items sold.
  // SQL was: SELECT s.id, s.date, s.total, i.quantity, p.name ...

  // We'll fetch recent sales and map them
  const sales = await Sale.find().sort({ date: -1 }).limit(5).populate('items.product').lean();

  // Flatten to match the "Activity" feed style if needed, or just return sales.
  // Looking at the SQL, it returned one row per ITEM.
  // Let's try to reconstruct that structure.

  const activity = []
  for (const sale of sales) {
    for (const item of sale.items) {
      activity.push({
        id: sale._id.toString(), // Sale ID
        date: sale.date,
        total: sale.total, // Ensure this makes sense in context, SQL returned sale total
        quantity: item.quantity,
        name: item.name || (item.product ? item.product.name : 'Unknown')
      });
    }
  }

  return serialize(activity.slice(0, 5));
}

// --- EXPENSES ---
export async function getExpenses() {
  await connectDB();
  const expenses = await Expense.find().sort({ date: -1 }).limit(20).lean();
  return serialize(expenses.map(e => ({ ...e, id: e._id.toString() })));
}

export async function createExpense(data) {
  await connectDB();
  await Expense.create({
    category: data.category,
    amount: parseFloat(data.amount),
    paymentMethod: data.paymentMethod || 'Efectivo',
    note: data.note || ''
  });
  revalidatePath('/');
  revalidatePath('/expenses');
}


export async function performWeeklyBackupAction() {
  return await checkAndRunWeeklyBackup();
}

export async function downloadBackupAction() {
  const data = await getBackupData();
  return JSON.parse(JSON.stringify(data));
}

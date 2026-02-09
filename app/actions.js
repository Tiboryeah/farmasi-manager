'use server';

import { Product, Sale, InventoryMovement, Expense, User } from '@/lib/models';
import { connectDB, initDB } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

const SECRET_KEY = process.env.JWT_SECRET || "secret-key-change-in-prod";
const key = new TextEncoder().encode(SECRET_KEY);

// Initialize DB on first load (lazy)
// try {
//   initDB();
// } catch (e) {
//   console.error("DB Init failed", e);
// }

// Helper to serialize Mongoose docs to plain objects
const serialize = (data) => {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
};

// --- AUTH ---
export async function loginAction(formData) {
  try {
    const username = formData.get("username");
    const password = formData.get("password");

    await connectDB();

    // Check if user exists
    const user = await User.findOne({ username });

    // If NO users exist at all, create this one as admin (First Run Experience)
    const count = await User.countDocuments();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({ username, password: hashedPassword });
      // Proceed to login
    } else if (!user) {
      // Simple delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return { error: "Usuario o contraseña inválidos" };
    } else {
      // Verify password
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

    cookies().set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  } catch (e) {
    console.error("Login Error:", e);
    return { error: "Error interno del servidor. Intenta de nuevo." };
  }

  redirect('/');
}

export async function logoutAction() {
  cookies().set("session", "", { expires: new Date(0) });
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
  return products.map(p => ({ ...p, id: p._id.toString() }));
}

export async function getProduct(id) {
  await connectDB();
  try {
    const product = await Product.findById(id).lean();
    if (!product) return null;
    return { ...product, id: product._id.toString() };
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
  return sales.map(s => ({ ...s, id: s._id.toString() }));
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

  return {
    today: {
      revenue: salesToday[0]?.revenue || 0,
      profit: salesToday[0]?.profit || 0
    },
    month: {
      revenue: salesMonth[0]?.revenue || 0,
      profit: salesMonth[0]?.profit || 0
    },
    lowStock: lowStock
  };
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

  return activity.slice(0, 5).map(a => serialize(a));
}

// --- EXPENSES ---
export async function getExpenses() {
  await connectDB();
  const expenses = await Expense.find().sort({ date: -1 }).limit(20).lean();
  return expenses.map(e => ({ ...e, id: e._id.toString() }));
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


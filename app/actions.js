'use server';

import { Product, Sale, InventoryMovement, Expense, User } from '@/lib/models';
import { connectDB, initDB } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { checkAndRunWeeklyBackup, getBackupData } from '@/lib/backup';

const SECRET_KEY = process.env.JWT_SECRET || "secret-key-change-in-prod";
const key = new TextEncoder().encode(SECRET_KEY);

// Helper to get current session
async function getSession() {
  const session = (await cookies()).get("session")?.value;
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, key, { algorithms: ["HS256"] });
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper to serialize Mongoose docs to plain objectsa 
const serialize = (data) => {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
};

export async function deleteProduct(productId) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };
  try {
    await connectDB();
    await Product.findOneAndDelete({ _id: productId, userId: session.userId });
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { error: "Error al eliminar el producto" };
  }
}

// --- DATABASE MAINTENANCE ---
export async function resetDatabaseAction() {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };
  try {
    await connectDB();
    // Delete all business data ONLY FOR THIS USER
    await Promise.all([
      Product.deleteMany({ userId: session.userId }),
      Sale.deleteMany({ userId: session.userId }),
      InventoryMovement.deleteMany({ userId: session.userId }),
      Expense.deleteMany({ userId: session.userId })
    ]);

    // Seed basic products again for THIS USER
    await initDB(session.userId);

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

    let user;
    // First Run: Create Test Accounts
    if (userCount === 0) {
      const hashedPrueba = await bcrypt.hash("prueba", 10);
      await User.create({ username: "prueba", password: hashedPrueba });

      if (username !== "prueba") {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({ username, password: hashedPassword });
      } else {
        user = await User.findOne({ username: "prueba" });
      }

      await initDB(user._id); // We'll need to update initDB to take a userId
    } else {
      user = await User.findOne({ username });
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { error: "Usuario o contraseña inválidos" };
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) return { error: "Usuario o contraseña inválidos" };
    }

    // Login Success: Create Session
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const session = await new SignJWT({ username: user.username, userId: user._id.toString() })
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
  const session = await getSession();
  if (!session) return [];
  await connectDB();
  const query = { userId: session.userId, active: true };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  const products = await Product.find(query).sort({ createdAt: -1 }).lean();
  return serialize(products.map(p => ({ ...p, id: p._id.toString() })));
}

export async function getProduct(id) {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  try {
    const product = await Product.findOne({ _id: id, userId: session.userId }).lean();
    if (!product) return null;
    return serialize({ ...product, id: product._id.toString() });
  } catch (e) {
    return null;
  }
}

export async function createProduct(data) {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const product = await Product.create({
    userId: session.userId,
    name: data.name,
    code: data.code || '',
    category: data.category || 'General',
    cost: parseFloat(data.cost),
    price: parseFloat(data.price),
    stock: parseInt(data.stock),
    minStock: parseInt(data.minStock || 5),
    image: data.image || '📦',
    type: data.type || 'product',
    attributes: data.attributes || [],
    isTest: data.isTest || false
  });

  // If user requested a test copy (only for new products)
  if (data.createTestCopy) {
    const testName = `[PRUEBA] ${data.name}`;
    const pureName = data.name;

    // Check if a sample with either name already exists to avoid duplicates
    const existingSample = await Product.findOne({
      userId: session.userId,
      type: 'sample',
      $or: [{ name: testName }, { name: pureName }],
      active: true
    });

    if (!existingSample) {
      await Product.create({
        userId: session.userId,
        name: testName,
        code: data.code ? `${data.code}-TEST` : '',
        category: data.category || 'General',
        cost: parseFloat(data.cost),
        price: parseFloat(data.price),
        stock: 0,
        minStock: 1,
        image: data.image || '📦',
        type: 'sample',
        attributes: data.attributes || [],
        isTest: true
      });
    }
  }

  // Initial Inventory Movement
  await InventoryMovement.create({
    userId: session.userId,
    productId: product._id,
    type: 'entry',
    quantity: parseInt(data.stock),
    reason: 'Inventario Inicial',
    date: new Date()
  });

  // If it's a sample, record the expense
  if (data.type === 'sample' && data.stock > 0 && data.cost > 0) {
    await Expense.create({
      userId: session.userId,
      category: 'Muestras',
      amount: data.stock * data.cost,
      note: `Inventario Inicial: ${data.name}`,
      date: new Date()
    });
  }

  revalidatePath('/inventory');
  revalidatePath('/sales/new');
  return product._id.toString();
}

export async function copyInventoryToSamples() {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };
  try {
    await connectDB();
    const userId = session.userId;

    // Get all real products (exclude testers/samples themselves)
    const products = await Product.find({ userId, type: 'product', active: true });

    // Get existing samples to avoid duplicates
    const existingSamples = await Product.find({ userId, type: 'sample', active: true });
    const existingNames = new Set(existingSamples.map(p => p.name));

    const newSamples = [];
    for (const p of products) {
      const pureName = p.name;
      const testName = `[PRUEBA] ${p.name}`;

      // Check if either variation already exists in samples
      if (!existingNames.has(pureName) && !existingNames.has(testName)) {
        newSamples.push({
          userId,
          name: p.name,
          code: p.code ? `${p.code}-SAMPLE` : '',
          category: p.category,
          cost: p.cost,
          price: p.price,
          stock: 0,
          minStock: 1,
          image: p.image,
          type: 'sample',
          attributes: p.attributes,
          isTest: true
        });
      }
    }

    if (newSamples.length > 0) {
      await Product.insertMany(newSamples);
    }

    revalidatePath('/inventory');
    return { success: true, count: newSamples.length };
  } catch (error) {
    console.error("Error copyInventoryToSamples:", error);
    return { error: "Error al copiar inventario" };
  }
}

export async function updateProductStock(id, newStock, reason) {
  const session = await getSession();
  if (!session) return;
  await connectDB();
  const product = await Product.findOne({ _id: id, userId: session.userId });
  if (!product) return;

  const diff = newStock - product.stock;
  product.stock = newStock;
  await product.save();

  await InventoryMovement.create({
    userId: session.userId,
    productId: product._id,
    type: diff >= 0 ? 'entry' : 'exit',
    quantity: Math.abs(diff),
    reason: reason,
    date: new Date()
  });

  if (product.type === 'sample' && diff > 0 && product.cost > 0) {
    await Expense.create({
      userId: session.userId,
      category: 'Muestras',
      amount: diff * product.cost,
      note: `Entrada de Stock: ${product.name}`,
      date: new Date()
    });
  }

  revalidatePath('/inventory');
}

export async function updateProduct(id, data) {
  const session = await getSession();
  if (!session) return;
  await connectDB();

  const product = await Product.findOne({ _id: id, userId: session.userId });
  if (!product) return;

  product.name = data.name;
  product.code = data.code || '';
  product.category = data.category || 'General';
  product.cost = parseFloat(data.cost);
  product.price = parseFloat(data.price);
  product.stock = parseInt(data.stock);
  product.minStock = parseInt(data.minStock || 5);
  if (data.image) product.image = data.image;
  if (data.type) product.type = data.type;
  if (data.attributes) product.attributes = data.attributes;

  await product.save();

  revalidatePath('/inventory');
  revalidatePath(`/inventory/${id}`);
}

// --- SALES ---
export async function getSales() {
  const session = await getSession();
  if (!session) return [];
  await connectDB();
  const sales = await Sale.find({ userId: session.userId }).sort({ date: -1 }).limit(50).lean();
  return serialize(sales.map(s => ({ ...s, id: s._id.toString() })));
}

export async function getAllSales() {
  const session = await getSession();
  if (!session) return [];
  await connectDB();
  const sales = await Sale.find({ userId: session.userId }).sort({ date: -1 }).lean();
  return serialize(sales.map(s => ({ ...s, id: s._id.toString() })));
}

export async function createSale(cart, customerName = 'Consumidor Final', paymentMethod = 'Efectivo') {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  // cart: array of { id, qty, price, cost }
  let total = 0;
  let totalProfit = 0;
  const saleItems = [];

  const uid = new mongoose.Types.ObjectId(session.userId);

  for (const item of cart) {
    const qty = parseInt(item.qty);

    // Check stock explicitly before update
    const currentProduct = await Product.findOne({ _id: item.id, userId: session.userId });
    if (!currentProduct) throw new Error(`Producto no encontrado: ${item.name}`);
    if (currentProduct.stock < qty) {
      throw new Error(`Stock insuficiente para ${currentProduct.name}. Solo quedan ${currentProduct.stock} unidades.`);
    }

    const profit = (item.price - item.cost) * qty;

    total += item.price * qty;
    totalProfit += profit;

    saleItems.push({
      product: item.id, // Fixed: use 'product' to match schema and for easier lookup
      name: item.name || 'Unknown',
      quantity: qty,
      unitCost: item.cost,
      unitPrice: item.price,
      profit: profit
    });

    // Update Stock (scoped to user)
    await Product.findOneAndUpdate({ _id: item.id, userId: session.userId }, { $inc: { stock: -qty } });

    // Log Movement
    await InventoryMovement.create({
      userId: session.userId,
      product: item.id, // Fixed: use 'product' to match schema
      type: 'exit',
      quantity: qty,
      reason: `Venta`,
      date: new Date()
    });
  }

  const sale = await Sale.create({
    userId: session.userId,
    customerName,
    total,
    profit: totalProfit,
    items: saleItems,
    date: new Date(),
    paymentMethod
  });

  revalidatePath('/');
  revalidatePath('/inventory');
  revalidatePath('/reports');
  return serialize(sale);
}

export async function cancelSale(saleId) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  try {
    await connectDB();
    const userId = session.userId;

    const sale = await Sale.findOne({ _id: saleId, userId });
    if (!sale) return { error: "Venta no encontrada" };

    // 1. Revert Stock
    for (const item of sale.items) {
      // Use item.product because we fixed the key above
      const targetId = item.product || item.productId;
      if (targetId) {
        await Product.findOneAndUpdate(
          { _id: targetId, userId },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    // 2. Delete related inventory movements
    // We look for movements for the product within the sale timeframe
    const productIds = sale.items.map(i => i.product || i.productId).filter(Boolean);

    await InventoryMovement.deleteMany({
      userId,
      product: { $in: productIds },
      reason: 'Venta',
      date: {
        $gte: new Date(new Date(sale.date).getTime() - 2000), // Slightly wider window
        $lte: new Date(new Date(sale.date).getTime() + 2000)
      }
    });

    // 3. Delete the sale itself
    await Sale.deleteOne({ _id: saleId, userId });

    revalidatePath('/');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/reports');

    return { success: true };
  } catch (error) {
    console.error("Error canceling sale:", error);
    return { error: "Error al cancelar la venta" };
  }
}

// --- DASHBOARD ---
export async function getDashboardStats() {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const userId = new mongoose.Types.ObjectId(session.userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Sales Yesterday (for comparison)
  const yesterdayStart = new Date(today);
  yesterdayStart.setDate(today.getDate() - 1);
  const yesterdayEnd = new Date(today);

  const salesYesterday = await Sale.aggregate([
    { $match: { userId, date: { $gte: yesterdayStart, $lt: yesterdayEnd } } },
    { $group: { _id: null, revenue: { $sum: '$total' } } }
  ]);

  // Sales Today
  const salesToday = await Sale.aggregate([
    { $match: { userId, date: { $gte: today } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$profit' } } }
  ]);

  // Sales Month
  const salesMonth = await Sale.aggregate([
    { $match: { userId, date: { $gte: startOfMonth } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$profit' } } }
  ]);

  // Low Stock
  const lowStock = await Product.countDocuments({
    userId,
    $expr: { $lte: ["$stock", "$minStock"] },
    active: true
  });

  // Total Products & Items
  const totalProducts = await Product.countDocuments({ userId, active: true });
  const stockAggregation = await Product.aggregate([
    { $match: { userId, active: true } },
    { $group: { _id: null, total: { $sum: '$stock' } } }
  ]);
  const totalStock = stockAggregation[0]?.total || 0;

  return serialize({
    today: {
      revenue: salesToday[0]?.revenue || 0,
      profit: salesToday[0]?.profit || 0
    },
    yesterday: {
      revenue: salesYesterday[0]?.revenue || 0
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
  const session = await getSession();
  if (!session) return [];
  await connectDB();

  const sales = await Sale.find({ userId: session.userId })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  const activity = []
  for (const sale of sales) {
    for (const item of sale.items) {
      activity.push({
        id: sale._id.toString(),
        date: sale.date,
        total: sale.total,
        quantity: item.quantity,
        name: item.name || 'Unknown'
      });
    }
  }

  return serialize(activity.slice(0, 5));
}

// --- EXPENSES ---
export async function getExpenses() {
  const session = await getSession();
  if (!session) return [];
  await connectDB();
  const expenses = await Expense.find({ userId: session.userId }).sort({ date: -1 }).limit(30).lean();
  return serialize(expenses.map(e => ({ ...e, id: e._id.toString() })));
}

export async function createExpense(data) {
  const session = await getSession();
  if (!session) return;
  await connectDB();
  await Expense.create({
    userId: session.userId,
    category: data.category,
    amount: parseFloat(data.amount),
    note: data.note || '',
    date: new Date()
  });
  revalidatePath('/');
  revalidatePath('/expenses');
}


export async function performWeeklyBackupAction() {
  return await checkAndRunWeeklyBackup();
}

export async function downloadBackupAction() {
  const session = await getSession();
  if (!session) return null;
  const data = await getBackupData(session.userId);
  return JSON.parse(JSON.stringify(data));
}

export async function registerAction(formData) {
  const username = formData.get("username").trim();
  const password = formData.get("password");

  if (!username || !password) {
    return { error: "Todos los campos son obligatorios" };
  }

  try {
    await connectDB();
    const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (existingUser) {
      return { error: "El nombre de usuario ya está en uso" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });

    // Seed initial products for the new user
    await initDB(user._id);

    // Auto-login
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const session = await new SignJWT({ username: user.username, userId: user._id.toString() })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(key);

    (await cookies()).set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  } catch (error) {
    console.error("Registration Error:", error);
    return { error: "Error al crear la cuenta" };
  }

  redirect('/');
}

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

  const products = await Product.find(query).sort({ name: 1 });

  // Migration: Ensure all products have at least one batch
  let needsRevalidate = false;
  for (const p of products) {
    if (!p.batches || p.batches.length === 0) {
      console.log(`Migrating product ${p.name} to have a default batch...`);
      p.batches = [{
        label: 'Lote Inicial',
        cost: p.cost || 0,
        price: p.price || 0,
        stock: p.stock || 0
      }];
      await p.save();
      needsRevalidate = true;
    }
  }

  if (needsRevalidate) revalidatePath('/inventory');

  const plainProducts = products.map(p => {
    const obj = p.toObject();
    return { ...obj, id: obj._id.toString() };
  });

  return serialize(plainProducts);
}

export async function getProduct(id) {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  try {
    const product = await Product.findOne({ _id: id, userId: session.userId });
    if (!product) return null;

    // Migration for single product view
    if (!product.batches || product.batches.length === 0) {
      product.batches = [{
        label: 'Lote Inicial',
        cost: product.cost || 0,
        price: product.price || 0,
        stock: product.stock || 0
      }];
      await product.save();
    }

    const obj = product.toObject();
    return serialize({ ...obj, id: obj._id.toString() });
  } catch (e) {
    console.error("Error in getProduct:", e);
    return null;
  }
}

export async function createProduct(data) {
  const session = await getSession();
  if (!session) return null;
  await connectDB();

  // Format batches to ensure numbers
  const batches = (data.batches && data.batches.length > 0) ? data.batches.map(b => ({
    label: b.label || 'Lote Principal',
    cost: parseFloat(b.cost) || 0,
    price: parseFloat(b.price) || 0,
    stock: parseInt(b.stock) || 0
  })) : [{
    label: 'Compra Inicial',
    cost: parseFloat(data.cost) || 0,
    price: parseFloat(data.price) || 0,
    stock: parseInt(data.stock) || 0
  }];

  const aggregatedStock = batches.reduce((sum, b) => sum + (parseInt(b.stock) || 0), 0);

  const product = new Product({
    userId: session.userId,
    name: data.name,
    code: data.code || '',
    category: data.category || 'General',
    cost: parseFloat(data.cost) || 0,
    price: parseFloat(data.price) || 0,
    stock: aggregatedStock,
    minStock: parseInt(data.minStock || 5),
    image: data.image || '📦',
    type: data.type || 'product',
    attributes: data.attributes || [],
    batches: batches,
    isTest: data.isTest || false
  });

  await product.save();
  console.log(`Product ${data.name} created with ${batches.length} batches.`);

  // If user requested a test copy (only for new products)
  if (data.createTestCopy) {
    const testName = `[PRUEBA] ${data.name}`;

    // Create sample copy WITH the same batch structure but 0 stock
    await Product.create({
      userId: session.userId,
      name: testName,
      code: data.code ? `${data.code}-TEST` : '',
      category: data.category || 'General',
      cost: parseFloat(data.cost) || 0,
      price: parseFloat(data.price) || 0,
      stock: 0,
      minStock: 1,
      image: data.image || '📦',
      type: 'sample',
      attributes: data.attributes || [],
      batches: batches.map(b => ({ ...b, stock: 0 })),
      isTest: true
    });
  }

  // Initial Inventory Movement
  await InventoryMovement.create({
    userId: session.userId,
    productId: product._id,
    type: 'entry',
    quantity: aggregatedStock,
    reason: 'Inventario Inicial',
    date: new Date()
  });

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

export async function updateProductStock(id, newStock, reason, batchId = null) {
  const session = await getSession();
  if (!session) return;
  await connectDB();
  const product = await Product.findOne({ _id: id, userId: session.userId });
  if (!product) return;

  const diff = newStock - product.stock;
  product.stock = newStock;

  // Handle batch update
  if (product.batches && product.batches.length > 0) {
    if (batchId) {
      // Find specific batch
      const batch = product.batches.id(batchId);
      if (batch) {
        batch.stock += diff;
      } else {
        // If batchId not found for some reason, fallback to first
        product.batches[0].stock += diff;
      }
    } else {
      // Fallback to first batch if no ID provided
      product.batches[0].stock += diff;
    }

    // Always sync main cost/price with first batch for legacy
    product.cost = product.batches[0].cost;
    product.price = product.batches[0].price;
  } else {
    // Legacy support: Create a batch if none exists
    product.batches = [{
      label: 'Ajuste Stock',
      cost: product.cost || 0,
      price: product.price || 0,
      stock: newStock
    }];
  }

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
  if (data.batches && data.batches.length > 0) {
    product.batches = data.batches.map(b => ({
      label: b.label || 'Lote',
      cost: parseFloat(b.cost) || 0,
      price: parseFloat(b.price) || 0,
      stock: parseInt(b.stock) || 0
    }));
    product.cost = parseFloat(product.batches[0].cost);
    product.price = parseFloat(product.batches[0].price);
  } else {
    product.cost = parseFloat(data.cost) || 0;
    product.price = parseFloat(data.price) || 0;
  }

  // Re-calculate aggregated stock
  const aggregatedStock = (product.batches || []).reduce((sum, b) => sum + (parseInt(b.stock) || 0), 0);
  product.stock = aggregatedStock;

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

    // Find the specific batch if provided
    let targetBatch = null;
    if (item.batchId) {
      targetBatch = currentProduct.batches.find(b => b._id.toString() === item.batchId);
    }

    // If not found or no batchId, fallback to a sensible one
    if (!targetBatch) {
      targetBatch = currentProduct.batches.find(b => b.stock >= qty) || currentProduct.batches[0];
    }

    if (!targetBatch || targetBatch.stock < qty) {
      throw new Error(`Stock insuficiente para ${currentProduct.name} (Lote: ${targetBatch?.label || 'General'}). Solo quedan ${targetBatch?.stock || 0} unidades.`);
    }

    const itemCost = targetBatch.cost; // Use cost from the batch
    const profit = (item.price - itemCost) * qty;

    total += item.price * qty;
    totalProfit += profit;

    saleItems.push({
      product: item.id,
      batchId: targetBatch?._id,
      // Priority: 1. Batch label from DB, 2. Batch label passed from frontend, 3. 'General'
      batchLabel: targetBatch?.label || item.batchLabel || 'General',
      name: item.name || 'Unknown',
      quantity: qty,
      unitCost: itemCost,
      unitPrice: item.price,
      profit: profit
    });

    // Update Stock in the specific batch and aggregated
    await Product.updateOne(
      { _id: item.id, userId: session.userId, "batches._id": targetBatch._id },
      {
        $inc: {
          "batches.$.stock": -qty,
          stock: -qty
        }
      }
    );

    // Log Movement
    await InventoryMovement.create({
      userId: session.userId,
      product: item.id,
      type: 'exit',
      quantity: qty,
      reason: `Venta - Lote: ${targetBatch.label}`,
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

    // 1. Revert Stock (to specific batches)
    for (const item of sale.items) {
      const targetId = item.product || item.productId;
      if (!targetId) continue;

      if (item.batchId) {
        // Increment both batch stock and aggregated stock
        await Product.updateOne(
          { _id: targetId, userId, "batches._id": item.batchId },
          {
            $inc: {
              "batches.$.stock": item.quantity,
              stock: item.quantity
            }
          }
        );
      } else {
        // Fallback for legacy items without batchId
        await Product.updateOne(
          { _id: targetId, userId },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    // 2. Delete related inventory movements
    const productIds = sale.items.map(i => i.product || i.productId).filter(Boolean);

    await InventoryMovement.deleteMany({
      userId,
      product: { $in: productIds },
      type: 'exit',
      date: {
        $gte: new Date(new Date(sale.date).getTime() - 5000),
        $lte: new Date(new Date(sale.date).getTime() + 5000)
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

  const activity = sales.map(sale => {
    // Create a compact summary of items: "1x Labial, 3x Gold..."
    const itemsSummary = sale.items
      .map(item => `${item.quantity}x ${item.name}${item.batchLabel ? ` (${item.batchLabel})` : ''}`)
      .join(', ');

    return {
      id: sale._id.toString(),
      date: sale.date,
      total: sale.total,
      customerName: sale.customerName || 'Consumidor Final',
      itemsSummary: itemsSummary,
      itemCount: sale.items.length
    };
  });

  return serialize(activity);
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

export async function restoreBackupAction(backupData) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  try {
    await connectDB();
    const userId = session.userId;

    if (!backupData || !backupData.data) {
      return { error: "Archivo de respaldo inválido o vacío" };
    }

    const { products, sales, expenses, movements } = backupData.data;

    // Wipe current data for this user
    await Promise.all([
      Product.deleteMany({ userId }),
      Sale.deleteMany({ userId }),
      Expense.deleteMany({ userId }),
      InventoryMovement.deleteMany({ userId })
    ]);

    // Insert from backup
    // We clean the items to ensure userId is correctly set and remove __v to avoid issues
    const sanitize = (list) => list.map(({ __v, ...rest }) => ({ ...rest, userId }));

    if (products?.length) await Product.insertMany(sanitize(products));
    if (sales?.length) await Sale.insertMany(sanitize(sales));
    if (expenses?.length) await Expense.insertMany(sanitize(expenses));
    if (movements?.length) await InventoryMovement.insertMany(sanitize(movements));

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/reports');
    revalidatePath('/expenses');

    return { success: true };
  } catch (error) {
    console.error("Restore Error:", error);
    return { error: "Error al restaurar: " + error.message };
  }
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

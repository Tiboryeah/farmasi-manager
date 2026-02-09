
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: 'General' },
    cost: { type: Number, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 },
    image: { type: String, default: '📦' },
    active: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure virtuals are included in JSON/Object conversion
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const saleItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String }, // Snapshot of product name
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true }, // Snapshot of cost
    unitPrice: { type: Number, required: true }, // Snapshot of price
    profit: { type: Number, required: true }
});

const saleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now },
    total: { type: Number, required: true },
    profit: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Efectivo' },
    note: { type: String },
    items: [saleItemSchema]
}, { timestamps: true });

saleSchema.set('toJSON', { virtuals: true });
saleSchema.set('toObject', { virtuals: true });

const inventoryMovementSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: { type: String, required: true }, // 'Venta', 'Compra', 'Ajuste', 'Inicial'
    quantity: { type: Number, required: true },
    reason: { type: String },
    date: { type: Date, default: Date.now },
    user: { type: String, default: 'Admin' }
}, { timestamps: true });

inventoryMovementSchema.set('toJSON', { virtuals: true });
inventoryMovementSchema.set('toObject', { virtuals: true });

const expenseSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Efectivo' },
    note: { type: String }
}, { timestamps: true });

expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Hashed
}, { timestamps: true });

const systemConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Helper to get models safely (prevents overwrite error in dev)
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
export const InventoryMovement = mongoose.models.InventoryMovement || mongoose.model('InventoryMovement', inventoryMovementSchema);
export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', systemConfigSchema);

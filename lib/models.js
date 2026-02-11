
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, default: '' }, // SKU / Referencia
    category: { type: String, default: 'General' },
    cost: { type: Number, required: true }, // Legacy/Default cost
    price: { type: Number, required: true }, // Legacy/Default price
    stock: { type: Number, default: 0 }, // Total aggregated stock
    minStock: { type: Number, default: 5 },
    image: { type: String, default: '📦' },
    type: { type: String, default: 'product', enum: ['product', 'sample'] }, // 'product' | 'sample'
    attributes: [{ name: String, value: String }],
    batches: [{
        label: { type: String, default: 'Principal' },
        cost: { type: Number, required: true },
        price: { type: Number, required: true },
        stock: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
    }],
    isTest: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure virtuals are included in JSON/Object conversion
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const saleItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    batchId: { type: mongoose.Schema.Types.ObjectId }, // Reference to the batch in Product.batches
    batchLabel: { type: String },
    name: { type: String }, // Snapshot of product name
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true }, // Snapshot of cost
    unitPrice: { type: Number, required: true }, // Snapshot of price
    profit: { type: Number, required: true }
});

const saleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now },
    customerName: { type: String, default: 'Consumidor Final' },
    total: { type: Number, required: true },
    profit: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Efectivo' },
    note: { type: String },
    items: [saleItemSchema]
}, { timestamps: true });

saleSchema.set('toJSON', { virtuals: true });
saleSchema.set('toObject', { virtuals: true });

const inventoryMovementSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
// We delete models if they exist to ensure the latest schema (with new fields like batchLabel) is applied
if (mongoose.models.Product) delete mongoose.models.Product;
if (mongoose.models.Sale) delete mongoose.models.Sale;
if (mongoose.models.InventoryMovement) delete mongoose.models.InventoryMovement;
if (mongoose.models.Expense) delete mongoose.models.Expense;

if (mongoose.connection && mongoose.connection.models) {
    if (mongoose.connection.models.Product) delete mongoose.connection.models.Product;
    if (mongoose.connection.models.Sale) delete mongoose.connection.models.Sale;
}

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
export const InventoryMovement = mongoose.models.InventoryMovement || mongoose.model('InventoryMovement', inventoryMovementSchema);
export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', systemConfigSchema);

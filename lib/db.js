import mongoose from 'mongoose';
import { Product } from './models';

const MONGODB_URI = process.env.MONGODB_URI;


// if (!MONGODB_URI) {
//   throw new Error(
//     'Please define the MONGODB_URI environment variable inside .env.local'
//   );
// }


let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function initDB() {
  await connectDB();

  // Seed data if empty
  const count = await Product.countDocuments();
  if (count === 0) {
    console.log("Seeding initial products...");
    const products = [
      { name: "Labial VFX Elite Matte 04", category: "Labiales", cost: 120, price: 250, stock: 8, minStock: 5, image: "💄" },
      { name: "Dr. C. Tuna Balsamo", category: "Piel", cost: 150, price: 380, stock: 3, minStock: 4, image: "🧴" },
      { name: "Rimel Zen", category: "Ojos", cost: 85, price: 190, stock: 15, minStock: 5, image: "👁️" }
    ];

    await Product.insertMany(products);
    console.log("Seeding complete.");
  }
}


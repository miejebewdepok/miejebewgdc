import { db } from "@/db/client";
import { products, storeProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const DEFAULT_PRODUCTS = [
  {
    name: 'Mie Iblis Level 3 (Manis Pedas)',
    price: 14500,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600',
    stock: 25,
  },
  {
    name: 'Mie Setan Level 5 (Asin Pedas Gurih)',
    price: 16000,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=80&w=600',
    stock: 18,
  },
  {
    name: 'Mie Angel (Gurih Tanpa Cabai)',
    price: 12000,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&q=80&w=600',
    stock: 4,
  },
  {
    name: 'Mie Gila Level 10 (Sangat Pedas)',
    price: 18000,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600',
    stock: 12,
  },
  {
    name: 'Dimsum Udang Rambutan (Isi 3)',
    price: 13000,
    category: 'Dimsum',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=120&w=600',
    stock: 40,
  },
  {
    name: 'Dimsum Udang Keju (Isi 3)',
    price: 13000,
    category: 'Dimsum',
    image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=120&w=600',
    stock: 2,
  },
  {
    name: 'Pangsit Goreng Gacoan (Isi 3)',
    price: 11500,
    category: 'Dimsum',
    image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&q=120&w=600',
    stock: 30,
  },
  {
    name: 'Es Genderuwo Jelly Segar',
    price: 10000,
    category: 'Minuman Dingin',
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=600',
    stock: 55,
  },
  {
    name: 'Es Pocong Buah Tropis',
    price: 9000,
    category: 'Minuman Dingin',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    stock: 0,
  },
  {
    name: 'Es Sundel Bolong Susu Selasih',
    price: 9500,
    category: 'Minuman Dingin',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600',
    stock: 15,
  },
  {
    name: 'Ceker Setan Kuah Merah (Isi 4)',
    price: 12500,
    category: 'Snack',
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&q=80&w=600',
    stock: 8,
  },
  {
    name: 'Lumpia Goreng Pedas Krispi',
    price: 11000,
    category: 'Snack',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
    stock: 0,
  }
];

function createId() {
  return `prod_${crypto.randomUUID().slice(0, 8)}`;
}

async function main() {
  const users = await db.select().from(storeProfiles).limit(1);
  if (users.length === 0) {
    console.log("No users found");
    process.exit(1);
  }

  const userId = users[0].userId;

  // Clear existing products just in case
  await db.delete(products).where(eq(products.userId, userId));

  // Add missing column to database if it doesn't exist
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;`);
  } catch(e) {
    console.log("Column may already exist or error:", (e as any).message);
  }

  const toInsert = DEFAULT_PRODUCTS.map(p => ({
    id: createId(),
    userId,
    name: p.name,
    category: p.category,
    buyPrice: Math.round(p.price * 0.7),
    sellPrice: p.price,
    stock: p.stock,
    minimumStock: 5,
    description: "Menu asli Mie Jebew GDC",
    imageUrl: p.image,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  await db.insert(products).values(toInsert);
  console.log("Seeded", toInsert.length, "products for user", userId);
  process.exit(0);
}

main().catch(console.error);

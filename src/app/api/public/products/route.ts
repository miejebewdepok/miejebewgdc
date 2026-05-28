import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { products, storeProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // Get products
    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(desc(products.createdAt));

    // Get store name & details
    const [profile] = await db
      .select()
      .from(storeProfiles)
      .where(eq(storeProfiles.userId, userId))
      .limit(1);

    let productOrder: string[] = [];
    try {
      if (profile && profile.businessNotes && profile.businessNotes.startsWith("{")) {
        const extra = JSON.parse(profile.businessNotes);
        productOrder = extra.productOrder ?? [];
      }
    } catch (e) {
      console.error("Failed to parse productOrder from businessNotes", e);
    }

    return NextResponse.json({
      storeName: profile?.storeName || "Mie Jebew GDC",
      productOrder,
      products: productRows.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        sellPrice: p.sellPrice,
        stock: p.stock,
        description: p.description,
        imageUrl: p.imageUrl,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat katalog menu.");
  }
}

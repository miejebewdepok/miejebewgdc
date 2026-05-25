import { NextRequest, NextResponse } from "next/server";
import { createSavedBill } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { db } from "@/db/client";
import { customerPromoClaims } from "@/db/schema";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId, tableName, customerName, items, claimPromo, whatsappNumber } = (await request.json()) as {
      userId: string;
      tableName: string;
      customerName: string;
      items: any[];
      claimPromo?: boolean;
      whatsappNumber?: string;
    };

    if (!userId || !tableName || !customerName || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    let finalItems = [...items];

    // If customer claimed promo, save to DB and inject free Jasmine Tea item
    if (claimPromo && whatsappNumber?.trim()) {
      const waClean = whatsappNumber.trim();
      const claimId = `claim_${crypto.randomUUID().slice(0, 8)}`;

      // Save claim to database for marketing database
      await db.insert(customerPromoClaims).values({
        id: claimId,
        userId: userId,
        customerName: customerName.trim(),
        whatsapp: waClean,
        promoType: "Free Jasmine Tea",
        tableName: tableName,
        createdAt: new Date().toISOString(),
      });

      // Inject free Jasmine Tea item (Rp 0)
      finalItems.push({
        id: `promo-jasmine-tea-${crypto.randomUUID().slice(0, 8)}`,
        productId: "promo_jasmine_tea",
        quantity: 1,
        spicyLevel: 0,
        toppings: [],
        sellPrice: 0, // Rp 0 (FREE!)
        product: {
          id: "promo_jasmine_tea",
          name: "Qalla Tea (Jasmine Tea) [PROMO]",
          category: "Qalla Tea",
          sellPrice: 0,
          stock: 999,
          description: "Minuman Jasmine Tea dingin gratis dari promo Self-Order.",
        }
      });
    }

    const name = `Meja ${tableName} - ${customerName}`;
    const bill = await createSavedBill(userId, name, finalItems);

    return NextResponse.json({
      success: true,
      savedBill: {
        id: bill.id,
        name: bill.name,
        createdAt: bill.createdAt,
        date: bill.createdAt,
        items: bill.items,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Gagal mengirimkan pesanan meja.");
  }
}

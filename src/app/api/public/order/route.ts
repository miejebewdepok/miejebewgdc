import { NextRequest, NextResponse } from "next/server";
import { createSavedBill } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { db } from "@/db/client";
import { customerPromoClaims } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { validateWhatsappNumber } from "@/lib/server/whatsapp";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId, tableName, customerName, items, claimPromo, whatsappNumber, emailAddress } = (await request.json()) as {
      userId: string;
      tableName: string;
      customerName: string;
      items: any[];
      claimPromo?: boolean;
      whatsappNumber?: string;
      emailAddress?: string;
    };

    if (!userId || !tableName || !customerName || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    let finalItems = [...items];

    // If customer claimed promo, save to DB and inject free Jasmine Tea item
    if (claimPromo && whatsappNumber?.trim()) {
      const waClean = whatsappNumber.trim();
      const emailClean = emailAddress?.trim() || "";

      // 0a. Validate WhatsApp format and check active lookup
      const waValidation = await validateWhatsappNumber(waClean);
      if (!waValidation.valid) {
        return NextResponse.json({ 
          error: waValidation.message || "Nomor WhatsApp tidak valid atau tidak aktif." 
        }, { status: 400 });
      }

      // 0b. Validate Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailClean || !emailRegex.test(emailClean)) {
        return NextResponse.json({
          error: "Alamat email tidak valid. Harap gunakan email/gmail aktif yang benar."
        }, { status: 400 });
      }

      // Normalize WA number formats to make bypasses impossible
      const digitsOnly = waClean.replace(/\D/g, "");
      const normalizedWa = digitsOnly.startsWith("0") ? "62" + digitsOnly.slice(1) : digitsOnly;
      const zeroWa = normalizedWa.startsWith("62") ? "0" + normalizedWa.slice(2) : normalizedWa;
      const plusWa = "+" + normalizedWa;

      // We search for any of these variations in the database to prevent duplicate claims
      const searchFormats = [waClean, digitsOnly, normalizedWa, zeroWa, plusWa].filter(Boolean);

      // 1. Check if WhatsApp has already claimed
      const existingWa = await db
        .select()
        .from(customerPromoClaims)
        .where(
          and(
            eq(customerPromoClaims.userId, userId),
            inArray(customerPromoClaims.whatsapp, searchFormats)
          )
        )
        .limit(1);

      if (existingWa.length > 0) {
        return NextResponse.json({ 
          error: "Nomor WhatsApp ini sudah pernah mengklaim promo Jasmine Tea gratis." 
        }, { status: 400 });
      }

      // 2. Check if Email has already claimed
      if (emailClean) {
        const existingEmail = await db
          .select()
          .from(customerPromoClaims)
          .where(
            and(
              eq(customerPromoClaims.userId, userId),
              eq(customerPromoClaims.email, emailClean)
            )
          )
          .limit(1);

        if (existingEmail.length > 0) {
          return NextResponse.json({ 
            error: "Alamat email ini sudah pernah digunakan untuk mengklaim promo Jasmine Tea gratis." 
          }, { status: 400 });
        }
      }

      const claimId = `claim_${crypto.randomUUID().slice(0, 8)}`;

      // Save claim to database for marketing database (using normalized WA format for future checks)
      await db.insert(customerPromoClaims).values({
        id: claimId,
        userId: userId,
        customerName: customerName.trim(),
        whatsapp: normalizedWa, // Store standardized number
        email: emailClean || null,
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

    const cleanTable = tableName.replace(/^(meja|order|self-order)[\s\-_]*/i, "");
    const name = `${cleanTable} - ${customerName}`;
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
    return handleRouteError(error, "Gagal mengirimkan pesanan.");
  }
}

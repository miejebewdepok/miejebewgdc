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

    // Calculate subtotal to verify minimum purchase requirement of Rp 15.000 for promo
    const orderSubtotal = items.reduce((sum, item) => sum + (item.sellPrice || 0) * (item.quantity || 0), 0);

    const isVipBypass = orderSubtotal >= 50000;

    // If customer claimed promo (or is VIP >= 50000), check if they qualify
    if (isVipBypass || (claimPromo && orderSubtotal >= 15000 && whatsappNumber?.trim() && emailAddress?.trim())) {
      const waClean = whatsappNumber?.trim() || "";
      const emailClean = emailAddress?.trim() || "";

      const digitsOnly = waClean.replace(/\D/g, "");
      const normalizedWa = digitsOnly ? (digitsOnly.startsWith("0") ? "62" + digitsOnly.slice(1) : digitsOnly) : "";

      let promoAllowed = false;

      if (isVipBypass) {
        // VIP gets free tea guaranteed, but we still try to record the claim in the DB for marketing list if phone is provided
        promoAllowed = true;

        if (waClean) {
          try {
            const claimId = `claim_${crypto.randomUUID().slice(0, 8)}`;
            await db.insert(customerPromoClaims).values({
              id: claimId,
              userId: userId,
              customerName: customerName.trim(),
              whatsapp: normalizedWa,
              email: emailClean || null,
              promoType: "Free Jasmine Tea",
              tableName: tableName,
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.error("VIP claim insert error:", e);
          }
        }
      } else {
        // Normal checks
        const waValidation = await validateWhatsappNumber(waClean);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailClean && emailRegex.test(emailClean);

        if (waValidation.valid && isEmailValid) {
          const zeroWa = normalizedWa.startsWith("62") ? "0" + normalizedWa.slice(2) : normalizedWa;
          const plusWa = "+" + normalizedWa;
          const searchFormats = [waClean, digitsOnly, normalizedWa, zeroWa, plusWa].filter(Boolean);

          const existingWa = await db
            .select()
            .from(customerPromoClaims)
            .where(and(eq(customerPromoClaims.userId, userId), inArray(customerPromoClaims.whatsapp, searchFormats)))
            .limit(1);

          const existingEmail = await db
            .select()
            .from(customerPromoClaims)
            .where(and(eq(customerPromoClaims.userId, userId), eq(customerPromoClaims.email, emailClean)))
            .limit(1);

          if (existingWa.length === 0 && existingEmail.length === 0) {
            promoAllowed = true;
            const claimId = `claim_${crypto.randomUUID().slice(0, 8)}`;
            await db.insert(customerPromoClaims).values({
              id: claimId,
              userId: userId,
              customerName: customerName.trim(),
              whatsapp: normalizedWa,
              email: emailClean,
              promoType: "Free Jasmine Tea",
              tableName: tableName,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      if (promoAllowed) {
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
            description: isVipBypass
              ? "Minuman Jasmine Tea dingin gratis dari promo VIP Self-Order."
              : "Minuman Jasmine Tea dingin gratis dari promo Self-Order.",
          }
        });
      }
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

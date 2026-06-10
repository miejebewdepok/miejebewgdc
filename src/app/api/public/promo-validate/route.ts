import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { customerPromoClaims, storeProfiles } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const whatsapp = searchParams.get("whatsapp");
    const email = searchParams.get("email");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Check if store profile exists
    const [profile] = await db
      .select()
      .from(storeProfiles)
      .where(eq(storeProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Warung tidak ditemukan atau belum aktif." }, { status: 404 });
    }

    let whatsappUsed = false;
    let emailUsed = false;

    if (whatsapp && whatsapp.trim()) {
      const waClean = whatsapp.trim();
      const digitsOnly = waClean.replace(/\D/g, "");
      const normalizedWa = digitsOnly.startsWith("0") ? "62" + digitsOnly.slice(1) : digitsOnly;
      const zeroWa = normalizedWa.startsWith("62") ? "0" + normalizedWa.slice(2) : normalizedWa;
      const plusWa = "+" + normalizedWa;
      const searchFormats = [waClean, digitsOnly, normalizedWa, zeroWa, plusWa].filter(Boolean);

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
        whatsappUsed = true;
      }
    }

    if (email && email.trim()) {
      const emailClean = email.trim();
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
        emailUsed = true;
      }
    }

    return NextResponse.json({
      success: true,
      whatsappUsed,
      emailUsed,
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memvalidasi promo.");
  }
}

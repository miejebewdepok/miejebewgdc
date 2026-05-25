import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { db } from "@/db/client";
import { customerPromoClaims } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getRequestUser();
    
    // Fetch claims sorted by newest first
    const claims = await db
      .select()
      .from(customerPromoClaims)
      .where(eq(customerPromoClaims.userId, userId))
      .orderBy(desc(customerPromoClaims.createdAt));

    return NextResponse.json({
      success: true,
      claims,
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat database pelanggan promo.");
  }
}

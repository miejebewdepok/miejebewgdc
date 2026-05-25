import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { db } from "@/db/client";
import { customerPromoClaims } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

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

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getRequestUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      await db
        .delete(customerPromoClaims)
        .where(eq(customerPromoClaims.userId, userId));

      return NextResponse.json({
        success: true,
        message: "Semua database klaim promo berhasil dihapus.",
      });
    } else if (id) {
      await db
        .delete(customerPromoClaims)
        .where(
          and(
            eq(customerPromoClaims.id, id),
            eq(customerPromoClaims.userId, userId)
          )
        );

      return NextResponse.json({
        success: true,
        message: "Data klaim promo berhasil dihapus.",
      });
    } else {
      return NextResponse.json({ error: "Missing id or all parameter" }, { status: 400 });
    }
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus data klaim promo.");
  }
}

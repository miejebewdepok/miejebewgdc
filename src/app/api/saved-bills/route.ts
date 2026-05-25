import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, createSavedBill } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { db } from "@/db/client";
import { savedBills } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await getRequestUser();
    const rows = await db
      .select()
      .from(savedBills)
      .where(eq(savedBills.userId, userId))
      .orderBy(desc(savedBills.createdAt));
    return NextResponse.json({
      savedBills: rows.map(r => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        date: r.createdAt,
        items: r.items
      }))
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat tagihan tertunda.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getRequestUser();
    const { name, items, id } = (await request.json()) as { name: string; items: any[]; id?: string };
    const bill = await createSavedBill(userId, name, items, id);
    return NextResponse.json({
      savedBill: {
        id: bill.id,
        name: bill.name,
        createdAt: bill.createdAt,
        date: bill.createdAt,
        items: bill.items
      }
    });
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan tagihan.");
  }
}

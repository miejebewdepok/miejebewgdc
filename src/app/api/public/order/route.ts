import { NextRequest, NextResponse } from "next/server";
import { createSavedBill } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId, tableName, customerName, items } = (await request.json()) as {
      userId: string;
      tableName: string;
      customerName: string;
      items: any[];
    };

    if (!userId || !tableName || !customerName || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const name = `Meja ${tableName} - ${customerName}`;
    const bill = await createSavedBill(userId, name, items);

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

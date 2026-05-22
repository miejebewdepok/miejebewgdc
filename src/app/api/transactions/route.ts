import { NextRequest, NextResponse } from "next/server";
import { createTransaction, getRequestUser } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { PaymentMethod } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getRequestUser();
    const body = (await request.json()) as {
      paymentMethod: PaymentMethod;
      customerName?: string;
      amountPaid?: number;
      change?: number;
      items: Array<{
        productId: string;
        quantity: number;
        spicyLevel?: number;
        toppings?: string[];
        filling?: string;
        size?: string;
      }>;
    };
    const result = await createTransaction(userId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan transaksi.");
  }
}

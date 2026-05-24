import { NextRequest, NextResponse } from "next/server";
import { createExpense, getRequestUser } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getRequestUser();
    const draft = (await request.json()) as { title: string; amount: number; category: string };
    const expense = await createExpense(userId, draft);
    return NextResponse.json({ expense });
  } catch (error) {
    return handleRouteError(error, "Gagal menambah pengeluaran.");
  }
}

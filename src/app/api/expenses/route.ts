import { NextRequest, NextResponse } from "next/server";
import { createExpense, getRequestUser, isOwner } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUser();
    if (!isOwner(requestUser)) {
      return NextResponse.json({ error: "Hanya Owner/Admin yang dapat menambah pengeluaran." }, { status: 403 });
    }

    const draft = (await request.json()) as { title: string; amount: number; category: string };
    const expense = await createExpense(requestUser.userId, draft);
    return NextResponse.json({ expense });
  } catch (error) {
    return handleRouteError(error, "Gagal menambah pengeluaran.");
  }
}

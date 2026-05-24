import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, deleteExpense } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getRequestUser();
    const { id } = await context.params;
    await deleteExpense(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus pengeluaran.");
  }
}

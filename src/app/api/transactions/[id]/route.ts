import { NextRequest, NextResponse } from "next/server";
import { deleteTransaction, updateTransaction, getRequestUser } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getRequestUser();
    const { id } = await params;
    const result = await deleteTransaction(userId, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus transaksi.");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getRequestUser();
    const { id } = await params;
    const body = await request.json();
    const result = await updateTransaction(userId, id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memperbarui transaksi.");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, updateProduct, deleteProduct } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { ProductDraft } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getRequestUser();
    const { id } = await context.params;
    const draft = (await request.json()) as ProductDraft;
    const product = await updateProduct(userId, id, draft);
    return NextResponse.json({ product });
  } catch (error) {
    return handleRouteError(error, "Gagal memperbarui produk.");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getRequestUser();
    const { id } = await context.params;
    await deleteProduct(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus produk.");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { deleteChat, getChat } from "@/lib/server/ai/persist";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getRequestUser();
    const { id } = await context.params;
    
    const chat = await getChat(userId, id);
    if (!chat) {
      return NextResponse.json({ error: "Chat tidak ditemukan." }, { status: 404 });
    }
    
    await deleteChat(userId, id);
    return NextResponse.json({ success: true, message: "Chat berhasil dihapus." });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus chat.");
  }
}

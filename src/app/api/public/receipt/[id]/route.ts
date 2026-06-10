import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { transactions, transactionItems, storeProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/server/route-error";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerUserId = searchParams.get("userId");

    const { id: transactionId } = await params;

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ error: "Nota tidak ditemukan." }, { status: 404 });
    }

    if (viewerUserId && viewerUserId !== transaction.userId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke nota ini." }, { status: 403 });
    }

    const items = await db
      .select()
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId));

    const [store] = await db
      .select()
      .from(storeProfiles)
      .where(eq(storeProfiles.userId, transaction.userId))
      .limit(1);

    let businessNotes: Record<string, any> = {};
    if (store?.businessNotes && String(store.businessNotes).startsWith("{")) {
      try {
        businessNotes = JSON.parse(store.businessNotes);
      } catch {
        businessNotes = {};
      }
    }

    return NextResponse.json({
      transaction,
      items,
      merchant: {
        storeName: store?.storeName ?? "MIE JEBEW GDC",
        storeAddress: store?.storeAddress ?? "",
        ownerWhatsapp: store?.ownerWhatsapp ?? "",
        merchantPhone: store?.ownerWhatsapp ?? "",
        city: store?.city ?? "",
        receiptHeader: businessNotes?.receiptHeader ?? "TERIMA KASIH",
        receiptFooter: businessNotes?.receiptFooter ?? "ATAS KUNJUNGAN ANDA",
        enableServiceCharge: businessNotes?.enableServiceCharge ?? false,
        serviceChargeRate: businessNotes?.serviceChargeRate ?? 0,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat nota.");
  }
}

import { redirect } from "next/navigation";
import { db, pool } from "@/db/client";
import { storeProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default async function ShortOrderRedirectPage(props: PageProps) {
  const resolvedParams = await props.params;
  const tableId = resolvedParams.tableId;

  let resolvedUserId = "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn"; // Default fallback (Mie Jebew GDC milik Taufiq)
  let cleanTableId = tableId;

  if (tableId.startsWith("c2-")) {
    resolvedUserId = "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5"; // Cabang 2 (Depok)
    cleanTableId = tableId.substring(3);
  } else {
    try {
      // 1. Cari user ID milik email Taufiq secara khusus di tabel user database untuk mencegah hijack oleh akun lain
      const userResult = await pool.query<{ id: string }>(
        `select id from "user" where email = $1 limit 1`,
        ["taufiqrusdhi.ez@gmail.com"]
      );

      if (userResult.rowCount && userResult.rows[0]) {
        resolvedUserId = userResult.rows[0].id;
      } else {
        // 2. Jika tidak ditemukan (misal saat seeding awal belum selesai), gunakan pencarian store profile fallback
        const gdcProfile = await db
          .select({ userId: storeProfiles.userId })
          .from(storeProfiles)
          .where(eq(storeProfiles.userId, "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn"))
          .limit(1);

        if (gdcProfile.length > 0 && gdcProfile[0].userId) {
          resolvedUserId = gdcProfile[0].userId;
        }
      }
    } catch (err) {
      console.error("Failed to resolve dynamic store userId, falling back to default", err);
    }
  }

  // Alihkan pelanggan ke halaman self-order spesifik milik toko Anda
  redirect(`/order/${resolvedUserId}/${cleanTableId}`);
}

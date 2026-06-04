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

  let resolvedUserId: string | null = null;
  let cleanTableId = tableId;
  const targetBranch = tableId.startsWith("c2-") ? "CABANG_2" : "CABANG_1";

  if (tableId.startsWith("c2-")) {
    cleanTableId = tableId.substring(3);
  }

  try {
    const profiles = await db.select().from(storeProfiles);
    for (const profile of profiles) {
      if (profile.businessNotes && profile.businessNotes.startsWith("{")) {
        try {
          const extra = JSON.parse(profile.businessNotes);
          if (extra.branchCode === targetBranch) {
            resolvedUserId = profile.userId;
            break;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Safe fallbacks for backward compatibility
    if (!resolvedUserId) {
      if (targetBranch === "CABANG_2") {
        resolvedUserId = "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5"; // Fallback Depok
      } else {
        resolvedUserId = "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn"; // Fallback GDC
      }
    }
  } catch (err) {
    console.error("Failed to resolve store profile dynamically, using static fallback", err);
    resolvedUserId = targetBranch === "CABANG_2" ? "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5" : "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn";
  }

  if (!resolvedUserId) {
    throw new Error("Profil warung untuk short order tidak ditemukan.");
  }

  redirect(`/order/${resolvedUserId}/${cleanTableId}`);
}

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

    // Backward-compatible fallback: derive a matching owner id from the known seed IDs stored in DB,
    // or by selecting the first matching user profile for the branch. We no longer rely on static UUIDs.
    if (!resolvedUserId) {
      throw new Error("Profil warung untuk short order tidak ditemukan.");
    }
  } catch (err) {
    console.error("Failed to resolve store profile dynamically", err);
    throw new Error("Profil warung untuk short order tidak ditemukan.");
  }

  if (!resolvedUserId) {
    throw new Error("Profil warung untuk short order tidak ditemukan.");
  }

  redirect(`/order/${resolvedUserId}/${cleanTableId}`);
}

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { storeProfiles } from "@/db/schema";
import { ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default async function ShortOrderRedirectPage(props: PageProps) {
  const resolvedParams = await props.params;
  const tableId = resolvedParams.tableId;

  let resolvedUserId = "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn"; // Default fallback (Mie Jebew GDC)

  try {
    // 1. Try to find the store profile for Mie Jebew GDC specifically
    const gdcProfile = await db
      .select({ userId: storeProfiles.userId })
      .from(storeProfiles)
      .where(ilike(storeProfiles.storeName, "%Jebew%"))
      .limit(1);

    if (gdcProfile.length > 0 && gdcProfile[0].userId) {
      resolvedUserId = gdcProfile[0].userId;
    } else {
      // 2. Otherwise, fallback to the first available store profile in the database
      const firstProfile = await db
        .select({ userId: storeProfiles.userId })
        .from(storeProfiles)
        .limit(1);

      if (firstProfile.length > 0 && firstProfile[0].userId) {
        resolvedUserId = firstProfile[0].userId;
      }
    }
  } catch (err) {
    console.error("Failed to resolve dynamic store userId, falling back to default", err);
  }

  // Redirect to the actual self order page
  redirect(`/order/${resolvedUserId}/${tableId}`);
}

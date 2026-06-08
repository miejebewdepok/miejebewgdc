import { NextRequest, NextResponse } from "next/server";
import { createDebt, getRequestUser, isOwner } from "@/lib/server/app-service";
import { handleRouteError } from "@/lib/server/route-error";
import { DebtDraft } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUser();
    if (!isOwner(requestUser)) {
      return NextResponse.json({ error: "Hanya Owner/Admin yang dapat menambah kasbon." }, { status: 403 });
    }

    const draft = (await request.json()) as DebtDraft;
    const debt = await createDebt(requestUser.userId, draft);
    return NextResponse.json({ debt });
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan kasbon.");
  }
}

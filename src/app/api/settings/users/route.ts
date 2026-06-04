import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { pool } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { session } = await getRequestUser();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the current user is a store owner of Cabang 1
    const profileRes = await pool.query(
      `SELECT business_notes FROM store_profiles WHERE user_id = $1`,
      [currentUserId]
    );

    if ((profileRes.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const notes = profileRes.rows[0].business_notes;
    let isCabang2 = false;
    try {
      if (notes && notes.startsWith("{")) {
        const extra = JSON.parse(notes);
        if (extra.branchCode === "CABANG_2") {
          isCabang2 = true;
        }
      }
    } catch (e) {}

    if (isCabang2) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Query all users to manage access
    const res = await pool.query(
      `SELECT id, name, email, "isApproved", "createdAt" FROM "user" ORDER BY "createdAt" DESC`
    );

    return NextResponse.json({ users: res.rows });
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session } = await getRequestUser();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the current user is a store owner of Cabang 1
    const profileRes = await pool.query(
      `SELECT business_notes FROM store_profiles WHERE user_id = $1`,
      [currentUserId]
    );

    if ((profileRes.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const notes = profileRes.rows[0].business_notes;
    let isCabang2 = false;
    try {
      if (notes && notes.startsWith("{")) {
        const extra = JSON.parse(notes);
        if (extra.branchCode === "CABANG_2") {
          isCabang2 = true;
        }
      }
    } catch (e) {}

    if (isCabang2) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, isApproved } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Prevent modifying themselves
    if (userId === currentUserId) {
      return NextResponse.json({ error: "Cannot modify your own status" }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE "user" SET "isApproved" = $1 WHERE id = $2 RETURNING id`,
      [isApproved, userId]
    );

    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

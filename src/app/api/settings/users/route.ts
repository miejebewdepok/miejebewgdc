import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { pool } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { session } = await getRequestUser();
    const currentUserId = session?.user?.id;
    const currentUserEmail = session?.user?.email;

    if (!currentUserId || currentUserEmail !== "taufiqrusdhi.ez@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query only users who are not store owners (actual crew/karyawan)
    const res = await pool.query(
      `SELECT id, name, email, "isApproved", "createdAt" 
       FROM "user" 
       WHERE id NOT IN (SELECT user_id FROM store_profiles)
       ORDER BY "createdAt" DESC`
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
    const currentUserEmail = session?.user?.email;

    if (!currentUserId || currentUserEmail !== "taufiqrusdhi.ez@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, isApproved } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Prevent modifying themselves or any other store owner
    const ownerCheck = await pool.query(
      `SELECT user_id FROM store_profiles WHERE user_id = $1`,
      [userId]
    );

    if ((ownerCheck.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: "Cannot modify status of a store owner" }, { status: 400 });
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

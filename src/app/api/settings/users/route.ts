import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { pool } from "@/db/client";

export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const { session } = await getRequestUser();
    const userEmail = session?.user?.email;

    // Only allow taufiqrusdhi.ez@gmail.com to manage access
    if (userEmail !== "taufiqrusdhi.ez@gmail.com") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

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
    const userEmail = session?.user?.email;

    // Only allow taufiqrusdhi.ez@gmail.com to manage access
    if (userEmail !== "taufiqrusdhi.ez@gmail.com") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, isApproved } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE "user" SET "isApproved" = $1 WHERE id = $2 AND email != 'taufiqrusdhi.ez@gmail.com' RETURNING id`,
      [isApproved, userId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "User not found or cannot be modified" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

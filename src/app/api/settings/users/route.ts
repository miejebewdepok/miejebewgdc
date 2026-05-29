import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/app-service";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

function getAuthPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/warungos",
  });
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await getRequestUser();
    const userEmail = session?.user?.email;

    // Only allow taufiqrusdhi.ez@gmail.com to manage access
    if (userEmail !== "taufiqrusdhi.ez@gmail.com") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const pool = getAuthPool();
    const res = await pool.query(
      `SELECT id, name, email, "isApproved", "createdAt" FROM "user" ORDER BY "createdAt" DESC`
    );
    await pool.end();

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

    const pool = getAuthPool();
    const res = await pool.query(
      `UPDATE "user" SET "isApproved" = $1 WHERE id = $2 AND email != 'taufiqrusdhi.ez@gmail.com' RETURNING id`,
      [isApproved, userId]
    );
    await pool.end();

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "User not found or cannot be modified" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

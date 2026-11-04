import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAdminSession, COOKIE_NAME } from "@/lib/adminAuth";

export async function GET() {
  try {
    // ตรวจสอบสิทธิ์ Admin
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!verifyAdminSession(token)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ดึงข้อมูลรายได้จาก MongoDB
    const client = await clientPromise;
    const db = client.db("laundry");

    const data = await db.collection("transactions").aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          total: { $sum: "$amount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]).toArray();

    return NextResponse.json(
      data.map(d => ({
        date: d._id,
        total: d.total,
      }))
    );
  } catch (error) {
    console.error("Admin revenue API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
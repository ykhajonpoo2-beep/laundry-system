import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // 🔥 ลบ cookie
  res.cookies.set("admin", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0, // หมดอายุทันที
  });

  return res;
}
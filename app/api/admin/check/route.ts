import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";

  if (cookie.includes("admin=true")) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
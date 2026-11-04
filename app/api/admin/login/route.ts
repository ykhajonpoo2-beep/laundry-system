
import { NextResponse } from "next/server";
import {
  createAdminSession,
  COOKIE_NAME,
  SESSION_DURATION,
} from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (
      !process.env.ADMIN_USER ||
      !process.env.ADMIN_PASS ||
      !process.env.ADMIN_SESSION_SECRET
    ) {
      return NextResponse.json(
        { error: "Admin environment is not configured" },
        { status: 500 }
      );
    }

    if (
      username !== process.env.ADMIN_USER ||
      password !== process.env.ADMIN_PASS
    ) {
      return NextResponse.json(
        { error: "login failed" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set(COOKIE_NAME, createAdminSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_DURATION,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Invalid login request" },
      { status: 400 }
    );
  }
}

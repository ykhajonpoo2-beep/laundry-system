
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyAdminSession,
  COOKIE_NAME,
} from "@/lib/adminAuth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (verifyAdminSession(token)) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

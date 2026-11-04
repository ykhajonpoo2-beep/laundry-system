
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession, COOKIE_NAME } from "@/lib/adminAuth";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ตรวจสอบ Session จริง
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isLoggedIn = verifyAdminSession(token);

  // Login แล้ว ห้ามกลับหน้า Login
  if (isLoggedIn && path === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // อนุญาตหน้า Login
  if (path === "/admin/login") {
    return NextResponse.next();
  }

  // ป้องกันหน้า Admin
  if (path.startsWith("/admin") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

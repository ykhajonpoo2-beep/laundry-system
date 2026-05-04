import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const isLoggedIn = req.cookies.get("admin");
  const path = req.nextUrl.pathname;

  // ✅ 1. ถ้า login แล้ว → ห้ามกลับหน้า login
  if (isLoggedIn && path === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // ✅ 2. อนุญาตหน้า login (คนที่ยังไม่ login)
  if (path === "/admin/login") {
    return NextResponse.next();
  }

  // 🔒 3. กันหน้า admin
  if (!isLoggedIn && path.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // ✅ 4. อื่น ๆ ผ่านได้
  return NextResponse.next();
}
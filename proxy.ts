export function proxy(req: any) {
  const path = req.nextUrl.pathname;

  // ❗ ปล่อย API ผ่าน
  if (path.startsWith("/api")) {
    return;
  }

  // 🔒 กัน admin
  const isAdmin = req.cookies.get("admin");

  if (!isAdmin && path.startsWith("/admin")) {
    return Response.redirect(new URL("/admin/login", req.url));
  }
}
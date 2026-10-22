import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 边缘路由守卫 (Next.js Proxy / Middleware)
 * 拦截后台受保护路由请求，根据 Cookie 中的 token 判断登录态并执行重定向
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isAuthPage = pathname.startsWith("/login");
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/articles") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/tags") ||
    pathname.startsWith("/comments") ||
    pathname.startsWith("/files") ||
    pathname.startsWith("/ops") ||
    pathname.startsWith("/containers") ||
    pathname.startsWith("/mcp-config");

  // 未登录访问后台 → 重定向到登录页
  if (isDashboard && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 已登录访问登录页 → 重定向到仪表盘
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/articles/:path*",
    "/categories/:path*",
    "/tags/:path*",
    "/comments/:path*",
    "/files/:path*",
    "/ops/:path*",
    "/containers/:path*",
    "/mcp-config/:path*",
    "/login",
  ],
};

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value
    const isAuthPage = request.nextUrl.pathname.startsWith('/login')
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

    // 未登录访问后台 → 重定向到登录页
    if (isDashboard && !token) {
        console.log('未登录访问后台，重定向到登录页')
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 已登录访问登录页 → 重定向到仪表盘
    if (isAuthPage && token) {
        console.log('已登录访问登录页，重定向到仪表盘')
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',  // 保护所有仪表盘路由
        '/login'              // 处理登录页重定向
    ]
}

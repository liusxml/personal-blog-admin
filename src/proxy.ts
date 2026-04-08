import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 解析 JWT payload（不验签，仅读取用户信息用于 Dozzle Header 注入）
 * JWT 的签名验证由后端负责；这里只读取已登录用户的基本信息
 */
function parseJwtPayload(token: string): Record<string, string> | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        // Base64url decode（补齐 padding）
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
        const decoded = atob(padded)
        return JSON.parse(decoded)
    } catch (_e) {
        return null
    }
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get('token')?.value

    const isAuthPage = pathname.startsWith('/login')
    const isDashboard =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/articles') ||
        pathname.startsWith('/categories') ||
        pathname.startsWith('/tags') ||
        pathname.startsWith('/comments') ||
        pathname.startsWith('/files') ||
        pathname.startsWith('/ops') ||
        pathname.startsWith('/containers')

    // 未登录访问后台 → 重定向到登录页
    if (isDashboard && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 已登录访问登录页 → 重定向到仪表盘
    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ── Dozzle 代理：注入 Forward Proxy 认证 Header ──────────────
    // 参考：https://dozzle.dev/guide/authentication#forward-proxy
    if (pathname.startsWith('/dozzle')) {
        // 未登录访问 Dozzle → 重定向到登录页
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // 解析 JWT payload，注入 Dozzle 所需身份 Header
        const jwtPayload = parseJwtPayload(token)
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('Remote-User', jwtPayload?.sub ?? jwtPayload?.username ?? 'admin')
        requestHeaders.set('Remote-Name', jwtPayload?.nickname ?? jwtPayload?.name ?? jwtPayload?.sub ?? 'Admin')
        requestHeaders.set('Remote-Email', jwtPayload?.email ?? '')

        return NextResponse.next({ request: { headers: requestHeaders } })
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/articles/:path*',
        '/categories/:path*',
        '/tags/:path*',
        '/comments/:path*',
        '/files/:path*',
        '/ops/:path*',
        '/containers/:path*',
        '/dozzle/:path*',
        '/login',
    ],
}

/**
 * Dozzle 反向代理 Route Handler
 *
 * 使用 Route Handler 而非 next.config.ts rewrites 的原因：
 * - rewrites() 在 next build 时执行，无法读取运行时环境变量（如 DOZZLE_URL）
 * - Route Handler 在每次请求时执行，可直接读取 process.env.DOZZLE_URL
 *
 * 鉴权由 proxy.ts（Middleware）负责：
 * - 拦截 /dozzle/:path* 请求，验证 JWT Cookie
 * - 解析 JWT payload，注入 Remote-User / Remote-Name / Remote-Email Header
 * - Dozzle 配置为 forward-proxy 模式，信任这些 Header
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// 运行时读取（而非构建时），确保 Docker 内网服务名正确解析
const DOZZLE_URL = process.env.DOZZLE_URL ?? 'http://localhost:8888'

async function handler(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> }
) {
    const { path } = await context.params
    const pathStr = path?.join('/') ?? ''
    const search = request.nextUrl.search

    // 构造目标 URL：/dozzle 或 /dozzle/some/path?query
    const targetUrl = `${DOZZLE_URL}/dozzle${pathStr ? `/${pathStr}` : ''}${search}`

    // 转发请求头（包含 proxy.ts 注入的 Remote-User 等 Header）
    const forwardHeaders = new Headers(request.headers)
    // 删除 host，避免代理目标收到错误的 Host Header
    forwardHeaders.delete('host')

    try {
        const upstream = await fetch(targetUrl, {
            method: request.method,
            headers: forwardHeaders,
            // GET/HEAD 不带 body；其他方法流式转发（用于 WebSocket upgrade 等）
            body: ['GET', 'HEAD'].includes(request.method)
                ? undefined
                : (request.body as BodyInit),
            // @ts-expect-error – Node.js fetch 需要 duplex:'half' 才能流式转发 body
            duplex: 'half',
            // 禁用自动 gzip 解压，保持原始响应流（对 SSE 很重要）
            compress: false,
        })

        // 直接透传响应（状态码 + 响应头 + 响应体流）
        // 这样 SSE（text/event-stream）日志流可以实时透传给浏览器
        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: upstream.headers,
        })
    } catch (error) {
        console.error(`[Dozzle proxy] Failed to connect to ${targetUrl}:`, error)
        return NextResponse.json(
            { error: 'Dozzle service unavailable' },
            { status: 502 }
        )
    }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const HEAD = handler
export const OPTIONS = handler

// 关闭响应缓冲（Next.js 15+ 默认缓冲，SSE 需要流式输出）
export const dynamic = 'force-dynamic'

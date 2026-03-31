'use client'

import { useState, useRef, useCallback } from 'react'
import type { OpsStreamStatus, OpsToolCall } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// ─── 返回值类型 ────────────────────────────────────────────────────────────────

export interface UseOpsStreamReturn {
    /** AI 当前正在流式输出的文本（每次 send 后重置） */
    streamingText: string
    /** 终端日志行（来自 event: ops_log，跨多轮累积） */
    terminalLines: string[]
    /** 最近一次工具调用信息（来自 event: tool_call） */
    latestToolCall: OpsToolCall | null
    /** 当前 SSE 流状态 */
    status: OpsStreamStatus
    /** 错误信息（status === 'error' 时非 null） */
    error: string | null
    /** 发送一条运维指令，建立新 SSE 流 */
    send: (message: string, sessionId?: string) => void
    /** 清空终端输出 */
    clearTerminal: () => void
    /** 强制中止当前 SSE 请求 */
    abort: () => void
}

// ─── SSE 文本帧解析器 ──────────────────────────────────────────────────────────

/**
 * parseSseLine
 *
 * 将从 ReadableStream 读取的原始文本中提取 SSE 事件。
 *
 * SSE 格式规范（text/event-stream）：
 *   event: <type>\n
 *   data: <payload>\n
 *   \n          ← 空行代表一条事件结束
 *
 * @param chunk  从流中读取的原始文本（可能包含多条事件）
 * @param onEvent  回调：(eventType, data) => void
 */
function parseSseChunk(
    chunk: string,
    onEvent: (type: string, data: string) => void
): void {
    // 按完整事件帧（\n\n 双换行）分割，逐帧解析
    const events = chunk.split(/\n\n/)
    for (const event of events) {
        if (!event.trim()) continue

        let type = 'message'
        let data: string | undefined = undefined   // 用 undefined 区分「未设置」和「空字符串」

        for (const line of event.split('\n')) {
            if (line.startsWith('event:')) {
                type = line.slice('event:'.length).trim()
            } else if (line.startsWith('data:')) {
                // SSE 规范：data: 后紧跟一个可选空格，再跟内容。
                // 后端 LangChain4j 推送格式为 `data:<token>`（无额外空格），
                // 其中 token 本身可能以空格开头（如 " world"）或就是一个空格（" "）。
                // 因此必须一律保留 data: 之后的所有字符，不做任何 trim。
                data = line.slice('data:'.length)
            }
        }

        // 用 undefined 判断，确保纯空格 token（如 " "）不被 falsy 检查过滤
        if (data !== undefined) {
            onEvent(type, data)
        }
    }
}

// ─── Hook 实现 ────────────────────────────────────────────────────────────────

/**
 * useOpsStream
 *
 * 使用 Fetch API + ReadableStream 消费后端 Ops Agent SSE 端点。
 *
 * 相比 EventSource 的优势：
 *   - ✅ 支持自定义 Header（Authorization: Bearer <token>）
 *   - ✅ 支持 GET/POST，指令可放在请求体中（不受 URL 长度限制）
 *   - ✅ 无需后端修改 SecurityConfig 支持 query param token
 *
 * 监听 5 种具名事件：
 *   - event: message   → AI 逐 token 流式追加到 streamingText
 *   - event: ops_log   → SSH 终端输出，追加到 terminalLines
 *   - event: tool_call → 工具调用完成通知，更新 latestToolCall
 *   - event: done      → 整轮对话结束，关闭流
 *   - event: error     → 服务端异常，更新 error 状态
 *
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream
 */
export function useOpsStream(): UseOpsStreamReturn {
    const [streamingText, setStreamingText] = useState('')
    const [terminalLines, setTerminalLines] = useState<string[]>([])
    const [latestToolCall, setLatestToolCall] = useState<OpsToolCall | null>(null)
    const [status, setStatus] = useState<OpsStreamStatus>('idle')
    const [error, setError] = useState<string | null>(null)

    // AbortController 用于中止 fetch 请求
    const abortCtrlRef = useRef<AbortController | null>(null)

    /** 中止当前请求并清理 */
    const abortCurrent = useCallback(() => {
        if (abortCtrlRef.current) {
            abortCtrlRef.current.abort()
            abortCtrlRef.current = null
        }
    }, [])

    /** 强制关闭（供父组件 useEffect cleanup 调用） */
    const abort = useCallback(() => {
        abortCurrent()
        setStatus('idle')
    }, [abortCurrent])

    /** 清空终端日志 */
    const clearTerminal = useCallback(() => {
        setTerminalLines([])
    }, [])

    /**
     * 向后端发送运维指令，建立新的 SSE 流。
     *
     * 使用 GET + query param 与后端接口对齐（后端为 @GetMapping）。
     * Authorization 通过标准 Header 传递，无需改动 SecurityConfig。
     *
     * @param message   用户自然语言运维指令
     * @param sessionId 会话 ID，用于多轮记忆（默认 'default'）
     */
    const send = useCallback((message: string, sessionId = 'default') => {
        // 中止上一次请求
        abortCurrent()

        // 重置本轮状态（terminalLines 跨轮累积，由 clearTerminal 显式清空）
        setStreamingText('')
        setLatestToolCall(null)
        setError(null)
        setStatus('connecting')

        // 读取 token（规则 4.1）
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

        // 构建请求
        const params = new URLSearchParams({ message, sessionId })
        const url = `${API_BASE_URL}/api/v1/ops/chat?${params.toString()}`
        const ctrl = new AbortController()
        abortCtrlRef.current = ctrl

        // 异步消费 SSE 流
        ;(async () => {
            let response: Response

            try {
                response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Accept: 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    signal: ctrl.signal,
                })
            } catch (err) {
                // AbortError 是正常中止，非用户侧错误
                if ((err as Error).name === 'AbortError') return
                setError(`连接失败：${(err as Error).message}`)
                setStatus('error')
                return
            }

            if (!response.ok) {
                setError(`HTTP ${response.status}：${response.statusText}`)
                setStatus('error')
                return
            }

            if (!response.body) {
                setError('响应体为空，服务端未返回 SSE 流')
                setStatus('error')
                return
            }

            setStatus('streaming')

            // 读取 ReadableStream，解码为文本，逐块解析 SSE 事件
            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            // 跨 chunk 累积缓冲（事件帧可能在多个 chunk 中传输）
            let buffer = ''

            try {
                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    // 按完整事件帧（\n\n 双换行）解析，剩余不完整的留在 buffer
                    const lastDelimiter = buffer.lastIndexOf('\n\n')
                    if (lastDelimiter === -1) continue

                    const complete = buffer.slice(0, lastDelimiter + 2)
                    buffer = buffer.slice(lastDelimiter + 2)

                    parseSseChunk(complete, (type, data) => {
                        switch (type) {
                            case 'message':
                                setStreamingText(prev => prev + data)
                                break

                            case 'ops_log': {
                                const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false })
                                setTerminalLines(prev => [...prev, `[${ts}] ${data}`])
                                break
                            }

                            case 'tool_call':
                                setLatestToolCall({ toolName: data, timestamp: Date.now() })
                                break

                            case 'done':
                                setStatus('done')
                                ctrl.abort()    // 关闭底层连接
                                break

                            case 'error':
                                setError(data)
                                setStatus('error')
                                ctrl.abort()
                                break
                        }
                    })
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setError(`流读取异常：${(err as Error).message}`)
                    setStatus('error')
                }
            } finally {
                reader.releaseLock()
                abortCtrlRef.current = null
            }
        })()
    }, [abortCurrent])

    return {
        streamingText,
        terminalLines,
        latestToolCall,
        status,
        error,
        send,
        clearTerminal,
        abort,
    }
}

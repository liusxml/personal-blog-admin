'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useOpsStream } from '@/hooks/useOpsStream'
import { TerminalPanel } from '@/components/features/ops/TerminalPanel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Bot, User, SendHorizonal, Trash2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { OpsMessage } from '@/types'

// ─── AI 回复的 Markdown 渲染器 ────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // 标题层级
                h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5">{children}</h3>,
                // 文本威次
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                // 内行代码
                code: ({ children, className }) => {
                    const isBlock = className?.includes('language-')
                    return isBlock ? (
                        <code className={cn(
                            'block bg-black/30 rounded p-2 mt-1 mb-1 text-xs font-mono whitespace-pre-wrap break-all',
                            className
                        )}>{children}</code>
                    ) : (
                        <code className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                    )
                },
                // 代码块
                pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
                // 引用块
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-current opacity-70 pl-2 my-1 italic">{children}</blockquote>
                ),
                // 列表
                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1 pl-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1 pl-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                // 段落
                p: ({ children }) => <p className="my-0.5 leading-relaxed">{children}</p>,
                // 分隔线
                hr: () => <hr className="my-2 border-current opacity-20" />,
                // 表格（GFM）
                table: ({ children }) => (
                    <div className="overflow-x-auto my-1">
                        <table className="text-xs border-collapse w-full">{children}</table>
                    </div>
                ),
                th: ({ children }) => <th className="border border-current/30 px-2 py-1 font-semibold bg-current/10">{children}</th>,
                td: ({ children }) => <td className="border border-current/30 px-2 py-1">{children}</td>,
            }}
        >
            {content}
        </ReactMarkdown>
    )
}

// ─── 聊天气泡 ──────────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: OpsMessage }) {
    const isUser = msg.role === 'user'
    return (
        <div className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
            {/* 头像 */}
            <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs mt-0.5',
                isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            {/* 气泡 */}
            <div className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
                isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
                    : 'bg-muted text-foreground rounded-tl-sm'
            )}>
                {/* 用户消息用纯文本；AI 回复用 Markdown 渲染 */}
                {isUser ? msg.content : <MarkdownContent content={msg.content} />}
            </div>
        </div>
    )
}

// ─── 流式输出气泡（AI 正在回复中） ────────────────────────────────────────────

function StreamingBubble({ text }: { text: string }) {
    if (!text) return null
    return (
        <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
                <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm leading-relaxed break-words text-foreground">
                {/* 流式输出同样走 Markdown 渲染，避免显示原始 **粗体** `代码` 等符号 */}
                <MarkdownContent content={text} />
                <span className="inline-block h-3.5 w-[6px] bg-foreground ml-0.5 align-middle opacity-70"
                    style={{ animation: 'blink 1s step-end infinite' }} />
            </div>
        </div>
    )
}


// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function OpsPage() {
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<OpsMessage[]>([])
    const chatAnchorRef = useRef<HTMLDivElement>(null)
    // 防止 streaming→done 归档执行两次的标记（每轮 send 重置）
    const hasArchivedRef = useRef(false)
    // 用 ref 同步最新 streamingText，避免 useEffect 因 deps 变化多次触发归档
    const streamingTextRef = useRef('')

    const {
        streamingText,
        terminalLines,
        latestToolCall,
        status,
        error,
        send,
        clearTerminal,
        abort,
    } = useOpsStream()

    // ── 同步 streamingText 到 ref（供 useEffect 安全读取，不加入 deps）─────────
    useEffect(() => {
        streamingTextRef.current = streamingText
    })

    // ── 每次发送新指令时重置归档标记 ──────────────────────────────────────────
    useEffect(() => {
        if (status === 'connecting') {
            hasArchivedRef.current = false
        }
    }, [status])

    // ── 当 SSE 流结束时，将完成的 AI 消息归档到历史（只触发一次）──────────────
    const prevStatusRef = useRef(status)
    useEffect(() => {
        const prev = prevStatusRef.current
        prevStatusRef.current = status

        // streaming → done：从 ref 读取最终文本，用标记确保只归档一次
        if (prev === 'streaming' && status === 'done' && !hasArchivedRef.current) {
            hasArchivedRef.current = true
            const finalText = streamingTextRef.current
            if (finalText) {
                setMessages(m => [...m, {
                    role: 'assistant',
                    content: finalText,
                    timestamp: Date.now(),
                }])
            }
        }

        // 错误处理
        if (status === 'error' && error) {
            toast.error(`Agent 异常：${error}`)
        }
    }, [status, error])

    // ── 聊天区自动滚到底部 ─────────────────────────────────────────────────────
    useEffect(() => {
        chatAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingText])

    // ── 组件卸载时关闭 SSE 连接（防止泄漏） ──────────────────────────────────
    useEffect(() => {
        return () => abort()
    }, [abort])

    // ── 发送消息 ───────────────────────────────────────────────────────────────
    const handleSend = () => {
        const q = input.trim()
        if (!q || status === 'streaming' || status === 'connecting') return

        // 先写入用户消息
        setMessages(m => [...m, { role: 'user', content: q, timestamp: Date.now() }])
        setInput('')
        send(q)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleClearChat = () => {
        // 同时中止正在进行的 SSE 流，防止清空后旧回复继续追加
        abort()
        setMessages([])
        toast.success('对话记录已清空')
    }

    const isStreaming = status === 'streaming' || status === 'connecting'

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)] gap-4">

            {/* ── 页面标题栏 ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Ops Copilot</h2>
                    <Badge variant="secondary" className="text-xs">AI 运维助手</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>仅管理员可用 · 命令在白名单内执行</span>
                </div>
            </div>

            {/* ── 双栏主区域 ──────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ━━ 左栏：AI 对话 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="flex flex-col border rounded-lg overflow-hidden bg-card">

                    {/* 左栏顶部 */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI 对话</span>
                        </div>
                        <Button
                            id="ops-chat-clear"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-muted-foreground hover:text-destructive"
                            onClick={handleClearChat}
                            disabled={messages.length === 0 && !streamingText}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            清空
                        </Button>
                    </div>

                    {/* 消息列表 */}
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="flex flex-col gap-3 p-4">
                            {messages.length === 0 && !streamingText && (
                                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                                    <Bot className="h-10 w-10 opacity-20" />
                                    <p className="text-sm">发送运维指令，Agent 将自动执行并返回结果</p>
                                    <p className="text-xs opacity-60">例如：帮我查看 frontend 服务日志</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <ChatBubble key={i} msg={msg} />
                            ))}
                            {/* 流式输出中的气泡：仅在流式传输期间渲染。
                                status=done 后 streamingText 不会立即清空，
                                若不加 isStreaming 条件，会与归档后的 ChatBubble 同时出现，导致显示两遍 */}
                            {isStreaming && <StreamingBubble text={streamingText} />}
                            {/* 滚动锚点 */}
                            <div ref={chatAnchorRef} />
                        </div>
                    </ScrollArea>

                    {/* 输入区 */}
                    <div className="border-t p-4 shrink-0">
                        <div className="flex gap-2 items-end">
                            <Textarea
                                id="ops-input"
                                placeholder="输入运维指令… (Enter 发送，Shift+Enter 换行)"
                                className="resize-none min-h-[44px] max-h-[120px] text-sm"
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isStreaming}
                            />
                            <Button
                                id="ops-send"
                                size="icon"
                                className="h-11 w-11 shrink-0"
                                onClick={handleSend}
                                disabled={!input.trim() || isStreaming}
                            >
                                <SendHorizonal className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            基于白名单的 SSH 命令执行，结果实时推送到右侧终端
                        </p>
                    </div>
                </div>

                {/* ━━ 右栏：终端输出 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <TerminalPanel
                    lines={terminalLines}
                    status={status}
                    latestToolCall={latestToolCall}
                    onClear={clearTerminal}
                    className="min-h-0"
                />
            </div>
        </div>
    )
}

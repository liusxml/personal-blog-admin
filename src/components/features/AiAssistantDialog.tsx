'use client'

import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { askAi } from '@/lib/api'
import { useAiChatStore } from '@/stores/useAiChatStore'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, SendHorizonal, Trash2, User, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AiAssistantDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// ─── 消息气泡 ─────────────────────────────────────────────────────────────────

function ThinkingDots() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    )
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function AiAssistantDialog({ open, onOpenChange }: AiAssistantDialogProps) {
    const { messages, addMessage, clearMessages } = useAiChatStore()
    const [input, setInput] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    // 滚动到最新消息
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const { mutate: sendQuestion, isPending } = useMutation({
        mutationFn: askAi,
        onSuccess: (data) => {
            addMessage({
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                timestamp: Date.now(),
            })
        },
        onError: (err: Error) => {
            toast.error(`AI 服务异常：${err.message}`)
            // 移除刚加入的用户消息（取消乐观更新）
        },
    })

    const handleSend = () => {
        const question = input.trim()
        if (!question || isPending) return

        // 先乐观写入用户消息
        addMessage({ role: 'user', content: question, timestamp: Date.now() })
        setInput('')
        sendQuestion({ question })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleClear = () => {
        clearMessages()
        toast.success('对话记录已清空')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex flex-col gap-0 p-0 sm:max-w-2xl h-[80vh] max-h-[700px]"
            >
                {/* ── 头部 ─────────────────────────────────────────── */}
                <DialogHeader className="flex-row items-center justify-between px-5 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <DialogTitle className="text-base font-semibold">
                            AI 助手
                        </DialogTitle>
                        <Badge variant="secondary" className="text-xs">
                            基于博客内容
                        </Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground hover:text-destructive"
                        onClick={handleClear}
                        disabled={messages.length === 0}
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        清空记录
                    </Button>
                </DialogHeader>

                {/* ── 消息区 ───────────────────────────────────────── */}
                <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
                    <div className="flex flex-col gap-4 px-5 py-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                                <Bot className="h-10 w-10 opacity-30" />
                                <p className="text-sm">你好！可以向我提问关于博客内容的任何问题</p>
                                <p className="text-xs opacity-60">例如：你写过哪些关于 Docker 的文章？</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'flex gap-3',
                                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                            >
                                {/* 头像 */}
                                <div
                                    className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5',
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    {msg.role === 'user' ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        <Bot className="h-4 w-4" />
                                    )}
                                </div>

                                <div className={cn('flex flex-col gap-1.5 max-w-[85%]', msg.role === 'user' && 'items-end')}>
                                    {/* 气泡 */}
                                    <div
                                        className={cn(
                                            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-muted text-foreground rounded-tl-sm'
                                        )}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* 参考来源 */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <BookOpen className="h-3 w-3" />
                                                参考文章
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {msg.sources.map((src) => (
                                                    <Badge
                                                        key={src.articleId}
                                                        variant="outline"
                                                        className="text-xs font-normal cursor-default"
                                                    >
                                                        {src.title}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* 等待 AI 回复时的 loading */}
                        {isPending && (
                            <div className="flex gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-tl-sm">
                                    <ThinkingDots />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* ── 输入区 ───────────────────────────────────────── */}
                <div className="border-t px-5 py-4 shrink-0">
                    <div className="flex gap-2 items-end">
                        <Textarea
                            id="ai-assistant-input"
                            placeholder="输入问题… (Enter 发送，Shift+Enter 换行)"
                            className="resize-none min-h-[44px] max-h-[120px] text-sm"
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isPending}
                        />
                        <Button
                            id="ai-assistant-send"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            onClick={handleSend}
                            disabled={!input.trim() || isPending}
                        >
                            <SendHorizonal className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        AI 回答基于博客内容生成，仅供参考
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

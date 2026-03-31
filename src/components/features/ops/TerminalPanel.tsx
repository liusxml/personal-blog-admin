'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Terminal, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpsStreamStatus, OpsToolCall } from '@/types'

// ─── ANSI 转义码剪除工具函数 ──────────────────────────────────────────────────

/**
 * 剔除字符串中的 ANSI 控制序列（如颜色转义码 \x1B[32m 等）。
 * docker compose logs 输出常含 & ANSI 序列，不处理直接会显示为乱码。
 */
function stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[0-9;]*[mGKHFJABCDSTsu]/g, '').replace(/\r/g, '')
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TerminalPanelProps {
    /** SSH 终端输出行（每行已含时间戳前缀，由 useOpsStream 注入） */
    lines: string[]
    /** 当前 SSE 流状态（用于展示顶部状态指示器） */
    status: OpsStreamStatus
    /** 最近一次工具调用（用于展示工具调用徽章） */
    latestToolCall?: OpsToolCall | null
    /** 清空终端输出的回调 */
    onClear?: () => void
    /** 额外的容器类名 */
    className?: string
}

// ─── 状态指示器子组件 ─────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: OpsStreamStatus }) {
    const config = {
        idle:       { label: '待命',  color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
        connecting: { label: '连接中', color: 'text-yellow-500',       dot: 'bg-yellow-500 animate-pulse' },
        streaming:  { label: '执行中', color: 'text-green-500',        dot: 'bg-green-500 animate-pulse' },
        done:       { label: '完成',  color: 'text-green-500',        dot: 'bg-green-500' },
        error:      { label: '中断',  color: 'text-destructive',      dot: 'bg-destructive' },
    } as const

    const { label, color, dot } = config[status]

    return (
        <div className={cn('flex items-center gap-1.5 text-xs', color)}>
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />
            {label}
        </div>
    )
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

/**
 * TerminalPanel — 右侧 SSH 终端输出面板
 *
 * 设计规格：
 * - 黑底绿字，monospace 字体（shadcn 中用 font-mono）
 * - 新日志追加时自动滚动到底部（useEffect + anchorRef.scrollIntoView）
 * - 顶部状态栏展示：Terminal 图标、SSE 状态指示器、工具调用徽章、清空按钮
 * - 空状态有占位提示
 * - 纯展示组件，无内部状态，所有数据来自 props（由 useOpsStream 提供）
 */
export function TerminalPanel({
    lines,
    status,
    latestToolCall,
    onClear,
    className,
}: TerminalPanelProps) {
    // 锚点 div 始终在列表底部，scrollIntoView 实现精准自动滚动
    const anchorRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [lines])

    const isEmpty = lines.length === 0

    return (
        <div className={cn(
            'flex flex-col rounded-lg overflow-hidden',
            'bg-[#0a0f0a] border border-green-900/40',
            // 外发光效果
            'shadow-[0_0_0_1px_rgba(0,255,0,0.04),0_0_20px_rgba(0,255,0,0.04)]',
            className,
        )}>

            {/* ── 顶部状态栏 ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-green-900/30 shrink-0 bg-black/40">
                <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-300">终端输出</span>
                    <StatusIndicator status={status} />
                </div>

                <div className="flex items-center gap-2">
                    {/* 工具调用徽章 */}
                    {latestToolCall && (
                        <Badge
                            variant="outline"
                            className="h-5 text-[10px] border-zinc-700 text-zinc-300 bg-zinc-900 gap-1"
                        >
                            {status === 'streaming' ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : status === 'done' ? (
                                <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                            ) : (
                                <XCircle className="h-2.5 w-2.5 text-destructive" />
                            )}
                            {latestToolCall.toolName}
                        </Badge>
                    )}

                    {/* 清空按钮 */}
                    {onClear && (
                        <Button
                            id="terminal-clear-btn"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                            onClick={onClear}
                            disabled={isEmpty}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ── 终端主体 ─────────────────────────────────────────────────── */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 min-h-[200px]">
                    {/* 空状态占位：只在真正待命（idle）且无日志时显示，防止与“完成”状态并存 */}
                    {isEmpty && status === 'idle' ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2">
                            <Terminal className="h-8 w-8 text-zinc-700" />
                            <p className="text-xs text-zinc-600">等待 Agent 执行 SSH 命令…</p>
                        </div>
                    ) : isEmpty ? (
                        /* 流已结束但无日志输出：显示提示 */
                        <div className="flex flex-col items-center justify-center h-40 gap-2">
                            <Terminal className="h-8 w-8 text-zinc-700" />
                            <p className="text-xs text-zinc-600">本次指令无终端输出</p>
                        </div>
                    ) : (
                        <>
                            {lines.map((line, idx) => (
                                <TerminalLine key={idx} line={line} />
                            ))}
                            {/* 执行中的光标动画 */}
                            {status === 'streaming' && (
                                <span
                                    className="inline-block h-3.5 w-[7px] bg-green-500 ml-0.5 align-middle"
                                    style={{ animation: 'blink 1s step-end infinite' }}
                                />
                            )}
                        </>
                    )}
                    {/* 锚点：始终在内容底部，用于自动滚动 */}
                    <div ref={anchorRef} />
                </div>
            </ScrollArea>
        </div>
    )
}

// ─── 单行渲染子组件 ───────────────────────────────────────────────────────────

type LineLevel = 'error' | 'warn' | 'success' | 'info' | 'dim' | 'normal'

function classifyLine(text: string): LineLevel {
    const t = text.toLowerCase()
    if (t.includes('error') || t.includes('exception') || t.includes('× ') || t.includes('fatal') || t.includes('fail'))
        return 'error'
    if (t.includes('warn'))
        return 'warn'
    if (t.includes('healthy') || t.includes('success') || t.includes(' ok') || t.includes('started') || t.includes('done'))
        return 'success'
    if (t.includes('info') || t.includes('debug'))
        return 'info'
    if (t.trim() === '' || t.trim() === '|')
        return 'dim'
    return 'normal'
}

const levelStyle: Record<LineLevel, string> = {
    error:   'text-red-400   bg-red-950/30  border-l-2 border-red-500/60  pl-2',
    warn:    'text-yellow-400 bg-yellow-950/20 border-l-2 border-yellow-500/50 pl-2',
    success: 'text-emerald-400',
    info:    'text-sky-400/80',
    dim:     'text-zinc-700',
    normal:  'text-green-500',
}

/**
 * 单行终端输出渲染 — 保持完整终端美学，修复 break-all 截断问题。
 * 对 docker compose logs 格式做颜色分级，error/warn 行添加左侧指示条。
 */
function TerminalLine({ line }: { line: string }) {
    const cleaned = stripAnsi(line)
    const level   = classifyLine(cleaned)
    const style   = levelStyle[level]

    return (
        <div className={cn(
            'font-mono text-xs leading-[1.6] break-words whitespace-pre-wrap',
            'transition-colors duration-100',
            style,
        )}>
            {cleaned}
        </div>
    )
}



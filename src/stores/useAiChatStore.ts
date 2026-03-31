'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ArticleSummaryAI } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    /** 消息角色 */
    role: 'user' | 'assistant'
    /** 消息内容 */
    content: string
    /** 参考文章来源（仅 assistant 消息有） */
    sources?: ArticleSummaryAI[]
    /** 发送时间戳 */
    timestamp: number
}

interface AiChatState {
    messages: ChatMessage[]
    addMessage: (msg: ChatMessage) => void
    clearMessages: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * AI 对话记录 Store
 *
 * 使用 persist 中间件将最近 50 条消息持久化到 localStorage，
 * 确保刷新页面后记录不丢失。
 */
export const useAiChatStore = create<AiChatState>()(
    persist(
        (set) => ({
            messages: [],

            addMessage: (msg) =>
                set((state) => ({
                    // 最多保留最近 50 条，防止 localStorage 占用过大
                    messages: [...state.messages, msg].slice(-50),
                })),

            clearMessages: () => set({ messages: [] }),
        }),
        {
            name: 'ai-chat-history', // localStorage key
        }
    )
)

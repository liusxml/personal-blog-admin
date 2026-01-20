'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Toast {
    id: string
    title: string
    description?: string
    variant?: 'default' | 'destructive'
}

interface ToastContextType {
    toasts: Toast[]
    toast: (toast: Omit<Toast, 'id'>) => void
    dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString()
        const toastWithId = { ...newToast, id }

        setToasts((prev) => [...prev, toastWithId])

        // 自动移除toast（3秒后）
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`rounded-lg border p-4 shadow-lg transition-all ${t.variant === 'destructive'
                                ? 'bg-red-50 border-red-200 text-red-900'
                                : 'bg-white border-gray-200'
                            }`}
                        style={{ minWidth: '300px', maxWidth: '400px' }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-semibold">{t.title}</div>
                                {t.description && (
                                    <div className="text-sm mt-1 opacity-90">{t.description}</div>
                                )}
                            </div>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="ml-4 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}

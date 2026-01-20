'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ToastProps {
    id: string
    title: string
    description?: string
    variant?: 'default' | 'destructive'
    onDismiss: (id: string) => void
}

export function Toast({ id, title, description, variant = 'default', onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id)
        }, 3000)

        return () => clearTimeout(timer)
    }, [id, onDismiss])

    return (
        <div
            className={`
        rounded-lg border p-4 shadow-lg
        animate-in slide-in-from-bottom-5 fade-in
        ${variant === 'destructive'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-white border-gray-200 text-gray-900'
                }
      `}
            style={{ minWidth: '300px', maxWidth: '400px' }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="font-semibold">{title}</div>
                    {description && (
                        <div className="text-sm mt-1 opacity-90">{description}</div>
                    )}
                </div>
                <button
                    onClick={() => onDismiss(id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

export interface ToastContainerProps {
    toasts: Array<{
        id: string
        title: string
        description?: string
        variant?: 'default' | 'destructive'
    }>
    onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
                {toasts.map((toast) => (
                    <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
                ))}
            </div>
        </div>
    )
}

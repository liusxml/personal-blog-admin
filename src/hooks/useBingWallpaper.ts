'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { fetchBingWallpaper } from '@/lib/api'
import { toast } from 'sonner'
import { ArticleFormData } from '@/lib/validations'

/**
 * 必应壁纸自定义Hook
 * 提供壁纸获取逻辑和加载状态
 */
export function useBingWallpaper(form: UseFormReturn<ArticleFormData>) {
    const [bingLoading, setBingLoading] = useState(false)

    const handleUseBingWallpaper = async () => {
        try {
            setBingLoading(true)
            const wallpaperUrl = await fetchBingWallpaper()

            form.setValue('coverImage', wallpaperUrl)
            form.setValue('coverImageId', undefined as any)  // 必应壁纸无fileId

            toast.success('已使用必应壁纸')
        } catch (error) {
            console.error('[BingWallpaper] 获取失败:', error)
            toast.error('获取壁纸失败，请稍后重试')
        } finally {
            setBingLoading(false)
        }
    }

    return { bingLoading, handleUseBingWallpaper }
}

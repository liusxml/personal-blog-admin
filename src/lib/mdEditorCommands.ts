'use client'

import React from 'react'
import { ICommand } from '@uiw/react-md-editor'
import { Image as ImageIcon } from 'lucide-react'
import { uploadMarkdownImage } from './uploadImage'
import { toast } from 'sonner'

/**
 * MDEditor自定义图片上传命令
 * 支持选择本地图片、上传到S3、自动插入Markdown语法
 */
export const imageUploadCommand: ICommand = {
    name: 'imageUpload',
    keyCommand: 'imageUpload',
    buttonProps: { 'aria-label': '上传图片', title: '上传图片' },
    icon: React.createElement(ImageIcon, { className: 'h-3 w-3' }),
    execute: (_state, api) => {
        // 创建隐藏的file input
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                const url = await uploadMarkdownImage(file)
                const markdownText = `![${file.name}](${url})`
                api.replaceSelection(markdownText)
            } catch (error) {
                console.error('[MarkdownImageUpload] 上传失败:', error)
                toast.error(error instanceof Error ? error.message : '图片上传失败')
            }
        }
        input.click()
    }
}

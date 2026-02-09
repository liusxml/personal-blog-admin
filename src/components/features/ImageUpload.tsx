'use client'

import { useState } from 'react'
import { Image as ImageIcon, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateUploadUrl, uploadToS4, confirmUpload, getFileAccessUrl } from '@/lib/api'
import { toast } from 'sonner'
import SparkMD5 from 'spark-md5'

interface ImageUploadProps {
    value?: string  // 当前图片URL
    onChange: (data: { url: string; fileId: string }) => void  // 上传成功回调，返回URL和fileId
    onRemove?: () => void  // 删除回调
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)

    // MD5计算
    const calculateMD5 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const chunkSize = 2097152  // 2MB分片
            const chunks = Math.ceil(file.size / chunkSize)
            let currentChunk = 0
            const spark = new SparkMD5.ArrayBuffer()
            const reader = new FileReader()

            reader.onload = (e) => {
                spark.append(e.target?.result as ArrayBuffer)
                currentChunk++

                if (currentChunk < chunks) {
                    loadNext()
                } else {
                    resolve(spark.end())
                }

                // MD5计算占50%进度
                setProgress(Math.round((currentChunk / chunks) * 50))
            }

            reader.onerror = () => reject(new Error('MD5计算失败'))

            function loadNext() {
                const start = currentChunk * chunkSize
                const end = Math.min(start + chunkSize, file.size)
                reader.readAsArrayBuffer(file.slice(start, end))
            }

            loadNext()
        })
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 验证图片类型
        if (!file.type.startsWith('image/')) {
            toast.error('请选择图片文件')
            return
        }

        // 验证大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
            toast.error('图片大小不能超过10MB')
            return
        }

        setUploading(true)
        setProgress(0)

        try {
            // 1. 计算MD5
            const md5 = await calculateMD5(file)

            // 2. 请求预签名URL
            const presignedData = await generateUploadUrl({
                fileName: file.name,
                fileSize: file.size,
                contentType: file.type,
                md5
            })

            // 3. 秒传检查
            if (presignedData.instant) {
                const accessUrl = await getFileAccessUrl(presignedData.fileId, 10080)  // 7天有效期
                onChange({ url: accessUrl, fileId: presignedData.fileId })
                toast.success('上传成功（秒传）')
                setUploading(false)
                setProgress(0)
                return
            }

            setProgress(50)

            // 4. 直传S3
            await uploadToS4(presignedData.uploadUrl, file)
            setProgress(75)

            // 5. 确认上传
            await confirmUpload(presignedData.fileId)

            // 6. 获取访问URL
            const accessUrl = await getFileAccessUrl(presignedData.fileId, 10080)  // 7天有效期
            onChange({ url: accessUrl, fileId: presignedData.fileId })

            setProgress(100)
            toast.success('封面图上传成功')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '上传失败')
        } finally {
            setUploading(false)
            setProgress(0)
            // 重置input以允许重新上传同一文件
            e.target.value = ''
        }
    }

    return (
        <div className="space-y-2">
            {value ? (
                // 预览模式
                <div className="relative group">
                    <img
                        src={value}
                        alt="封面图"
                        className="w-full h-48 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                onRemove?.()
                            }}
                        >
                            <X className="h-4 w-4 mr-1" />
                            移除
                        </Button>
                    </div>
                </div>
            ) : (
                // 上传区域
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Upload className="h-10 w-10 mb-3 text-muted-foreground animate-pulse" />
                        ) : (
                            <ImageIcon className="h-10 w-10 mb-3 text-muted-foreground" />
                        )}
                        <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">点击上传封面图</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            支持 JPG, PNG, GIF, WebP（最大10MB）
                        </p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>
            )}

            {/* 上传进度 */}
            {uploading && (
                <div className="space-y-1">
                    <div className="w-full bg-secondary rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                        上传中... {progress}%
                    </p>
                </div>
            )}
        </div>
    )
}

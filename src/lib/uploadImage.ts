'use client'

import SparkMD5 from 'spark-md5'
import { generateUploadUrl, uploadToS4, confirmUpload, getFileAccessUrl } from '@/lib/api'
import { toast } from 'sonner'

/**
 * 计算文件MD5（分片计算，支持大文件）
 */
export function calculateMD5(file: File): Promise<string> {
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

/**
 * 上传图片到S3并返回访问URL（用于Markdown编辑器）
 */
export async function uploadMarkdownImage(file: File): Promise<string> {
    // 验证图片类型
    if (!file.type.startsWith('image/')) {
        throw new Error('请选择图片文件')
    }

    // 验证大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('图片大小不能超过10MB')
    }

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
        const accessUrl = await getFileAccessUrl(presignedData.fileId, 60)  // 60分钟有效期
        toast.success('图片上传成功（秒传）')
        return accessUrl
    }

    // 4. 直传S3
    await uploadToS4(presignedData.uploadUrl, file)

    // 5. 确认上传
    await confirmUpload(presignedData.fileId)

    // 6. 获取访问URL
    const accessUrl = await getFileAccessUrl(presignedData.fileId, 60)  // 60分钟有效期
    toast.success('图片上传成功')

    return accessUrl
}

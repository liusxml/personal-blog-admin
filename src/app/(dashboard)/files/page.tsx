'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFiles, deleteFile, generateUploadUrl, uploadToS4, confirmUpload, getFileAccessUrl } from '@/lib/api'
import { FileVO } from '@/types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Upload, Trash2, Download, FileIcon } from 'lucide-react'
import SparkMD5 from 'spark-md5'
import { ToastContainer } from '@/components/ui/toast'

export default function FilesPage() {
    const [pageNum, setPageNum] = useState(1)
    const [pageSize] = useState(20)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const [uploadProgress, setUploadProgress] = useState(0)
    const [toasts, setToasts] = useState<Array<{ id: string; title: string; description?: string; variant?: "default" | "destructive" }>>([])
    const [isMounted, setIsMounted] = useState(false)

    const queryClient = useQueryClient()


    // 客户端挂载后才启用toast
    useEffect(() => {
        setIsMounted(true)
    }, [])


    // Toast helper
    const showToast = (title: string, description?: string, variant: "default" | "destructive" = "default") => {
        if (!isMounted) {
            console.log("[Toast] Not mounted yet")
            return
        }
        const id = Date.now().toString()
        console.log("[Toast] Adding toast:", { id, title, description, variant })
        setToasts(prev => [...prev, { id, title, description, variant }])
    }

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    // 查询文件列表
    const { data, isLoading } = useQuery({
        queryKey: ['files', pageNum, pageSize],
        queryFn: () => getFiles({ pageNum, pageSize }),
    })

    // 删除文件
    const deleteMutation = useMutation({
        mutationFn: deleteFile,
        onSuccess: () => {
            console.log('[Delete] Success - calling showToast')
            queryClient.invalidateQueries({ queryKey: ['files'] })
            showToast('删除成功', '文件已删除')
            setDeleteId(null)
        },
        onError: (error: Error) => {
            console.log('[Delete] Error:', error.message)
            showToast('删除失败', error.message, 'destructive')
        },
    })

    // 计算文件MD5
    const calculateMD5 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const blobSlice = File.prototype.slice
            const chunkSize = 2097152 // 2MB chunks
            const chunks = Math.ceil(file.size / chunkSize)
            let currentChunk = 0
            const spark = new SparkMD5.ArrayBuffer()
            const fileReader = new FileReader()

            fileReader.onload = (e) => {
                spark.append(e.target?.result as ArrayBuffer)
                currentChunk++

                if (currentChunk < chunks) {
                    loadNext()
                } else {
                    resolve(spark.end())
                }

                // Update progress
                setUploadProgress(Math.round((currentChunk / chunks) * 50)) // MD5 calculation is 50% of progress
            }

            fileReader.onerror = () => {
                reject(new Error('MD5计算失败'))
            }

            function loadNext() {
                const start = currentChunk * chunkSize
                const end = Math.min(start + chunkSize, file.size)
                fileReader.readAsArrayBuffer(blobSlice.call(file, start, end))
            }

            loadNext()
        })
    }

    // 上传文件
    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)
        setUploadProgress(0)

        try {
            // 1. 计算MD5
            const md5 = await calculateMD5(selectedFile)

            // 2. 请求预签名URL
            const presignedData = await generateUploadUrl({
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                contentType: selectedFile.type,
                md5,
            })

            // 3. 检查是否秒传
            if (presignedData.instant) {
                showToast('上传成功', '文件已存在，秒传成功')
                setUploadOpen(false)
                setSelectedFile(null)
                queryClient.invalidateQueries({ queryKey: ['files'] })
                return
            }

            setUploadProgress(50)

            // 4. 上传到S4
            await uploadToS4(presignedData.uploadUrl, selectedFile)

            setUploadProgress(75)

            // 5. 确认上传
            await confirmUpload(presignedData.fileId)

            setUploadProgress(100)

            showToast('上传成功', `文件 ${selectedFile.name} 已上传`)

            setUploadOpen(false)
            setSelectedFile(null)
            queryClient.invalidateQueries({ queryKey: ['files'] })
        } catch (error) {
            showToast('上传失败', error instanceof Error ? error.message : '未知错误', 'destructive')
        } finally {
            setUploading(false)
            setUploadProgress(0)
        }
    }

    // 格式化文件大小
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    // 格式化日期
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-CN')
    }

    // 下载文件
    const handleDownload = async (fileId: string, fileName: string) => {
        try {
            const accessUrl = await getFileAccessUrl(fileId, 60)
            // 创建隐藏的a标签下载
            const link = document.createElement('a')
            link.href = accessUrl
            link.download = fileName
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            showToast('获取下载链接失败', error instanceof Error ? error.message : '未知错误', 'destructive')
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">文件管理</h1>

                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            上传文件
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>上传文件</DialogTitle>
                            <DialogDescription>
                                选择文件上传到服务器（最大10MB）
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <Input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                            />
                            {selectedFile && (
                                <p className="text-sm text-muted-foreground">
                                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                </p>
                            )}
                            {uploading && (
                                <div className="space-y-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-sm text-center">{uploadProgress}%</p>
                                </div>
                            )}
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setUploadOpen(false)}
                                    disabled={uploading}
                                >
                                    取消
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploading}
                                >
                                    {uploading ? '上传中...' : '上传'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="p-6">
                {isLoading ? (
                    <div className="text-center py-8">加载中...</div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>文件名</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>大小</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>上传时间</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.records.map((file: FileVO) => (
                                    <TableRow key={file.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center">
                                                <FileIcon className="mr-2 h-4 w-4" />
                                                {file.originalName}
                                            </div>
                                        </TableCell>
                                        <TableCell>{file.contentType}</TableCell>
                                        <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs ${file.uploadStatus === 1
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {file.uploadStatus === 1 ? '已完成' : '待上传'}                      </span>
                                        </TableCell>
                                        <TableCell>{formatDate(file.createTime)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(file.id, file.originalName)}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteId(file.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* 分页 */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                共 {data?.total || 0} 条记录
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                                    disabled={pageNum === 1}
                                >
                                    上一页
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPageNum((p) => p + 1)}
                                    disabled={pageNum >= (data?.pages || 1)}
                                >
                                    下一页
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>

            {/* Toast通知 - 仅客户端渲染 */}
            {isMounted && <ToastContainer toasts={toasts} onDismiss={dismissToast} />}

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。确定要删除这个文件吗？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            确定删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

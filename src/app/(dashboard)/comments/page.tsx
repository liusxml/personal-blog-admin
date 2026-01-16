'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getComments,
    approveComment,
    rejectComment,
    deleteCommentByAdmin,
} from '@/lib/api'
import type { CommentVO, CommentTreeVO, CommentStatus, CommentTargetType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, XCircle, Trash2, MessageSquare } from 'lucide-react'

// 状态显示映射
const STATUS_CONFIG = {
    PENDING: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: '已通过', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
    DELETED: { label: '已删除', color: 'bg-gray-100 text-gray-800' },
    ADMIN_DELETED: { label: '系统删除', color: 'bg-gray-200 text-gray-700' },
    USER_DELETED: { label: '用户删除', color: 'bg-gray-200 text-gray-700' },
} as const

interface RejectDialogState {
    open: boolean
    commentId: string | null
    reason: string
}

export default function CommentsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // 搜索和筛选状态
    const [keyword, setKeyword] = useState('')
    const [searchInput, setSearchInput] = useState('')  // 搜索输入框值
    const [statusFilter, setStatusFilter] = useState<CommentStatus | 'ALL'>('ALL')
    const [targetType, setTargetType] = useState<CommentTargetType | 'ALL'>('ALL')

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)

    // 拒绝对话框状态
    const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
        open: false,
        commentId: null,
        reason: '',
    })

    // 删除对话框状态
    const [deleteDialog, setDeleteDialog] = useState<RejectDialogState>({
        open: false,
        commentId: null,
        reason: '',
    })

    // 获取评论列表
    const { data: commentsData, isLoading } = useQuery({
        queryKey: ['comments', keyword, statusFilter, targetType, currentPage, pageSize],
        queryFn: async () => {
            return getComments({
                pageNum: currentPage,
                pageSize: pageSize,
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                targetType: targetType === 'ALL' ? undefined : targetType,
            })
        },
    })

    const comments = commentsData?.records || []
    const total = commentsData?.total || 0
    const totalPages = Math.ceil(total / pageSize)

    // 审核通过
    const approveMutation = useMutation({
        mutationFn: approveComment,
        onSuccess: () => {
            toast({
                title: '审核成功',
                description: '评论已通过审核',
            })
            queryClient.invalidateQueries({ queryKey: ['comments'] })
        },
        onError: () => {
            toast({
                title: '审核失败',
                description: '请稍后重试',
                variant: 'destructive',
            })
        },
    })

    // 审核拒绝
    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            rejectComment(id, reason),
        onSuccess: () => {
            toast({
                title: '已拒绝',
                description: '评论已被拒绝',
            })
            setRejectDialog({ open: false, commentId: null, reason: '' })
            queryClient.invalidateQueries({ queryKey: ['comments'] })
        },
        onError: () => {
            toast({
                title: '操作失败',
                description: '请稍后重试',
                variant: 'destructive',
            })
        },
    })

    // 管理员删除
    const deleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            deleteCommentByAdmin(id, reason),
        onSuccess: () => {
            toast({
                title: '删除成功',
                description: '评论已删除',
            })
            setDeleteDialog({ open: false, commentId: null, reason: '' })
            queryClient.invalidateQueries({ queryKey: ['comments'] })
        },
        onError: () => {
            toast({
                title: '删除失败',
                description: '请稍后重试',
                variant: 'destructive',
            })
        },
    })

    const handleApprove = (id: string) => {
        approveMutation.mutate(id)
    }

    const handleReject = () => {
        if (!rejectDialog.commentId || !rejectDialog.reason.trim()) {
            toast({
                title: '请填写拒绝原因',
                variant: 'destructive',
            })
            return
        }
        rejectMutation.mutate({
            id: rejectDialog.commentId,
            reason: rejectDialog.reason,
        })
    }

    const handleDelete = () => {
        if (!deleteDialog.commentId || !deleteDialog.reason.trim()) {
            toast({
                title: '请填写删除原因',
                variant: 'destructive',
            })
            return
        }
        deleteMutation.mutate({
            id: deleteDialog.commentId,
            reason: deleteDialog.reason,
        })
    }

    const handleSearch = () => {
        setKeyword(searchInput.trim())
        setCurrentPage(1)  // 搜索时重置到第一页
    }

    const handleReset = () => {
        setKeyword('')
        setSearchInput('')
        setStatusFilter('ALL')
        setTargetType('ALL')
        setCurrentPage(1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    // 渲染评论列表（扁平结构）
    const renderCommentList = (comments: CommentVO[]) => {
        return comments.map((comment) => (
            <TableRow key={comment.id}>
                <TableCell>
                    <div>{comment.content}</div>
                </TableCell>
                <TableCell>
                    <Badge className={STATUS_CONFIG[comment.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'}>
                        {STATUS_CONFIG[comment.status as keyof typeof STATUS_CONFIG]?.label || comment.status}
                    </Badge>
                </TableCell>
                <TableCell>{comment.likeCount}</TableCell>
                <TableCell>{comment.replyCount}</TableCell>
                <TableCell>
                    {new Date(comment.createTime).toLocaleDateString()}
                </TableCell>
                <TableCell>
                    <div className="flex gap-2">
                        {comment.status === 'PENDING' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleApprove(comment.id)}
                                >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        setRejectDialog({
                                            open: true,
                                            commentId: comment.id,
                                            reason: '',
                                        })
                                    }
                                >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                            </>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                setDeleteDialog({
                                    open: true,
                                    commentId: comment.id,
                                    reason: '',
                                })
                            }
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        ))
    }

    if (isLoading) {
        return <div className="flex justify-center py-20">加载中...</div>
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">评论管理</h1>
                    <p className="text-muted-foreground">
                        管理所有文章和页面的评论
                    </p>
                </div>
            </div>

            {/* 搜索和筛选 */}
            <div className="flex gap-4">
                <div className="flex gap-2 max-w-sm">
                    <Input
                        placeholder="搜索评论内容..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}>搜索</Button>
                </div>

                <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as CommentStatus | 'ALL')}
                >
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="状态筛选" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">全部状态</SelectItem>
                        <SelectItem value="PENDING">待审核</SelectItem>
                        <SelectItem value="APPROVED">已通过</SelectItem>
                        <SelectItem value="REJECTED">已拒绝</SelectItem>
                        <SelectItem value="DELETED">已删除</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={targetType}
                    onValueChange={(value) =>
                        setTargetType(value as CommentTargetType | 'ALL')
                    }
                >
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="类型筛选" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">全部类型</SelectItem>
                        <SelectItem value="ARTICLE">文章评论</SelectItem>
                        <SelectItem value="PAGE">页面评论</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleReset}>
                    重置
                </Button>
            </div>

            {/* 评论表格 */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>评论内容</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>点赞数</TableHead>
                            <TableHead>回复数</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead>操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {comments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                    <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                                    <p className="text-muted-foreground">暂无评论数据</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            renderCommentList(comments)
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 分页 */}
            {total > 0 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        显示 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, total)} 条，共 {total} 条
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            上一页
                        </Button>
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = currentPage - 2 + i
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                )
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            下一页
                        </Button>
                    </div>
                </div>
            )}

            {/* 拒绝对话框 */}
            <Dialog
                open={rejectDialog.open}
                onOpenChange={(open) =>
                    setRejectDialog({ ...rejectDialog, open })
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>拒绝评论</DialogTitle>
                        <DialogDescription>
                            请填写拒绝原因，该原因将通知评论者
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={rejectDialog.reason}
                        onChange={(e) =>
                            setRejectDialog({
                                ...rejectDialog,
                                reason: e.target.value,
                            })
                        }
                        placeholder="请输入拒绝原因..."
                        rows={4}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setRejectDialog({ open: false, commentId: null, reason: '' })
                            }
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={rejectMutation.isPending}
                        >
                            确认拒绝
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除对话框 */}
            <Dialog
                open={deleteDialog.open}
                onOpenChange={(open) =>
                    setDeleteDialog({ ...deleteDialog, open })
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>删除评论</DialogTitle>
                        <DialogDescription>
                            请填写删除原因，该操作不可撤销
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={deleteDialog.reason}
                        onChange={(e) =>
                            setDeleteDialog({
                                ...deleteDialog,
                                reason: e.target.value,
                            })
                        }
                        placeholder="请输入删除原因..."
                        rows={4}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setDeleteDialog({ open: false, commentId: null, reason: '' })
                            }
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            确认删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

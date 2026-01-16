'use client'

import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
import { getCommentReports, approveReport, rejectReport } from '@/lib/api'
import type { CommentReportVO } from '@/types'
import { Button } from '@/components/ui/button'
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
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

const STATUS_CONFIG = {
    PENDING: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: '已通过', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
} as const

interface RemarkDialogState {
    open: boolean
    reportId: string | null
    remark: string
    action: 'approve' | 'reject' | null
}

export default function CommentReportsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [dialogState, setDialogState] = useState<RemarkDialogState>({
        open: false,
        reportId: null,
        remark: '',
        action: null,
    })

    // 获取举报列表
    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['comment-reports'],
        queryFn: () => getCommentReports(),
    })

    // 通过举报
    const approveMutation = useMutation({
        mutationFn: ({ id, remark }: { id: string; remark: string }) =>
            approveReport(id, remark),
        onSuccess: () => {
            toast({
                title: '处理成功',
                description: '举报已通过',
            })
            setDialogState({ open: false, reportId: null, remark: '', action: null })
            queryClient.invalidateQueries({ queryKey: ['comment-reports'] })
        },
    })

    // 拒绝举报
    const rejectMutation = useMutation({
        mutationFn: ({ id, remark }: { id: string; remark: string }) =>
            rejectReport(id, remark),
        onSuccess: () => {
            toast({
                title: '处理成功',
                description: '举报已拒绝',
            })
            setDialogState({ open: false, reportId: null, remark: '', action: null })
            queryClient.invalidateQueries({ queryKey: ['comment-reports'] })
        },
    })

    const handleConfirm = () => {
        if (!dialogState.reportId) return

        const mutation = dialogState.action === 'approve' ? approveMutation : rejectMutation
        mutation.mutate({
            id: dialogState.reportId,
            remark: dialogState.remark,
        })
    }

    if (isLoading) {
        return <div className=\"flex justify-center py-20\">加载中...</div>
    }

    return (
        <div className=\"space-y-6\">
            < div >
            <h1 className=\"text-3xl font-bold\">评论举报管理</h1>
                < p className =\"text-muted-foreground\">
    处理用户举报的不当评论
                </p >
            </div >

        <div className=\"rounded-md border\">
            < Table >
                    <TableHeader>
                        <TableRow>
                            <TableHead>举报原因</TableHead>
                            <TableHead>被举报评论</TableHead>
                            <TableHead>举报人</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>举报时间</TableHead>
                            <TableHead>操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className=\"text-center py-10\">
                                    <AlertTriangle className=\"h-12 w-12 mx-auto text-gray-400 mb-2\" />
                                    <p className=\"text-muted-foreground\">暂无举报</p>
                                </TableCell>
                            </TableRow >
                        ) : (
        reports.map((report) => (
            <TableRow key={report.id}>
                <TableCell>{report.reason}</TableCell>
                <TableCell>
                    {report.comment?.content || '已删除'}
                </TableCell>
                <TableCell>{report.reporterName}</TableCell>
                <TableCell>
                    <Badge className={STATUS_CONFIG[report.status].color}>
                        {STATUS_CONFIG[report.status].label}
                    </Badge>
                </TableCell>
                <TableCell>
                    {new Date(report.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                    {report.status === 'PENDING' && (
                        <div className=\"flex gap-2\">
                    <Button
                        size=\"sm\"
                    variant=\"ghost\"
                    onClick={() =>
                        setDialogState({
                            open: true,
                            reportId: report.id,
                            remark: '',
                            action: 'approve',
                        })
                    }
                                                >
                    <CheckCircle2 className=\"h-4 w-4 text-green-600\" />
                </Button>
                <Button
                    size=\"sm\"
                variant=\"ghost\"
                onClick={() =>
                    setDialogState({
                        open: true,
                        reportId: report.id,
                        remark: '',
                        action: 'reject',
                    })
                }
                                                >
                <XCircle className=\"h-4 w-4 text-red-600\" />
            </Button>
                                            </div >
                                        )}
                                    </TableCell >
                                </TableRow >
                            ))
                        )}
                    </TableBody >
                </Table >
            </div >

    {/* 处理对话框 */ }
    < Dialog
open = { dialogState.open }
onOpenChange = {(open) =>
setDialogState({ ...dialogState, open })
                }
            >
    <DialogContent>
        <DialogHeader>
            <DialogTitle>
                {dialogState.action === 'approve' ? '通过举报' : '拒绝举报'}
            </DialogTitle>
            <DialogDescription>
                请填写处理备注（可选）
            </DialogDescription>
        </DialogHeader>
        <Textarea
            value={dialogState.remark}
            onChange={(e) =>
                setDialogState({ ...dialogState, remark: e.target.value })
            }
            placeholder=\"处理备注...\"
        rows={3}
                    />
        <DialogFooter>
            <Button
                variant=\"outline\"
            onClick={() =>
                setDialogState({
                    open: false,
                    reportId: null,
                    remark: '',
                    action: null,
                })
            }
                        >
            取消
        </Button>
        <Button onClick={handleConfirm}>
            确认
        </Button>
    </DialogFooter>
                </DialogContent >
            </Dialog >
        </div >
    )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    getArticles,
    deleteArticle,
    publishArticle,
    archiveArticle,
    unarchiveArticle,
    rebuildEmbeddings,
} from '@/lib/api'
import { ArticleSearch } from '@/components/features/ArticleSearch'
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArticleQuery } from '@/types'
import { PlusCircle, Edit, Trash2, Eye, Archive, ArchiveRestore, Send, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function ArticlesPage() {
    const router = useRouter()

    const queryClient = useQueryClient()

    const [query, setQuery] = useState<ArticleQuery>({
        current: 1,
        size: 10,
        // 不设置默认 status，让管理端接口返回所有状态的文章
    })

    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [rebuildConfirmOpen, setRebuildConfirmOpen] = useState(false)

    // 获取文章列表
    const { data, isLoading } = useQuery({
        queryKey: ['articles', query],
        queryFn: () => getArticles(query),
    })

    //删除文章
    const deleteMutation = useMutation({
        mutationFn: deleteArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] })
            toast.success('文章已删除')
            setDeleteId(null)
        },
        onError: () => {
            toast.error('删除失败')
        },
    })

    // 发布文章
    const publishMutation = useMutation({
        mutationFn: publishArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] })
            toast.success('文章已发布')
        },
    })

    // 归档文章
    const archiveMutation = useMutation({
        mutationFn: archiveArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] })
            toast.success('归档成功')
        },
    })

    // 恢复归档
    const unarchiveMutation = useMutation({
        mutationFn: unarchiveArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] })
            toast.success('已恢复')
        },
    })

    // 批量重建向量索引
    const rebuildMutation = useMutation({
        mutationFn: rebuildEmbeddings,
        onSuccess: (count) => {
            toast.success(`向量索引重建完成，共处理 ${count} 篇文章`)
            setRebuildConfirmOpen(false)
        },
        onError: (err: Error) => {
            toast.error(`重建失败：${err.message}`)
            setRebuildConfirmOpen(false)
        },
    })

    const handleSearch = (newQuery: ArticleQuery) => {
        // 直接使用新的查询参数，确保重置时不保留旧值
        setQuery({
            current: newQuery.current || 1,
            size: newQuery.size || 10,
            ...newQuery,
        })
    }

    const handlePageChange = (page: number) => {
        setQuery({ ...query, current: page })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="secondary">草稿</Badge>
            case 'PUBLISHED':
                return <Badge variant="default">已发布</Badge>
            case 'ARCHIVED':
                return <Badge variant="outline">已归档</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">文章管理</h2>
                    <p className="text-muted-foreground">管理您的博客文章</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        id="rebuild-embeddings-btn"
                        variant="outline"
                        size="sm"
                        onClick={() => setRebuildConfirmOpen(true)}
                        disabled={rebuildMutation.isPending}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${rebuildMutation.isPending ? 'animate-spin' : ''}`} />
                        重建向量
                    </Button>
                    <Button asChild>
                        <Link href="/articles/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新建文章
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 搜索筛选 */}
            <ArticleSearch onSearch={handleSearch} defaultValues={query} />

            {/* 文章列表 */}
            {isLoading ? (
                <div className="text-center py-10">加载中...</div>
            ) : !data || data.records.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    暂无文章
                </div>
            ) : (
                <>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>标题</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>浏览量</TableHead>
                                    <TableHead>评论</TableHead>
                                    <TableHead>创建时间</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.records.map((article) => (
                                    <TableRow key={article.id}>
                                        <TableCell className="font-medium">
                                            {article.title}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(article.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                                {article.viewCount}
                                            </div>
                                        </TableCell>
                                        <TableCell>{article.commentCount}</TableCell>
                                        <TableCell>
                                            {new Date(article.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* 编辑 */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link href={`/articles/${article.id}/edit`}>
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>编辑文章</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                {/* 发布/归档/恢复 */}
                                                {article.status === 'DRAFT' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => publishMutation.mutate(article.id)}
                                                            >
                                                                <Send className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>发布文章</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {article.status === 'PUBLISHED' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => archiveMutation.mutate(article.id)}
                                                            >
                                                                <Archive className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>归档文章</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {article.status === 'ARCHIVED' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => unarchiveMutation.mutate(article.id)}
                                                            >
                                                                <ArchiveRestore className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>恢复文章</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}

                                                {/* 删除 */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeleteId(article.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>删除文章</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* 分页 */}
                    {data.pages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                共 {data.total} 条记录，第 {data.current} / {data.pages} 页
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={data.current === 1}
                                    onClick={() => handlePageChange(data.current - 1)}
                                >
                                    上一页
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={data.current === data.pages}
                                    onClick={() => handlePageChange(data.current + 1)}
                                >
                                    下一页
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。确定要删除这篇文章吗？
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

            {/* 重建向量确认对话框 */}
            <AlertDialog open={rebuildConfirmOpen} onOpenChange={setRebuildConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认重建向量索引？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将对所有已发布文章重新生成 Qdrant 向量，会消耗 DashScope
                            Token 配额。文章数量较多时可能需要较长时间，请勿重复点击。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={rebuildMutation.isPending}>
                            取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => rebuildMutation.mutate()}
                            disabled={rebuildMutation.isPending}
                        >
                            {rebuildMutation.isPending ? '重建中…' : '确认重建'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

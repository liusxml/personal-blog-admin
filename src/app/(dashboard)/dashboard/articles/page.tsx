'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getArticles } from '@/lib/api'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ArticlesPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['articles'],
        queryFn: () => getArticles({ current: 1, size: 20 }),
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PUBLISHED':
                return <Badge variant="default">已发布</Badge>
            case 'DRAFT':
                return <Badge variant="secondary">草稿</Badge>
            case 'ARCHIVED':
                return <Badge variant="outline">已归档</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">文章管理</h2>
                <Link href="/dashboard/articles/create">
                    <Button>新建文章</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>文章列表</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-muted-foreground">
                            加载失败：{error instanceof Error ? error.message : '未知错误'}
                        </div>
                    ) : data?.records.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            暂无文章，点击"新建文章"开始创作
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>标题</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>分类</TableHead>
                                    <TableHead>浏览</TableHead>
                                    <TableHead>评论</TableHead>
                                    <TableHead>创建时间</TableHead>
                                    <TableHead>操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.records.map((article) => (
                                    <TableRow key={article.id}>
                                        <TableCell className="font-medium max-w-[300px] truncate">
                                            {article.title}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(article.status)}</TableCell>
                                        <TableCell>{article.categoryName || '-'}</TableCell>
                                        <TableCell>{article.viewCount}</TableCell>
                                        <TableCell>{article.commentCount}</TableCell>
                                        <TableCell>
                                            {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Link href={`/dashboard/articles/${article.id}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        编辑
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useDashboardStats } from '@/hooks/useDashboardStats'

export default function DashboardPage() {
    const { metrics, healthData, isLoading } = useDashboardStats()

    const systemStatus = healthData?.status || 'UNKNOWN'
    const isHealthy = systemStatus === 'UP'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">仪表盘</h2>

                {/* 系统状态指示器 */}
                <Badge variant={isHealthy ? 'default' : 'destructive'}>
                    {isHealthy ? '✅ 系统正常' : '❌ 系统异常'}
                </Badge>
            </div>

            {/* 统计卡片 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 文章总数 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">文章总数</CardTitle>
                        <span className="text-2xl">📝</span>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{metrics?.articlesTotal ?? 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    已发布 {metrics?.articlesPublished ?? 0} 篇
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* 评论总数 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">评论总数</CardTitle>
                        <span className="text-2xl">💬</span>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{metrics?.commentsTotal ?? 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    待审核 {metrics?.commentsPending ?? 0} 条
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* 系统状态 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                        <span className="text-2xl">💚</span>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{systemStatus}</div>
                                <p className="text-xs text-muted-foreground">
                                    数据库: {healthData?.components?.db?.status || '-'}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Redis 状态 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">缓存状态</CardTitle>
                        <span className="text-2xl">⚡</span>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {healthData?.components?.redis?.status || '-'}
                                </div>
                                <p className="text-xs text-muted-foreground">Redis 缓存</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 欢迎卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle>欢迎使用 SX Lab Admin</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        这是博客后台管理系统的仪表盘页面。您可以在这里查看博客的实时统计数据。
                    </p>
                    <p className="mt-4 text-muted-foreground">
                        使用左侧菜单导航到不同的管理页面：
                    </p>
                    <ul className="mt-2 list-disc list-inside text-muted-foreground">
                        <li>文章管理 - 创建、编辑和删除博客文章</li>
                        <li>评论管理 - 审核和管理用户评论</li>
                        <li>文件管理 - 上传和管理媒体文件</li>
                    </ul>

                    <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium">📊 实时数据刷新</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            • 业务指标每 30 秒自动刷新<br />
                            • 系统健康状态每 60 秒自动刷新
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

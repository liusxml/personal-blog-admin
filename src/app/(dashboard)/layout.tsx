'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AiAssistantDialog } from '@/components/features/AiAssistantDialog'
import { Bot } from 'lucide-react'

const menuItems = [
    { title: '仪表盘', href: '/dashboard', icon: '📊' },
    { title: '文章管理', href: '/articles', icon: '📝' },
    { title: '分类管理', href: '/categories', icon: '📁' },
    { title: '标签管理', href: '/tags', icon: '🏷️' },
    { title: '评论管理', href: '/comments', icon: '💬' },
    { title: '文件管理', href: '/files', icon: '📦' },
    { title: 'Ops Copilot', href: '/ops', icon: '🤖' },
    { title: '容器监控', href: '/containers', icon: '🖥️' },
]

function AppSidebar({ onOpenAi }: { onOpenAi: () => void }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAuthStore()

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    return (
        <Sidebar>
            <SidebarHeader className="border-b p-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <span
                        className="text-xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #FF6B35 0%, #FFA500 50%, #FFD700 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        SX Lab Admin
                    </span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="p-2">
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton asChild isActive={pathname === item.href}>
                                <Link href={item.href}>
                                    <span className="mr-2">{item.icon}</span>
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <div className="flex flex-col gap-2">
                    {/* AI 助手入口 */}
                    <Button
                        id="ai-assistant-trigger"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 border-dashed"
                        onClick={onOpenAi}
                    >
                        <Bot className="h-4 w-4 text-primary" />
                        <span>AI 助手</span>
                        <span className="ml-auto text-xs text-muted-foreground">✨</span>
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        {user?.nickname || user?.username || '未登录'}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        退出登录
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [aiOpen, setAiOpen] = useState(false)

    return (
        <SidebarProvider>
            <AppSidebar onOpenAi={() => setAiOpen(true)} />
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b px-6">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-6" />
                    <h1 className="text-lg font-semibold">博客后台管理</h1>
                </header>
                {/* 容器监控页面不要 padding，其他页面保持 p-6 */}
                <main className={pathname === '/containers' ? 'flex-1 overflow-hidden' : 'flex-1 p-6'}>
                    {children}
                </main>
            </SidebarInset>
            {/* 全局 AI 助手弹窗 */}
            <AiAssistantDialog open={aiOpen} onOpenChange={setAiOpen} />
        </SidebarProvider>
    )
}

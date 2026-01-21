'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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

const menuItems = [
    { title: '仪表盘', href: '/dashboard', icon: '📊' },
    { title: '文章管理', href: '/articles', icon: '📝' },
    { title: '分类管理', href: '/categories', icon: '📁' },
    { title: '标签管理', href: '/tags', icon: '🏷️' },
    { title: '评论管理', href: '/comments', icon: '💬' },
    { title: '文件管理', href: '/files', icon: '📦' },
]

function AppSidebar() {
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
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b px-6">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-6" />
                    <h1 className="text-lg font-semibold">博客后台管理</h1>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    )
}

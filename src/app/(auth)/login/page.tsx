'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { login } from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
    username: z.string().min(1, '请输入用户名'),
    password: z.string().min(1, '请输入密码'),
})

export default function LoginPage() {
    const router = useRouter()
    const { login: storeLogin } = useAuthStore()
    const [formData, setFormData] = useState({ username: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        const result = loginSchema.safeParse(formData)
        if (!result.success) {
            setError(result.error.issues[0].message)
            return
        }

        setLoading(true)
        try {
            console.log('开始登录...')
            const response = await login(formData)
            console.log('登录响应:', response)

            // 传入 expiresIn 参数（后端返回的过期时间，单位：秒）
            storeLogin(response.user, response.token, response.expiresIn)
            console.log('已保存用户信息和 token')

            // 使用 setTimeout 确保状态更新完成后再跳转
            setTimeout(() => {
                console.log('准备跳转到 /dashboard')
                router.push('/dashboard')

                // 备用方案：如果 router.push 失败，使用 window.location
                setTimeout(() => {
                    if (window.location.pathname === '/login') {
                        console.warn('router.push 似乎没有工作，使用 window.location.href')
                        window.location.href = '/dashboard'
                    }
                }, 500)
            }, 100)
        } catch (err) {
            console.error('登录错误:', err)
            setError(err instanceof Error ? err.message : '登录失败')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">
                        <span
                            style={{
                                background: 'linear-gradient(135deg, #FF6B35 0%, #FFA500 50%, #FFD700 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            SX Lab Admin
                        </span>
                    </CardTitle>
                    <CardDescription>登录到博客后台管理系统</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">用户名</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="请输入用户名"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">密码</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="请输入密码"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '登录中...' : '登录'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

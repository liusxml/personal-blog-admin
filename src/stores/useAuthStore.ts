import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import type { User } from '@/types'
import { logout as apiLogout } from '@/lib/api'

interface AuthState {
    user: User | null
    token: string | null
    tokenExpiresAt: number | null  // Token 过期时间戳
    isAuthenticated: boolean
    login: (user: User, token: string, expiresIn: number) => void
    logout: () => Promise<void>
    setUser: (user: User) => void
    isTokenExpired: () => boolean  // 检查 token 是否过期
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            tokenExpiresAt: null,
            isAuthenticated: false,

            // 登录：存储到 localStorage 和 Cookie
            login: (user, token, expiresIn) => {
                // 计算过期时间戳（24 小时 = 86400 秒）
                const expiresAt = Date.now() + expiresIn * 1000

                // 存储到 localStorage
                localStorage.setItem('token', token)
                localStorage.setItem('tokenExpiresAt', expiresAt.toString())

                // 存储到 Cookie（供 middleware 使用，24 小时过期）
                Cookies.set('token', token, { expires: 1 })

                set({
                    user,
                    token,
                    tokenExpiresAt: expiresAt,
                    isAuthenticated: true
                })
            },

            // 登出：调用后端 API 并清除本地数据
            logout: async () => {
                try {
                    // 调用后端登出 API
                    await apiLogout()
                } catch (error) {
                    console.error('登出 API 调用失败:', error)
                    // 即使后端失败也继续清除本地数据
                } finally {
                    // 清除 localStorage
                    localStorage.removeItem('token')
                    localStorage.removeItem('tokenExpiresAt')

                    // 清除 Cookie
                    Cookies.remove('token')

                    // 清除 Zustand 状态
                    set({
                        user: null,
                        token: null,
                        tokenExpiresAt: null,
                        isAuthenticated: false
                    })
                }
            },

            setUser: (user) => set({ user }),

            // 检查 token 是否过期
            isTokenExpired: () => {
                const { tokenExpiresAt } = get()
                if (!tokenExpiresAt) return true
                return Date.now() > tokenExpiresAt
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                tokenExpiresAt: state.tokenExpiresAt,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
)

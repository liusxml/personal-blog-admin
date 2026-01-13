import type {
    ApiResponse,
    PageResult,
    Article,
    ArticleQuery,
    ArticleInput,
    LoginRequest,
    LoginResponse,
    User,
    CommentTreeVO,
    Comment,
    CommentInput,
    CommentReport,
    ReportActionRequest,
    PreSignedUploadVO,
    FileVO,
    FileUploadRequest,
    FileAccessUrlVO
} from '@/types'
import Cookies from 'js-cookie'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// 获取 token
function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
}

// 带认证的 fetch
export async function fetchWithAuth<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken()

    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    })

    // 检测 Token 过期（401 Unauthorized）
    if (res.status === 401) {
        // 清除本地数据
        localStorage.removeItem('token')
        localStorage.removeItem('tokenExpiresAt')
        Cookies.remove('token')

        // 跳转到登录页
        if (typeof window !== 'undefined') {
            window.location.href = '/login'
        }

        throw new Error('登录已过期，请重新登录')
    }

    const json: ApiResponse<T> = await res.json()

    // 后端成功响应：code 为 0 或 '200'
    // 0 表示成功（Spring Boot 默认）
    // '200' 表示成功（某些自定义配置）
    if (json.code !== 0 && json.code !== '200') {
        throw new Error(json.message || '请求失败')
    }

    return json.data
}

// ==================== 认证 API ====================

export async function login(data: LoginRequest): Promise<LoginResponse> {
    return fetchWithAuth<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export async function logout(): Promise<void> {
    return fetchWithAuth<void>('/api/v1/auth/logout', {
        method: 'POST',
    })
}

export async function getCurrentUser(): Promise<User> {
    return fetchWithAuth<User>('/api/v1/users/me')
}


// ==================== 文章 API ====================

export async function getArticles(query: ArticleQuery = {}): Promise<PageResult<Article>> {
    const params = new URLSearchParams()
    if (query.current) params.append('current', String(query.current))
    if (query.size) params.append('size', String(query.size))
    if (query.keyword) params.append('keyword', query.keyword)
    if (query.status) params.append('status', query.status)
    if (query.categoryId) params.append('categoryId', String(query.categoryId))
    if (query.tag) params.append('tag', query.tag)

    const queryString = params.toString()
    return fetchWithAuth<PageResult<Article>>(`/api/v1/admin/articles${queryString ? `?${queryString}` : ''}`)
}

export async function getArticleById(id: number): Promise<Article> {
    return fetchWithAuth<Article>(`/api/v1/admin/articles/${id}`)
}

export async function createArticle(data: Partial<Article>): Promise<number> {
    return fetchWithAuth<number>('/api/v1/admin/articles', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export async function updateArticle(id: number, data: Partial<Article>): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, id }),
    })
}

export async function deleteArticle(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/articles/${id}`, {
        method: 'DELETE',
    })
}

export async function publishArticle(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/articles/${id}/publish`, {
        method: 'POST',
    })
}

export async function archiveArticle(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/articles/${id}/archive`, {
        method: 'POST',
    })
}

export async function unarchiveArticle(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/articles/${id}/unarchive`, {
        method: 'POST',
    })
}

// ==================== 评论 API ====================

export async function getCommentTree(targetType: string, targetId: number): Promise<CommentTreeVO[]> {
    return fetchWithAuth<CommentTreeVO[]>(
        `/api/v1/comments/tree?targetType=${targetType}&targetId=${targetId}`
    )
}

export async function deleteComment(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/${id}`, {
        method: 'DELETE',
    })
}

export async function getReports(status?: string): Promise<PageResult<CommentReport>> {
    const queryString = status ? `?status=${status}` : ''
    return fetchWithAuth<PageResult<CommentReport>>(`/api/v1/comments/reports${queryString}`)
}

export async function approveReport(reportId: number, data?: ReportActionRequest): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/reports/${reportId}/approve`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    })
}

export async function rejectReport(reportId: number, data?: ReportActionRequest): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/reports/${reportId}/reject`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    })
}

// ==================== 文件 API ====================

export async function generateUploadUrl(fileName: string, mimeType: string): Promise<PreSignedUploadVO> {
    const data: FileUploadRequest = { fileName, mimeType }
    return fetchWithAuth<PreSignedUploadVO>('/api/v1/files/presigned', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export async function confirmUpload(fileId: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/files/${fileId}/confirm`, {
        method: 'PATCH',
    })
}

export async function getFileAccessUrl(id: number, expireMinutes?: number): Promise<string> {
    const queryString = expireMinutes ? `?expireMinutes=${expireMinutes}` : ''
    const data = await fetchWithAuth<FileAccessUrlVO>(`/api/v1/files/${id}/access-url${queryString}`)
    return data.accessUrl
}

export async function deleteFile(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/files/${id}`, {
        method: 'DELETE',
    })
}

export async function getFiles(query?: { current?: number; size?: number }): Promise<PageResult<FileVO>> {
    const params = new URLSearchParams()
    if (query?.current) params.append('current', String(query.current))
    if (query?.size) params.append('size', String(query.size))

    const queryString = params.toString()
    return fetchWithAuth<PageResult<FileVO>>(`/api/v1/files${queryString ? `?${queryString}` : ''}`)
}

// ==================== Actuator Metrics ====================
export interface ActuatorMetric {
    name: string
    description?: string
    baseUnit?: string
    measurements: Array<{
        statistic: string
        value: number
    }>
    availableTags: Array<{
        tag: string
        values: string[]
    }>
}

export interface MetricsList {
    names: string[]
}

export interface DashboardMetrics {
    articlesTotal: number
    articlesPublished: number
    commentsTotal: number
    commentsPending: number
}

// 直接访问 Actuator 端点（后端已配置为白名单，无需认证）
// 注意: Actuator 端点直接访问 8080 端口，不经过 Next.js 代理
async function fetchActuator<T>(path: string): Promise<T> {
    const actuatorBaseUrl = typeof window !== 'undefined'
        ? 'http://localhost:8080'  // 浏览器端直接访问后端
        : API_BASE_URL                // 服务端使用配置的 URL

    const res = await fetch(`${actuatorBaseUrl}${path}`)
    if (!res.ok) {
        throw new Error(`Actuator request failed: ${res.statusText}`)
    }
    return res.json()
}

// 获取所有指标列表
export async function getMetricsList(): Promise<MetricsList> {
    return fetchActuator<MetricsList>('/actuator/metrics')
}

// 获取具体指标
export async function getMetric(name: string, tags?: Record<string, string>): Promise<ActuatorMetric> {
    const tagParams = tags
        ? '?' + Object.entries(tags).map(([k, v]) => `tag = ${k}:${v} `).join('&')
        : ''
    return fetchActuator<ActuatorMetric>(`/ actuator / metrics / ${name}${tagParams} `)
}

// 获取仪表盘统计数据（从 Micrometer 业务指标）
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const [articlesTotal, articlesPublished, commentsTotal, commentsPending] = await Promise.all([
        getMetric('blog.articles.total.count').catch(() => null),
        getMetric('blog.articles.published.count').catch(() => null),
        getMetric('blog.comments.total.count').catch(() => null),
        getMetric('blog.comments.pending.count').catch(() => null),
    ])

    return {
        articlesTotal: articlesTotal?.measurements.find(m => m.statistic === 'VALUE')?.value ?? 0,
        articlesPublished: articlesPublished?.measurements.find(m => m.statistic === 'VALUE')?.value ?? 0,
        commentsTotal: commentsTotal?.measurements.find(m => m.statistic === 'VALUE')?.value ?? 0,
        commentsPending: commentsPending?.measurements.find(m => m.statistic === 'VALUE')?.value ?? 0,
    }
}

// 获取健康状态
export async function getHealth(): Promise<any> {
    return fetchActuator<any>('/actuator/health')
}



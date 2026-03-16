import type {
    ApiResponse,
    PageResult,
    Article,
    ArticleQuery,
    ArticleInput,
    ArticleListVO,
    ArticleDetailVO,
    LoginRequest,
    LoginResponse,
    User,
    CommentTreeVO,
    CommentVO,
    CommentInput,
    CommentReportVO,
    CommentQuery,
    CommentAuditInput,
    ReportActionRequest,
    PreSignedUploadVO,
    FileVO,
    CategoryVO,
    CategoryTreeVO,
    CategoryInput,
    TagVO,
    TagInput,
    TagQuery
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

/**
 * 获取随机必应壁纸
 * 
 * 从近7天的必应壁纸中随机返回一张，用于文章封面选择
 * 
 * @returns 壁纸URL
 * @throws Error 当获取失败时
 */
export async function fetchBingWallpaper(): Promise<string> {
    const response = await fetchWithAuth<string>('/api/v1/admin/wallpapers/bing')
    return response
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

export async function getArticles(query: ArticleQuery = {}): Promise<PageResult<ArticleListVO>> {
    const params = new URLSearchParams()
    if (query.current) params.append('current', String(query.current))
    if (query.size) params.append('size', String(query.size))
    if (query.keyword) params.append('keyword', query.keyword)
    if (query.status !== undefined) params.append('status', String(query.status))
    if (query.categoryId) params.append('categoryId', String(query.categoryId))
    if (query.tagId) params.append('tagId', String(query.tagId))
    if (query.authorId) params.append('authorId', String(query.authorId))

    const queryString = params.toString()
    // 使用管理端接口（支持查询所有状态）
    return fetchWithAuth<PageResult<any>>(
        `/api/v1/admin/articles${queryString ? `?${queryString}` : ''}`
    ).then(pageResult => {
        if (!pageResult) {
            return {
                records: [],
                total: 0,
                size: query.size || 10,
                current: query.current || 1,
                pages: 0
            }
        }

        // 转换后端数据格式
        return {
            records: (pageResult.records || []).map((item: any) => ({
                ...item,
                // ID保持为字符串，避免精度丢失（Long类型超过JavaScript安全整数范围）
                id: item.id,  // 不转换为number！
                // status 后端已经返回，保持不变
                status: item.status || (item.publishTime ? 'PUBLISHED' : 'DRAFT'),
                // 添加缺失的 createdAt
                createdAt: item.createdAt || item.publishTime || item.updateTime,
                viewCount: item.viewCount || 0,
                commentCount: item.commentCount || 0,
            })),
            // 转换字符串为数字（分页参数）
            total: typeof pageResult.total === 'string' ? parseInt(pageResult.total) : pageResult.total,
            size: typeof pageResult.size === 'string' ? parseInt(pageResult.size) : pageResult.size,
            current: typeof pageResult.current === 'string' ? parseInt(pageResult.current) : pageResult.current,
            pages: typeof pageResult.pages === 'string' ? parseInt(pageResult.pages) : pageResult.pages,
        }
    })
}

export async function getArticleById(id: string): Promise<ArticleDetailVO> {
    // fetchWithAuth 已经返回了 json.data，不需要再次取 .data
    return fetchWithAuth<ArticleDetailVO>(
        `/api/v1/admin/articles/${id}`
    )
}

export async function createArticle(data: ArticleInput): Promise<string> {
    // 转换 boolean 为 Integer (0/1)
    const payload = {
        ...data,
        isTop: data.isTop ? 1 : 0,
        isFeatured: data.isFeatured ? 1 : 0,
        isCommentDisabled: data.isCommentDisabled ? 1 : 0,
    }

    return fetchWithAuth<ApiResponse<string>>('/api/v1/admin/articles', {
        method: 'POST',
        body: JSON.stringify(payload),
    }).then(res => res.data)
}

export async function updateArticle(id: string, data: ArticleInput): Promise<void> {
    // 转换 boolean 为 Integer (0/1)
    const payload = {
        ...data,
        id,
        isTop: data.isTop ? 1 : 0,
        isFeatured: data.isFeatured ? 1 : 0,
        isCommentDisabled: data.isCommentDisabled ? 1 : 0,
    }

    return fetchWithAuth<ApiResponse<void>>(`/api/v1/admin/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    }).then(() => undefined)
}

export async function deleteArticle(id: string): Promise<void> {
    return fetchWithAuth<ApiResponse<void>>(`/api/v1/admin/articles/${id}`, {
        method: 'DELETE',
    }).then(() => undefined)
}

export async function publishArticle(id: string): Promise<void> {
    return fetchWithAuth<ApiResponse<void>>(`/api/v1/admin/articles/${id}/publish`, {
        method: 'POST',
    }).then(() => undefined)
}

export async function archiveArticle(id: string): Promise<void> {
    return fetchWithAuth<ApiResponse<void>>(`/api/v1/admin/articles/${id}/archive`, {
        method: 'POST',
    }).then(() => undefined)
}

export async function unarchiveArticle(id: string): Promise<void> {
    return fetchWithAuth<ApiResponse<void>>(`/api/v1/admin/articles/${id}/unarchive`, {
        method: 'POST',
    }).then(() => undefined)
}

// ==================== 评论 API ====================

// 获取评论树（按目标查询）
export async function getCommentTree(
    targetType: string,
    targetId: string
): Promise<CommentTreeVO[]> {
    return fetchWithAuth<CommentTreeVO[]>(
        `/api/v1/comments/tree?targetType=${targetType}&targetId=${targetId}`
    )
}

//审核通过评论（管理员）
export async function approveComment(id: string): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/audit/${id}/approve`, {
        method: 'POST',
    })
}

// 审核拒绝评论（管理员）
export async function rejectComment(
    id: string,
    reason: string
): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/audit/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    })
}

// 管理员删除评论
export async function deleteCommentByAdmin(
    id: string,
    reason: string
): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/audit/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
    })
}

// 获取举报列表
export async function getCommentReports(
    status?: string
): Promise<CommentReportVO[]> {
    const queryString = status ? `?status=${status}` : ''
    return fetchWithAuth<CommentReportVO[]>(`/api/v1/comments/reports${queryString}`)
}

// 审核通过举报
export async function approveReport(
    reportId: string,
    remark?: string
): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/reports/${reportId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ remark: remark || '' }),
    })
}

// 审核拒绝举报
export async function rejectReport(
    reportId: string,
    remark?: string
): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/comments/reports/${reportId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ remark: remark || '' }),
    })
}

// 获取评论列表（管理端分页）
export async function getComments(params: {
    pageNum?: number
    pageSize?: number
    status?: string
    targetType?: string
}): Promise<PageResult<CommentVO>> {
    const queryParams = new URLSearchParams()
    if (params.pageNum) queryParams.append('pageNum', params.pageNum.toString())
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    if (params.status) queryParams.append('status', params.status)
    if (params.targetType) queryParams.append('targetType', params.targetType)

    return fetchWithAuth<PageResult<CommentVO>>(
        `/api/v1/admin/comments?${queryParams.toString()}`
    )
}


// ==================== 文件 API ====================

// 分页查询文件列表
export async function getFiles(params: {
    pageNum?: number
    pageSize?: number
    fileCategory?: string
    storageType?: string
}): Promise<PageResult<FileVO>> {
    const queryParams = new URLSearchParams()
    if (params.pageNum) queryParams.append('pageNum', params.pageNum.toString())
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    if (params.fileCategory) queryParams.append('fileCategory', params.fileCategory)
    if (params.storageType) queryParams.append('storageType', params.storageType)

    return fetchWithAuth<PageResult<FileVO>>(
        `/api/v1/files?${queryParams.toString()}`
    )
}

// 生成预签名上传URL
export async function generateUploadUrl(request: {
    fileName: string
    fileSize: number
    contentType: string
    md5?: string
}): Promise<PreSignedUploadVO> {
    return fetchWithAuth<PreSignedUploadVO>('/api/v1/files/presigned', {
        method: 'POST',
        body: JSON.stringify(request),
    })
}

// 直接上传到S4存储
export async function uploadToS4(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    })

    if (!res.ok) {
        throw new Error(`上传失败: ${res.statusText}`)
    }
}

// 确认上传完成
export async function confirmUpload(fileId: string): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/files/${fileId}/confirm`, {
        method: 'PATCH',
    })
}

// 获取文件访问URL
export async function getFileAccessUrl(id: string, expireMinutes?: number): Promise<string> {
    const queryString = expireMinutes ? `?expireMinutes=${expireMinutes}` : ''
    return fetchWithAuth<string>(`/api/v1/files/${id}/access-url${queryString}`)
}

// 删除文件
export async function deleteFile(id: string): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/files/${id}`, {
        method: 'DELETE',
    })
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

// 访问 Actuator 端点（通过 Next.js rewrites 代理到后端）
async function fetchActuator<T>(path: string): Promise<T> {
    const res = await fetch(path)
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
        ? '?' + Object.entries(tags).map(([k, v]) => `tag=${k}:${v}`).join('&')
        : ''
    return fetchActuator<ActuatorMetric>(`/actuator/metrics/${name}${tagParams}`)
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

// ==================== 分类 API ====================

export async function getCategoryTree(): Promise<import('@/types').CategoryTreeVO[]> {
    return fetchWithAuth<import('@/types').CategoryTreeVO[]>('/api/v1/admin/categories/tree')
}

export async function getCategoryById(id: string): Promise<import('@/types').CategoryVO> {
    return fetchWithAuth<import('@/types').CategoryVO>(`/api/v1/admin/categories/${id}`)
}

export async function createCategory(data: import('@/types').CategoryInput): Promise<string> {
    return fetchWithAuth<string>('/api/v1/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export async function updateCategory(id: string, data: import('@/types').CategoryInput): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export async function deleteCategory(id: string): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
    })
}

export async function moveCategory(
    id: string,
    newParentId?: string,
    newSortOrder?: number
): Promise<void> {
    const params = new URLSearchParams()
    if (newParentId) params.append('newParentId', newParentId)
    if (newSortOrder !== undefined) params.append('newSortOrder', String(newSortOrder))

    return fetchWithAuth<void>(
        `/api/v1/admin/categories/${id}/move?${params.toString()}`,
        { method: 'PUT' }
    )
}

// ==================== 标签 API ====================

export async function getTags(query: import('@/types').TagQuery = {}): Promise<PageResult<import('@/types').TagVO>> {
    const params = new URLSearchParams()
    if (query.current) params.append('current', String(query.current))
    if (query.size) params.append('size', String(query.size))
    if (query.name) params.append('name', query.name)

    const queryString = params.toString()
    return fetchWithAuth<PageResult<import('@/types').TagVO>>(
        `/api/v1/admin/tags${queryString ? `?${queryString}` : ''}`
    )
}

export async function getTagById(id: string): Promise<import('@/types').TagVO> {
    return fetchWithAuth<import('@/types').TagVO>(`/api/v1/admin/tags/${id}`)
}

export async function createTag(data: import('@/types').TagInput): Promise<string> {
    return fetchWithAuth<string>('/api/v1/admin/tags', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export async function batchCreateTags(names: string[]): Promise<string[]> {
    return fetchWithAuth<string[]>('/api/v1/admin/tags/batch', {
        method: 'POST',
        body: JSON.stringify(names),
    })
}

export async function updateTag(id: string, data: import('@/types').TagInput): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export async function deleteTag(id: string): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/tags/${id}`, {
        method: 'DELETE',
    })
}

export async function mergeTags(sourceId: string, targetId: string): Promise<void> {
    return fetchWithAuth<void>(`/api/v1/admin/tags/${sourceId}/merge?targetTagId=${targetId}`, {
        method: 'POST',
    })
}

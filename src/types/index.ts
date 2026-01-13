// API 类型定义

// 通用分页响应
export interface PageResult<T> {
    records: T[]
    total: number
    size: number
    current: number
    pages: number
}

// 通用 API 响应
export interface ApiResponse<T> {
    code: string | number  // 后端可能返回 0 或 '200'
    message: string
    data: T
}

// 用户相关
export interface User {
    id: number
    username: string
    nickname: string
    email: string
    avatar?: string
    roleKeys: string[]
    createdAt: string
}

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    token: string
    tokenType: string
    expiresIn: number
    user: User
}

// 文章相关
export interface Article {
    id: number
    title: string
    summary?: string
    content?: string
    contentHtml?: string
    coverImage?: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    authorId: number
    authorName?: string
    viewCount: number
    commentCount: number
    categoryId?: number
    categoryName?: string
    tags?: string[]
    publishTime?: string
    createdAt: string
    updatedAt: string
}

export interface ArticleQuery {
    current?: number
    size?: number
    keyword?: string
    status?: string
    categoryId?: number
    tag?: string
}

export interface ArticleInput {
    title: string
    summary?: string
    content: string
    coverImage?: string
    status: 'DRAFT' | 'PUBLISHED'
    categoryId?: number
    tags?: string[]
}

// 评论相关
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED'

export interface Comment {
    id: number
    content: string
    targetType: 'ARTICLE' | 'PAGE'
    targetId: number
    parentId?: number
    authorId: number
    authorName: string
    authorAvatar?: string
    status: CommentStatus
    likeCount: number
    createdAt: string
    updatedAt: string
}

// 评论树节点
export interface CommentTreeVO {
    id: number
    content: string
    authorId: number
    authorName: string
    authorAvatar?: string
    likeCount: number
    status: CommentStatus
    createdAt: string
    children: CommentTreeVO[]
}

// 文件相关
export interface FileInfo {
    id: number
    filename: string
    originalName: string
    url: string
    size: number
    mimeType: string
    createdAt: string
}

// 预签名上传响应
export interface PreSignedUploadVO {
    fileId: number
    uploadUrl: string
    objectKey: string
    expireAt: string
}

// 文件 VO（更新）
export interface FileVO {
    id: number
    fileName: string
    originalName: string
    objectKey: string
    fileSize: number
    mimeType: string
    status: 'PENDING' | 'COMPLETED'
    createdAt: string
}

// 分类相关
export interface Category {
    id: number
    name: string
    slug: string
    description?: string
    parentId?: number
    articleCount?: number
}

// 标签相关
export interface Tag {
    id: number
    name: string
    slug: string
    articleCount?: number
}

// 文章状态类型别名
export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

// 评论输入
export interface CommentInput {
    targetType: 'ARTICLE' | 'PAGE'
    targetId: number
    content: string
    parentId?: number
}

// 评论举报
export interface CommentReport {
    id: number
    commentId: number
    reporterId: number
    reporterName: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
}

// 举报操作请求
export interface ReportActionRequest {
    remark?: string
}

// 文件上传请求
export interface FileUploadRequest {
    fileName: string
    mimeType: string
}

// 访问 URL 响应
export interface FileAccessUrlVO {
    accessUrl: string
    expireAt: string
}

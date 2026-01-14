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
    id: string  // Long类型，使用string避免精度丢失
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
    id: string  // Long类型，使用string避免精度丢失
    title: string
    summary?: string
    content?: string
    contentHtml?: string
    coverImage?: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    authorId: string  // Long类型
    authorName?: string
    viewCount: number
    commentCount: number
    categoryId?: string  // Long类型
    categoryName?: string
    tags?: string[]
    publishTime?: string
    createdAt: string
    updatedAt: string
}

// 文章列表 VO
export interface ArticleListVO {
    id: string  // Long类型，使用string避免精度丢失
    title: string
    summary?: string
    coverImage?: string
    status: ArticleStatus
    authorId: string  // Long类型
    authorName?: string
    viewCount: number
    commentCount: number
    categoryId?: string  // Long类型
    categoryName?: string
    tags?: string[]
    publishTime?: string
    createdAt: string
    updatedAt: string
}

// 文章详情 VO
export interface ArticleDetailVO {
    id: string  // Long类型，使用string避免精度丢失
    title: string
    summary?: string
    content: string
    coverImage?: string
    status: ArticleStatus
    authorId: string  // Long类型
    authorName?: string
    authorAvatar?: string
    viewCount: number
    commentCount: number
    categoryId?: string  // Long类型
    categoryName?: string
    tags?: string[]
    type?: ArticleType
    originalUrl?: string
    isTop?: 0 | 1
    isFeatured?: 0 | 1
    isCommentDisabled?: 0 | 1
    publishTime?: string
    createdAt: string
    updatedAt: string
}

// 文章状态
export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

// 文章类型
export type ArticleType = 1 | 2 | 3  // 1-原创, 2-转载, 3-翻译

// 文章查询参数
export interface ArticleQuery {
    current?: number
    size?: number
    keyword?: string
    status?: 0 | 2 | 3  // 0-草稿(DRAFT), 2-已发布(PUBLISHED), 3-已归档(ARCHIVED)
    categoryId?: number
    tagId?: number
    authorId?: number
}

// 文章创建/更新 DTO
export interface ArticleInput {
    id?: number  // 更新时必填
    title: string
    summary?: string
    content: string
    coverImageId?: number
    categoryId?: number
    tagIds?: number[]
    type?: ArticleType
    originalUrl?: string
    isTop?: 0 | 1
    isFeatured?: 0 | 1
    isCommentDisabled?: 0 | 1
    password?: string
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

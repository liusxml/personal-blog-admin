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
    categoryId?: string  // 改为 string
    tagIds?: string[]    // 改为 string[]
    type?: ArticleType
    originalUrl?: string
    isTop?: 0 | 1
    isFeatured?: 0 | 1
    isCommentDisabled?: 0 | 1
    password?: string
}

// ==================== 评论相关 ====================

// 评论状态
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED'

// 评论目标类型
export type CommentTargetType = 'ARTICLE' | 'PAGE'

// 评论基础 VO
export interface CommentVO {
    id: string  // Long类型，使用string避免精度丢失
    targetType: CommentTargetType
    targetId: string  // Long类型
    parentId?: string  // Long类型
    content: string
    status: CommentStatus
    likeCount: number
    replyCount: number
    createBy: string  // Long类型
    createTime: string
    updateTime: string
}

// 评论树形结构 VO
export interface CommentTreeVO {
    id: string  // Long类型，使用string避免精度丢失
    targetType: CommentTargetType
    targetId: string  // Long类型
    parentId?: string  // Long类型
    rootId?: string  // Long类型
    content: string
    status: CommentStatus
    likeCount: number
    replyCount: number
    createBy: string  // Long类型
    createTime: string
    updateTime: string
    // 树形结构字段
    path?: string  // 物化路径
    depth: number  // 深度 (0=根评论)
    children: CommentTreeVO[]  // 子评论列表
}

// 评论查询参数
export interface CommentQuery {
    current?: number
    size?: number
    keyword?: string
    status?: CommentStatus
    targetType?: CommentTargetType
    targetId?: string
}

// 评论审核输入
export interface CommentAuditInput {
    reason?: string  // 拒绝原因或管理员备注
}

// 评论举报 VO
export interface CommentReportVO {
    id: string  // Long类型
    commentId: string  // Long类型
    comment?: CommentVO  // 被举报的评论信息
    reporterId: string  // Long类型
    reporterName?: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    adminRemark?: string
    createdAt: string
    updatedAt: string
}

// 评论创建输入
export interface CommentInput {
    targetType: CommentTargetType
    targetId: string
    content: string
    parentId?: string  // 回复评论时填写
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

// ==================== 文件相关 ====================

// 文件 VO (从后端映射)
export interface FileVO {
    id: string                    // Long -> String
    fileKey: string               // 存储键
    storageType: string           // 存储类型 (BITIFUL)
    bucket?: string               // Bucket名称
    originalName: string          // 原始文件名
    fileSize: number              // 文件大小（字节）
    contentType: string           // MIME类型
    extension: string             // 扩展名
    fileCategory: string          // 文件分类 (IMAGE/VIDEO/DOCUMENT/OTHER)
    imageWidth?: number           // 图片宽度
    imageHeight?: number          // 图片高度
    refType?: string              // 引用类型
    refId?: string                // 引用对象ID (Long -> String)
    cdnUrl?: string               // CDN URL
    accessPolicy: string          // 访问策略
    uploadStatus: number          // 0=待上传,1=已完成,2=失败
    downloadCount: number         // 下载次数
    viewCount: number             // 查看次数
    createTime: string            // 创建时间
    createBy: string              // 创建人ID (Long -> String)
}

// 预签名上传请求
export interface PreSignedUrlRequest {
    fileName: string
    fileSize: number
    contentType: string
    md5?: string
    expireMinutes?: number
}

// 预签名上传响应
export interface PreSignedUploadVO {
    uploadUrl: string             // 预签名PUT URL
    fileKey: string               // 存储键
    fileId: string                // 文件ID (Long -> String)
    expireSeconds: number         // 有效期（秒）
    callbackUrl: string           // 回调URL
    instant?: boolean             // 是否秒传
}

// 文件查询参数
export interface FileQuery {
    pageNum: number
    pageSize: number
    fileCategory?: string
    storageType?: string
}

// 举报操作请求
export interface ReportActionRequest {
    remark?: string
}

// ==================== 分类相关 ====================

export interface CategoryVO {
    id: string  // Long类型
    name: string
    slug: string
    description?: string
    parentId?: string  // Long类型
    sortOrder: number
    articleCount: number
    createdAt: string
    updatedAt: string
}

export interface CategoryTreeVO extends CategoryVO {
    children?: CategoryTreeVO[]
    level?: number
}

export interface CategoryInput {
    id?: string
    name: string
    slug: string
    description?: string
    parentId?: string
    sortOrder?: number
}

// ==================== 标签相关 ====================

export interface TagVO {
    id: string  // Long类型
    name: string
    slug: string
    description?: string
    color?: string
    articleCount: number
    createdAt: string
    updatedAt: string
}

export interface TagInput {
    id?: string
    name: string
    slug: string
    description?: string
    color?: string
}

export interface TagQuery {
    current?: number
    size?: number
    name?: string
}

// ==================== Ops AI Agent 相关 ====================

/** AI 回复的聊天消息（对应后端 event: message） */
export interface OpsMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

/** 工具调用通知（对应后端 event: tool_call） */
export interface OpsToolCall {
    toolName: string
    timestamp: number
}

/** SSE 流状态 */
export type OpsStreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

/** useOpsStream hook 返回值 */
export interface OpsStreamState {
    /** AI 逐字流式回复内容（拼接中） */
    streamingText: string
    /** 终端输出行（来自 event: ops_log） */
    terminalLines: string[]
    /** 最近一次工具调用（来自 event: tool_call） */
    latestToolCall: OpsToolCall | null
    /** 当前流状态 */
    status: OpsStreamStatus
    /** 错误信息 */
    error: string | null
    /** 发送用户指令，开启新的 SSE 流 */
    send: (message: string) => void
    /** 清空当前终端输出 */
    clearTerminal: () => void
}

/** CI 事件（对应后端 ops_ci_event 表）*/
export interface OpsCiEvent {
    id: string
    repoName: string
    workflowName: string
    status: 'queued' | 'in_progress' | 'completed'
    conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | null
    headSha: string
    headBranch: string | null
    triggerEvent: string | null
    createTime: string
}

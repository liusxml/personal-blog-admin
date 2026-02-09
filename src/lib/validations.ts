import { z } from 'zod'

// ==================== 文章验证 ====================

export const ArticleSchema = z.object({
    title: z.string()
        .min(1, '标题不能为空')
        .max(255, '标题最多255字符'),

    summary: z.string()
        .max(500, '摘要最多500字符')
        .optional()
        .or(z.literal('')),  // 允许空字符串

    content: z.string()
        .min(10, '内容至少10字符'),

    coverImage: z.string()
        .url('请输入有效的URL')
        .optional()
        .or(z.literal('')),

    coverImageId: z.number().optional(),

    categoryId: z.string().min(1, '请选择分类'),

    tagIds: z.array(z.string())
        .max(5, '最多选择5个标签')
        .default([]),

    type: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),

    originalUrl: z.string()
        .url('请输入有效的URL')
        .max(500, 'URL最多500字符')
        .optional()
        .or(z.literal('')),

    isTop: z.union([z.literal(0), z.literal(1)]).default(0),

    isFeatured: z.union([z.literal(0), z.literal(1)]).default(0),

    isCommentDisabled: z.union([z.literal(0), z.literal(1)]).default(0),

    password: z.string()
        .max(100, '密码最多100字符')
        .optional()
        .or(z.literal('')),
})

export type ArticleFormData = z.infer<typeof ArticleSchema>

// ==================== 评论验证 ====================

export const CommentSchema = z.object({
    content: z.string()
        .min(1, '评论内容不能为空')
        .max(500, '评论最多500字符'),

    targetType: z.union([z.literal('ARTICLE'), z.literal('PAGE')]),

    targetId: z.number(),

    parentId: z.number().optional(),
})

export type CommentFormData = z.infer<typeof CommentSchema>

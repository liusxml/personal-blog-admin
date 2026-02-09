// @ts-nocheck - Zod preprocess causes type inference issues with react-hook-form
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { getArticleById, updateArticle, publishArticle, fetchBingWallpaper } from '@/lib/api'
import { ArticleSchema, type ArticleFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ArrowLeft, Save, Send, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { CategorySelect } from '@/components/features/CategorySelect'
import { TagMultiSelect } from '@/components/features/TagMultiSelect'
import { ImageUpload } from '@/components/features/ImageUpload'
import { imageUploadCommand } from '@/lib/mdEditorCommands'
import { commands } from '@uiw/react-md-editor'
import { useBingWallpaper } from '@/hooks/useBingWallpaper'

// 动态导入 Markdown 编辑器
const MDEditor = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default),
    { ssr: false }
)

export default function EditArticlePage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string  // 保持为字符串，避免Long类型精度丢失

    const form = useForm<ArticleFormData>({
        defaultValues: {
            title: '',
            summary: '',
            content: '',
            coverImage: '',
            categoryId: '',
            tagIds: [],
            type: 1,
            isTop: 0,
            isFeatured: 0,
            isCommentDisabled: 0,
        },
    })

    // 获取文章详情
    const { data: article, isLoading } = useQuery({
        queryKey: ['article', id],
        queryFn: () => getArticleById(id),
        enabled: !!id,
    })

    // 加载文章数据到表单
    useEffect(() => {
        if (article) {
            form.reset({
                title: article.title,
                summary: article.summary || '',
                content: article.content,
                coverImage: article.coverImage || '',
                categoryId: article.categoryId || '',
                tagIds: article.tagIds || [],
                type: article.type || 1,
                originalUrl: article.originalUrl || '',
                isTop: article.isTop || 0,
                isFeatured: article.isFeatured || 0,
                isCommentDisabled: article.isCommentDisabled || 0,
            })
        }
    }, [article, form])

    // 更新文章
    const updateMutation = useMutation({
        mutationFn: (data: ArticleFormData) => updateArticle(id, data),
        onSuccess: () => {
            toast.success('文章已更新')
            router.push('/articles')
        },
        onError: (error: any) => {
            toast.error(error.message || '保存失败，请稍后重试')
        },
    })

    // 发布文章
    const publishMutation = useMutation({
        mutationFn: () => publishArticle(id),
        onSuccess: () => {
            toast.success('文章已发布')
            router.push('/dashboard/articles')
        },
    })

    // 使用必应壁纸Hook
    const { bingLoading, handleUseBingWallpaper } = useBingWallpaper(form)

    const onSubmit = (data: ArticleFormData) => {
        // 手动验证
        if (!data.title || data.title.trim().length === 0) {
            toast.error('标题不能为空')
            return
        }

        if (!data.content || data.content.length < 10) {
            toast.error('内容至少需要 10 个字符')
            return
        }

        updateMutation.mutate(data)
    }

    const handlePublish = async () => {
        // 先保存，再发布
        const formData = form.getValues()

        // 验证
        if (!formData.title || formData.title.trim().length === 0) {
            toast.error('标题不能为空')
            return
        }
        if (!formData.content || formData.content.length < 10) {
            toast.error('内容至少需要 10 个字符')
            return
        }

        await updateMutation.mutateAsync(formData)
        publishMutation.mutate()
    }

    if (isLoading) {
        return <div className="flex justify-center py-20">加载中...</div>
    }

    if (!article) {
        return <div className="flex justify-center py-20">文章不存在</div>
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/articles">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">编辑文章</h2>
                        <p className="text-muted-foreground">#{id} - {article.title}</p>
                    </div>
                </div>

                {/* 发布按钮（草稿状态才显示）*/}
                {article.status === 'DRAFT' && (
                    <Button
                        variant="default"
                        onClick={handlePublish}
                        disabled={publishMutation.isPending}
                    >
                        <Send className="mr-2 h-4 w-4" />
                        保存并发布
                    </Button>
                )}
            </div>

            <Form {...form}>
                {/* @ts-expect-error - Form type inference issue with Zod preprocess */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* 标题 */}
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>标题 *</FormLabel>
                                <FormControl>
                                    <Input placeholder="请输入文章标题" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 封面图 */}
                    <FormField
                        control={form.control}
                        name="coverImage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>封面图</FormLabel>
                                <FormControl>
                                    <div className="space-y-2">
                                        <ImageUpload
                                            value={field.value}
                                            onChange={(data) => {
                                                form.setValue('coverImage', data.url)
                                                form.setValue('coverImageId', Number(data.fileId))
                                            }}
                                            onRemove={() => {
                                                form.setValue('coverImage', '')
                                                form.setValue('coverImageId', undefined)
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleUseBingWallpaper}
                                            disabled={bingLoading}
                                            className="w-full"
                                        >
                                            <Wand2 className="h-4 w-4 mr-2" />
                                            {bingLoading ? '获取中...' : '使用必应壁纸'}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormDescription>
                                    为文章设置封面图，将显示在列表和详情页
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 摘要 */}
                    <FormField
                        control={form.control}
                        name="summary"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>摘要</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="文章摘要（可选）"
                                        rows={3}
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>最多 500 字符</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Markdown 编辑器 */}
                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>内容 *</FormLabel>
                                <FormControl>
                                    <div data-color-mode="light">
                                        <MDEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                            height={500}
                                            preview="edit"
                                            commands={[
                                                ...commands.getCommands(),
                                                commands.divider,
                                                imageUploadCommand
                                            ]}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 文章类型 */}
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>文章类型</FormLabel>
                                <Select
                                    onValueChange={(val) => field.onChange(Number(val))}
                                    value={String(field.value)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="1">原创</SelectItem>
                                        <SelectItem value="2">转载</SelectItem>
                                        <SelectItem value="3">翻译</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 原文链接 */}
                    {form.watch('type') && form.watch('type') !== 1 && (
                        <FormField
                            control={form.control}
                            name="originalUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>原文链接</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* 高级选项 */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <h3 className="font-medium">高级选项</h3>

                        <div className="space-y-3">
                            <FormField
                                control={form.control}
                                name="isTop"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) =>
                                                    field.onChange(checked ? 1 : 0)
                                                }
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">置顶文章</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isFeatured"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) =>
                                                    field.onChange(checked ? 1 : 0)
                                                }
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">精选文章</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isCommentDisabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) =>
                                                    field.onChange(checked ? 1 : 0)
                                                }
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">禁止评论</FormLabel>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={updateMutation.isPending}>
                            <Save className="mr-2 h-4 w-4" />
                            {updateMutation.isPending ? '保存中...' : '保存'}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            取消
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}

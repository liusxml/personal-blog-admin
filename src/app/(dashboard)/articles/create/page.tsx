'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { createArticle } from '@/lib/api'
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
import { ArrowLeft, Save, Send } from 'lucide-react'
import Link from 'next/link'
import { CategorySelect } from '@/components/features/CategorySelect'
import { TagMultiSelect } from '@/components/features/TagMultiSelect'
import { ImageUpload } from '@/components/features/ImageUpload'

// 动态导入 Markdown 编辑器（客户端only）
const MDEditor = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default),
    { ssr: false }
)

export default function CreateArticlePage() {
    const router = useRouter()

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

    // 创建文章
    const createMutation = useMutation({
        mutationFn: createArticle,
        onSuccess: (id) => {
            toast.success('文章已保存为草稿')
            router.push('/articles')
        },
        onError: (error: any) => {
            toast.error(error.message || '创建失败，请稍后重试')
        },
    })

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

        if (!data.categoryId) {
            toast.error('请选择分类')
            return
        }

        createMutation.mutate(data)
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/articles">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">新建文章</h2>
                    <p className="text-muted-foreground">创建一篇新的博客文章</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* 标题 */}
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>标题 *</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="请输入文章标题"
                                        {...field}
                                    />
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
                                        placeholder="文章摘要（可选，留空则自动从内容提取）"
                                        rows={3}
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    最多 500 字符
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 分类选择 */}
                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>分类 *</FormLabel>
                                <FormControl>
                                    <CategorySelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="选择文章分类"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 标签选择 */}
                    <FormField
                        control={form.control}
                        name="tagIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>标签（最多5个）</FormLabel>
                                <FormControl>
                                    <TagMultiSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        maxTags={5}
                                        placeholder="选择文章标签"
                                    />
                                </FormControl>
                                <FormDescription>
                                    为文章添加标签，方便读者查找相关内容
                                </FormDescription>
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
                                    defaultValue={String(field.value)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择文章类型" />
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

                    {/* 原文链接（转载/翻译时显示）*/}
                    {form.watch('type') && form.watch('type') !== 1 && (
                        <FormField
                            control={form.control}
                            name="originalUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>原文链接</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://..."
                                            {...field}
                                        />
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
                            {/* 置顶 */}
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
                                        <FormLabel className="font-normal">
                                            置顶文章
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            {/* 精选 */}
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
                                        <FormLabel className="font-normal">
                                            精选文章
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            {/* 禁止评论 */}
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
                                        <FormLabel className="font-normal">
                                            禁止评论
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-4">
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {createMutation.isPending ? '保存中...' : '保存草稿'}
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

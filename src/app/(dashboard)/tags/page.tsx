// @ts-nocheck - Temporary bypass for initial implementation
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    getTags,
    createTag,
    updateTag,
    deleteTag,
} from '@/lib/api'
import type { TagVO, TagInput, TagQuery } from '@/types'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search, Tag as TagIcon } from 'lucide-react'

export default function TagsPage() {
    const queryClient = useQueryClient()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedTag, setSelectedTag] = useState<TagVO | null>(null)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 20

    const [formData, setFormData] = useState<TagInput>({
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6',
    })

    const queryParams: TagQuery = {
        current: currentPage,
        size: pageSize,
        name: searchKeyword || undefined,
    }

    // 查询标签列表
    const { data: tagsData, isLoading } = useQuery({
        queryKey: ['tags', queryParams],
        queryFn: () => getTags(queryParams),
    })

    // 创建标签
    const createMutation = useMutation({
        mutationFn: createTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
            toast.success('标签创建成功')
            setIsCreateDialogOpen(false)
            resetForm()
        },
        onError: (error: Error) => {
            toast.error(`创建失败: ${error.message}`)
        },
    })

    // 更新标签
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: TagInput }) =>
            updateTag(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
            toast.success('标签更新成功')
            setIsEditDialogOpen(false)
            resetForm()
        },
        onError: (error: Error) => {
            toast.error(`更新失败: ${error.message}`)
        },
    })

    // 删除标签
    const deleteMutation = useMutation({
        mutationFn: deleteTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
            toast.success('标签删除成功')
            setIsDeleteDialogOpen(false)
            setSelectedTag(null)
        },
        onError: (error: Error) => {
            toast.error(`删除失败: ${error.message}`)
        },
    })

    const resetForm = () => {
        setFormData({
            name: '',
            slug: '',
            description: '',
            color: '#3b82f6',
        })
        setSelectedTag(null)
    }

    const handleCreate = () => {
        setIsCreateDialogOpen(true)
    }

    const handleEdit = (tag: TagVO) => {
        setSelectedTag(tag)
        setFormData({
            name: tag.name,
            slug: tag.slug,
            description: tag.description || '',
            color: tag.color || '#3b82f6',
        })
        setIsEditDialogOpen(true)
    }

    const handleDelete = (tag: TagVO) => {
        setSelectedTag(tag)
        setIsDeleteDialogOpen(true)
    }

    const handleSubmitCreate = () => {
        createMutation.mutate(formData)
    }

    const handleSubmitEdit = () => {
        if (selectedTag) {
            updateMutation.mutate({ id: selectedTag.id, data: formData })
        }
    }

    const handleConfirmDelete = () => {
        if (selectedTag) {
            deleteMutation.mutate(selectedTag.id)
        }
    }

    const handleSearch = () => {
        setCurrentPage(1)
    }

    const handleReset = () => {
        setSearchKeyword('')
        setCurrentPage(1)
    }

    const tags = tagsData?.records || []
    const total = tagsData?.total || 0
    const totalPages = tagsData?.pages || 1

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">标签管理</h1>
                    <p className="text-gray-500 mt-1">管理文章标签</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    新建标签
                </Button>
            </div>

            {/* 搜索栏 */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="搜索标签名称..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleSearch}>搜索</Button>
                    <Button variant="outline" onClick={handleReset}>
                        重置
                    </Button>
                </div>
            </div>

            {/* 标签列表 */}
            {isLoading ? (
                <div className="text-center py-12">加载中...</div>
            ) : tags.length > 0 ? (
                <>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>标签名称</TableHead>
                                    <TableHead>URL标识</TableHead>
                                    <TableHead>颜色</TableHead>
                                    <TableHead>描述</TableHead>
                                    <TableHead className="text-right">文章数</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tags.map((tag) => (
                                    <TableRow key={tag.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <TagIcon className="h-4 w-4 text-gray-500" />
                                                {tag.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{tag.slug}</TableCell>
                                        <TableCell>
                                            <Badge
                                                style={{
                                                    backgroundColor: tag.color || '#3b82f6',
                                                    color: 'white',
                                                }}
                                            >
                                                {tag.color || '#3b82f6'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 max-w-xs truncate">
                                            {tag.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">{tag.articleCount}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(tag)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(tag)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-500">
                                共 {total} 个标签，第 {currentPage} / {totalPages} 页
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    上一页
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    下一页
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    {searchKeyword ? '未找到匹配的标签' : '暂无标签，点击"新建标签"创建第一个标签'}
                </div>
            )}

            {/* 创建对话框 */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新建标签</DialogTitle>
                        <DialogDescription>创建一个新的文章标签</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">标签名称 *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="输入标签名称"
                            />
                        </div>
                        <div>
                            <Label htmlFor="slug">URL标识</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="自动生成或手动输入"
                            />
                        </div>
                        <div>
                            <Label htmlFor="color">颜色</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-20 h-10"
                                />
                                <Input
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="#3b82f6"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description">描述</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="输入标签描述（可选）"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleSubmitCreate} disabled={!formData.name || createMutation.isPending}>
                            {createMutation.isPending ? '创建中...' : '创建'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 编辑对话框 */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑标签</DialogTitle>
                        <DialogDescription>修改标签信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">标签名称 *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-slug">URL标识</Label>
                            <Input
                                id="edit-slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-color">颜色</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="edit-color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-20 h-10"
                                />
                                <Input
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="edit-description">描述</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleSubmitEdit} disabled={!formData.name || updateMutation.isPending}>
                            {updateMutation.isPending ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除确认对话框 */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除标签 "{selectedTag?.name}" 吗？此操作无法撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? '删除中...' : '删除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

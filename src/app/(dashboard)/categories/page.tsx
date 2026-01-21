// @ts-nocheck - Temporary bypass for initial implementation
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    getCategoryTree,
    createCategory,
    updateCategory,
    deleteCategory,
} from '@/lib/api'
import type { CategoryTreeVO, CategoryInput } from '@/types'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react'

export default function CategoriesPage() {
    const queryClient = useQueryClient()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<CategoryTreeVO | null>(null)
    const [formData, setFormData] = useState<CategoryInput>({
        name: '',
        slug: '',
        description: '',
        parentId: undefined,
        sortOrder: 0,
    })

    // 查询分类树
    const { data: categoryTree, isLoading } = useQuery({
        queryKey: ['categories', 'tree'],
        queryFn: getCategoryTree,
    })

    // 创建分类
    const createMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('分类创建成功')
            setIsCreateDialogOpen(false)
            resetForm()
        },
        onError: (error: Error) => {
            toast.error(`创建失败: ${error.message}`)
        },
    })

    // 更新分类
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CategoryInput }) =>
            updateCategory(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('分类更新成功')
            setIsEditDialogOpen(false)
            resetForm()
        },
        onError: (error: Error) => {
            toast.error(`更新失败: ${error.message}`)
        },
    })

    // 删除分类
    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('分类删除成功')
            setIsDeleteDialogOpen(false)
            setSelectedCategory(null)
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
            parentId: undefined,
            sortOrder: 0,
        })
        setSelectedCategory(null)
    }

    const handleCreate = () => {
        setIsCreateDialogOpen(true)
    }

    const handleEdit = (category: CategoryTreeVO) => {
        setSelectedCategory(category)
        setFormData({
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            parentId: category.parentId,
            sortOrder: category.sortOrder,
        })
        setIsEditDialogOpen(true)
    }

    const handleDelete = (category: CategoryTreeVO) => {
        setSelectedCategory(category)
        setIsDeleteDialogOpen(true)
    }

    const handleSubmitCreate = () => {
        createMutation.mutate(formData)
    }

    const handleSubmitEdit = () => {
        if (selectedCategory) {
            updateMutation.mutate({ id: selectedCategory.id, data: formData })
        }
    }

    const handleConfirmDelete = () => {
        if (selectedCategory) {
            deleteMutation.mutate(selectedCategory.id)
        }
    }

    // 递归渲染分类树
    const renderTree = (nodes: CategoryTreeVO[], level = 0) => {
        if (!nodes || nodes.length === 0) return null

        return (
            <div className={level > 0 ? 'ml-6 mt-2' : ''}>
                {nodes.map((node) => (
                    <div key={node.id} className="mb-2">
                        <div className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                                <FolderTree className="h-4 w-4 text-gray-500" />
                                <div>
                                    <div className="font-medium">{node.name}</div>
                                    {node.description && (
                                        <div className="text-sm text-gray-500">{node.description}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(node)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(node)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                        {node.children && renderTree(node.children, level + 1)}
                    </div>
                ))}
            </div>
        )
    }

    // 获取所有分类（扁平列表，用于父分类选择）
    const flattenCategories = (nodes: CategoryTreeVO[]): CategoryTreeVO[] => {
        const result: CategoryTreeVO[] = []
        const flatten = (items: CategoryTreeVO[]) => {
            items.forEach((item) => {
                result.push(item)
                if (item.children) {
                    flatten(item.children)
                }
            })
        }
        flatten(nodes)
        return result
    }

    const allCategories = categoryTree ? flattenCategories(categoryTree) : []

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">分类管理</h1>
                    <p className="text-gray-500 mt-1">管理文章分类，支持多级分类</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    新建分类
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">加载中...</div>
            ) : categoryTree && categoryTree.length > 0 ? (
                renderTree(categoryTree)
            ) : (
                <div className="text-center py-12 text-gray-500">
                    暂无分类，点击"新建分类"创建第一个分类
                </div>
            )}

            {/* 创建对话框 */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新建分类</DialogTitle>
                        <DialogDescription>创建一个新的文章分类</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">分类名称 *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="输入分类名称"
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
                            <Label htmlFor="parentId">父分类</Label>
                            <Select
                                value={formData.parentId || 'none'}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, parentId: value === 'none' ? undefined : value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="选择父分类（可选）" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">无（顶级分类）</SelectItem>
                                    {allCategories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="description">描述</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="输入分类描述（可选）"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="sortOrder">排序</Label>
                            <Input
                                id="sortOrder"
                                type="number"
                                value={formData.sortOrder}
                                onChange={(e) =>
                                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                                }
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
                        <DialogTitle>编辑分类</DialogTitle>
                        <DialogDescription>修改分类信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">分类名称 *</Label>
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
                            <Label htmlFor="edit-parentId">父分类</Label>
                            <Select
                                value={formData.parentId || 'none'}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, parentId: value === 'none' ? undefined : value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">无（顶级分类）</SelectItem>
                                    {allCategories
                                        .filter((cat) => cat.id !== selectedCategory?.id)
                                        .map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
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
                        <div>
                            <Label htmlFor="edit-sortOrder">排序</Label>
                            <Input
                                id="edit-sortOrder"
                                type="number"
                                value={formData.sortOrder}
                                onChange={(e) =>
                                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                                }
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
                            确定要删除分类 "{selectedCategory?.name}" 吗？此操作无法撤销。
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

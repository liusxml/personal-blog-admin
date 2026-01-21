'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { getCategoryTree } from '@/lib/api'
import { CategoryTreeVO } from '@/types'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface CategorySelectProps {
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
}

interface FlatCategory {
    id: string
    name: string
    path: string
    level: number
}

export function CategorySelect({
    value,
    onChange,
    placeholder = '选择分类',
    disabled = false,
}: CategorySelectProps) {
    const [open, setOpen] = React.useState(false)

    // 使用 TanStack Query 获取分类树
    const { data: categories, isLoading } = useQuery({
        queryKey: ['categories', 'tree'],
        queryFn: getCategoryTree,
    })

    // 展平分类树用于搜索和显示
    const flatCategories = React.useMemo(() => {
        if (!categories) return []

        const flatten = (
            nodes: CategoryTreeVO[],
            parentPath = '',
            level = 0
        ): FlatCategory[] => {
            return nodes.flatMap((node) => {
                const currentPath = parentPath
                    ? `${parentPath} > ${node.name}`
                    : node.name

                const current: FlatCategory = {
                    id: node.id,
                    name: node.name,
                    path: currentPath,
                    level,
                }

                const children = node.children
                    ? flatten(node.children, currentPath, level + 1)
                    : []

                return [current, ...children]
            })
        }

        return flatten(categories)
    }, [categories])

    // 查找选中的分类
    const selectedCategory = flatCategories.find((cat) => cat.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled || isLoading}
                    className="w-full justify-between"
                >
                    {isLoading ? (
                        '加载中...'
                    ) : selectedCategory ? (
                        <span className="truncate">{selectedCategory.path}</span>
                    ) : (
                        placeholder
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="搜索分类..." />
                    <CommandList>
                        <CommandEmpty>未找到分类</CommandEmpty>
                        <CommandGroup>
                            {flatCategories.map((category) => (
                                <CommandItem
                                    key={category.id}
                                    value={category.path}
                                    onSelect={() => {
                                        onChange(category.id)
                                        setOpen(false)
                                    }}
                                    style={{
                                        paddingLeft: `${category.level * 16 + 8}px`,
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === category.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <span className="truncate">{category.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

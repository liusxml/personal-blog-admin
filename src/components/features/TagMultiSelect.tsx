'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { getTags } from '@/lib/api'
import { TagVO } from '@/types'
import { Badge } from '@/components/ui/badge'
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

interface TagMultiSelectProps {
    value?: string[]
    onChange: (value: string[]) => void
    maxTags?: number
    placeholder?: string
    disabled?: boolean
}

export function TagMultiSelect({
    value = [],
    onChange,
    maxTags = 5,
    placeholder = '选择标签',
    disabled = false,
}: TagMultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    // 使用 TanStack Query 获取标签列表
    const { data: tagsData, isLoading } = useQuery({
        queryKey: ['tags', 'all'],
        queryFn: () => getTags({ current: 1, size: 100 }),
    })

    const tags = tagsData?.records || []

    // 获取已选标签
    const selectedTags = tags.filter((tag) => value.includes(tag.id))

    // 切换标签选择
    const toggleTag = (tagId: string) => {
        if (value.includes(tagId)) {
            onChange(value.filter((id) => id !== tagId))
        } else {
            if (value.length >= maxTags) {
                return // 达到最大数量限制
            }
            onChange([...value, tagId])
        }
    }

    // 移除标签
    const removeTag = (tagId: string) => {
        onChange(value.filter((id) => id !== tagId))
    }

    return (
        <div className="space-y-2">
            {/* 已选标签显示 */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="secondary"
                            className="gap-1"
                            style={{
                                backgroundColor: tag.color + '20',
                                borderColor: tag.color,
                                color: tag.color,
                            }}
                        >
                            {tag.name}
                            <button
                                type="button"
                                onClick={() => removeTag(tag.id)}
                                disabled={disabled}
                                className="ml-1 rounded-full hover:bg-muted"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* 标签选择器 */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled || isLoading || value.length >= maxTags}
                        className="w-full justify-between"
                    >
                        {isLoading ? (
                            '加载中...'
                        ) : value.length >= maxTags ? (
                            `已选择 ${maxTags} 个标签（最大限制）`
                        ) : (
                            `${placeholder}（${value.length}/${maxTags}）`
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput placeholder="搜索标签..." />
                        <CommandList>
                            <CommandEmpty>未找到标签</CommandEmpty>
                            <CommandGroup>
                                {tags.map((tag) => {
                                    const isSelected = value.includes(tag.id)
                                    const isDisabled = !isSelected && value.length >= maxTags

                                    return (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.name}
                                            onSelect={() => toggleTag(tag.id)}
                                            disabled={isDisabled}
                                            className={cn(
                                                'cursor-pointer',
                                                isDisabled && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'mr-2 h-4 w-4 rounded border flex items-center justify-center',
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'border-input'
                                                )}
                                            >
                                                {isSelected && (
                                                    <div className="h-full w-full flex items-center justify-center text-primary-foreground text-xs">
                                                        ✓
                                                    </div>
                                                )}
                                            </div>
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    backgroundColor: tag.color + '20',
                                                    borderColor: tag.color,
                                                    color: tag.color,
                                                }}
                                            >
                                                {tag.name}
                                            </Badge>
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

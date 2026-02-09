'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { ArticleQuery } from '@/types'

interface ArticleSearchProps {
    onSearch: (query: ArticleQuery) => void
    defaultValues?: ArticleQuery
}

export function ArticleSearch({ onSearch, defaultValues = {} }: ArticleSearchProps) {
    const [keyword, setKeyword] = React.useState(defaultValues.keyword || '')
    const [status, setStatus] = React.useState<string>(
        defaultValues.status !== undefined ? String(defaultValues.status) : 'all'
    )

    const handleSearch = () => {
        onSearch({
            keyword: keyword || undefined,
            status: status === 'all' ? undefined : Number(status) as 0 | 2 | 3,
        })
    }

    const handleReset = () => {
        setKeyword('')
        setStatus('all')
        // 保留分页参数，只清空筛选条件
        onSearch({
            current: 1,  // 重置到第一页
            size: 10,    // 保持默认页大小
        })
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* 关键词搜索 */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="搜索文章标题或摘要..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-9"
                />
            </div>

            {/* 状态筛选 */}
            <Select value={status} onValueChange={setStatus}>
                <SelectTrigger suppressHydrationWarning className="w-full sm:w-[180px]">
                    <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="0">
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                            草稿
                        </span>
                    </SelectItem>
                    <SelectItem value="2">
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            已发布
                        </span>
                    </SelectItem>
                    <SelectItem value="3">
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                            已归档
                        </span>
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* 操作按钮 */}
            <div className="flex gap-2">
                <Button onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    搜索
                </Button>
                <Button variant="outline" onClick={handleReset}>
                    <X className="mr-2 h-4 w-4" />
                    重置
                </Button>
            </div>
        </div>
    )
}

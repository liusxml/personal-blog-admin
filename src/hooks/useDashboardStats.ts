'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardMetrics, getHealth } from '@/lib/api'

export function useDashboardStats() {
    // 1. 业务指标（Micrometer）
    const { data: metrics, isLoading: metricsLoading } = useQuery({
        queryKey: ['dashboard', 'metrics'],
        queryFn: getDashboardMetrics,
        staleTime: 1000 * 60, // 1 分钟缓存
        refetchInterval: 1000 * 30, // 30 秒自动刷新
    })

    //2. 系统健康状态
    const { data: healthData, isLoading: healthLoading } = useQuery({
        queryKey: ['dashboard', 'health'],
        queryFn: getHealth,
        staleTime: 1000 * 30, // 30 秒缓存
        refetchInterval: 1000 * 60, // 60 秒自动刷新
    })

    return {
        metrics,
        healthData,
        isLoading: metricsLoading || healthLoading,
    }
}

"use client";

import { useState } from "react";
import { Activity, Container, ExternalLink, ScrollText } from "lucide-react";

/**
 * 监控面板配置项定义
 * - id: 面板唯一标识
 * - label: 顶部切换 Tab 标题
 * - description: 当前面板功能说明
 * - embedUrl: iframe 内嵌地址（Grafana 附加 ?kiosk 隐藏自身导航栏以获得最佳内嵌体验）
 * - externalUrl: 右上角「在新标签页中打开」的独立访问地址
 */
const MONITOR_PANELS = [
  {
    id: "dozzle",
    label: "Dozzle 容器日志",
    description: "实时查看所有 Docker 容器标准输出日志与运行状态",
    embedUrl: "https://dozzle.chonkybird.com",
    externalUrl: "https://dozzle.chonkybird.com",
    icon: ScrollText,
  },
  {
    id: "dockge",
    label: "Dockge 容器编排",
    description: "可视化管理 Docker Compose 编排栈与容器交互终端",
    embedUrl: "https://dockge.chonkybird.com",
    externalUrl: "https://dockge.chonkybird.com",
    icon: Container,
  },
  {
    id: "grafana",
    label: "Grafana 监控大盘",
    description: "Spring Boot JVM、Caddy 网关、MySQL 与 Redis 实时可观测性指标",
    embedUrl: "https://grafana.chonkybird.com/?kiosk",
    externalUrl: "https://grafana.chonkybird.com",
    icon: Activity,
  },
] as const;

type PanelId = (typeof MONITOR_PANELS)[number]["id"];

/**
 * 容器与可观测性监控中心页面
 *
 * 架构说明：
 * - 直接通过 iframe 嵌入各自独立子域名（dozzle / dockge / grafana.chonkybird.com），
 *   彻底避免经由 Next.js Route Handler 二次代理带来的 SSE 缓冲、Brotli 解压与 Hop-by-Hop 请求头问题。
 * - 安全防护由边缘网关 Caddy 的 Content-Security-Policy (frame-ancestors) 统一管控，
 *   仅允许本系统域名与本地开发端口嵌入，防止第三方站点点击劫持。
 */
export default function ContainersPage() {
  const [activeTab, setActiveTab] = useState<PanelId>("dozzle");
  const currentPanel = MONITOR_PANELS.find((panel) => panel.id === activeTab) ?? MONITOR_PANELS[0];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* 顶部工具栏：左侧标题与面板切换 Tab，右侧独立新窗口外链 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-base font-semibold">容器与监控中心</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{currentPanel.description}</p>
          </div>

          {/* 面板切换按钮组 */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            {MONITOR_PANELS.map((panel) => {
              const Icon = panel.icon;
              const isActive = panel.id === activeTab;
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setActiveTab(panel.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{panel.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <a
          href={currentPanel.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span>在新标签页中打开 {currentPanel.label.split(" ")[0]}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* 内嵌监控视图区域 */}
      <iframe
        key={currentPanel.id}
        src={currentPanel.embedUrl}
        className="w-full flex-1 border-0"
        title={currentPanel.label}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      />
    </div>
  );
}

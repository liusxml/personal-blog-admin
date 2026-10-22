"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Laptop,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { generateMcpToken } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GeneratedMcpTokenMeta {
  token: string;
  expiresAt: string;
  expirationDays: number;
  createdAt: string;
}

const EXPIRATION_OPTIONS = [
  { label: "7 天（短期调试）", days: 7 },
  { label: "30 天（推荐）", days: 30 },
  { label: "90 天（季度长效）", days: 90 },
  { label: "365 天（年度长效）", days: 365 },
];

const MCP_TOOLS = [
  { name: "listCategories", scope: "只读", desc: "获取全部分类列表（ID、名称、Slug）" },
  { name: "listTags", scope: "只读", desc: "获取全部标签列表（ID、名称、颜色、文章数）" },
  { name: "searchArticles", scope: "只读", desc: "按关键词/状态/分类分页检索文章（含草稿）" },
  { name: "getArticleDetail", scope: "只读", desc: "按文章 ID 获取完整 Markdown 正文与元数据" },
  { name: "saveArticleDraft", scope: "写入", desc: "创建 Markdown 文章草稿并返回草稿 ID" },
  { name: "publishArticle", scope: "写入", desc: "一键创建并直接发布技术博客文章" },
  { name: "publishDraftArticle", scope: "写入", desc: "将已有草稿切换为正式发布状态" },
  { name: "opsHealthCheck", scope: "运维", desc: "检查博客后端与远程 VPS Docker 容器运行状态" },
];

const MCP_RESOURCES = [
  { uri: "blog://taxonomy/categories", desc: "博客分类目录快照（JSON）" },
  { uri: "blog://taxonomy/tags", desc: "博客标签目录快照（JSON）" },
  { uri: "blog://specs/writing-style", desc: "技术博客 Markdown 写作规范指南" },
  { uri: "blog://articles/{id}", desc: "指定 ID 文章的完整 Markdown 正文模板资源" },
];

export default function McpConfigPage() {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [endpointEnv, setEndpointEnv] = useState<"prod" | "local">("prod");
  const [tokenMeta, setTokenMeta] = useState<GeneratedMcpTokenMeta | null>(null);
  const [showPlainToken, setShowPlainToken] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 调用后端 POST /api/v1/auth/mcp-token 签发长效管理员 Bearer Token
  // 出于安全考量，长效 Token 仅保存在当前页面内存中单次展示，不落盘 localStorage
  const tokenMutation = useMutation({
    mutationFn: (days: number) => generateMcpToken(days),
    onSuccess: (data) => {
      const now = new Date();
      const expiresAtDate = new Date(now.getTime() + data.expiresIn * 1000);
      const meta: GeneratedMcpTokenMeta = {
        token: data.token,
        expiresAt: expiresAtDate.toLocaleString("zh-CN", { hour12: false }),
        expirationDays: selectedDays,
        createdAt: now.toLocaleString("zh-CN", { hour12: false }),
      };
      setTokenMeta(meta);
      toast.success(`成功签发 ${selectedDays} 天有效期的 MCP Bearer Token`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "签发 MCP Token 失败");
    },
  });

  const serverUrl =
    endpointEnv === "prod" ? "https://api.chonkybird.com/mcp" : "http://localhost:8080/mcp";

  const displayToken = tokenMeta?.token || "<请先在左侧点击生成 MCP Bearer Token>";

  // 动态拼装可直接粘贴到 Antigravity / Cursor / Claude Desktop 的 mcp_config.json
  const mcpConfigJson = useMemo(() => {
    return JSON.stringify(
      {
        mcpServers: {
          "personal-blog-mcp": {
            serverUrl,
            headers: {
              Authorization: `Bearer ${displayToken}`,
            },
          },
        },
      },
      null,
      2
    );
  }, [serverUrl, displayToken]);

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`已复制${label}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("复制失败，请手动选中复制");
    }
  };

  const maskedToken = useMemo(() => {
    if (!tokenMeta?.token) return "";
    const t = tokenMeta.token;
    if (t.length <= 24) return "••••••••••••••••";
    return `${t.slice(0, 16)}••••••••••••••••••••••••••••••••${t.slice(-12)}`;
  }, [tokenMeta]);

  return (
    <div className="space-y-6">
      {/* 顶部标题区 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MCP 接入配置</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            签发管理员专属长效 Bearer Token，一键接入 Antigravity / Cursor / Claude Desktop 等 AI
            客户端
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Streamable HTTP 协议 + ROLE_ADMIN 鉴权保护
        </Badge>
      </div>

      {/* 核心操作区：左侧生成 Token，右侧实时生成 mcp_config.json */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧卡片：签发与管理 Bearer Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              1. 签发 MCP Bearer Token
            </CardTitle>
            <CardDescription>
              基于当前登录的管理员账号签发带 <code className="text-xs">ROLE_ADMIN</code> 权限的专用
              JWT 令牌，用于访问 <code className="text-xs">/mcp</code> 端点。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 有效期选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">选择 Token 有效期</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {EXPIRATION_OPTIONS.map((opt) => {
                  const active = selectedDays === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setSelectedDays(opt.days)}
                      className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 生成按钮 */}
            <Button
              onClick={() => tokenMutation.mutate(selectedDays)}
              disabled={tokenMutation.isPending}
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${tokenMutation.isPending ? "animate-spin" : ""}`} />
              {tokenMutation.isPending
                ? "正在签发 Token..."
                : tokenMeta
                  ? `重新生成 Bearer Token（${selectedDays} 天）`
                  : `生成 Bearer Token（${selectedDays} 天）`}
            </Button>

            {/* Token 展示与复制 */}
            {tokenMeta ? (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">当前可用 Token</span>
                  <span className="text-muted-foreground">过期时间：{tokenMeta.expiresAt}</span>
                </div>

                <div className="relative rounded-md border bg-background p-3 font-mono text-xs break-all select-all">
                  {showPlainToken ? tokenMeta.token : maskedToken}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setShowPlainToken((prev) => !prev)}
                  >
                    {showPlainToken ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        隐藏明文
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        显示明文
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleCopy(tokenMeta.token, "raw-token", "纯 Token")}
                  >
                    {copiedKey === "raw-token" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    复制纯 Token
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      handleCopy(`Bearer ${tokenMeta.token}`, "bearer-header", " Authorization 值")
                    }
                  >
                    {copiedKey === "bearer-header" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    复制 Bearer Token
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                尚未生成 MCP Token，请点击上方按钮签发。生成的 Token 会自动填入右侧配置模板。
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧卡片：mcp_config.json 一键复制 */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4 text-primary" />
                2. 客户端接入配置（mcp_config.json）
              </CardTitle>

              {/* 线上 / 本地端点切换 */}
              <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setEndpointEnv("prod")}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors ${
                    endpointEnv === "prod"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  线上生产
                </button>
                <button
                  type="button"
                  onClick={() => setEndpointEnv("local")}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors ${
                    endpointEnv === "local"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Laptop className="h-3 w-3" />
                  本地开发
                </button>
              </div>
            </div>
            <CardDescription>
              注意：线上 MCP 端点挂载在后端 API 域名{" "}
              <code className="font-mono text-xs text-foreground">
                https://api.chonkybird.com/mcp
              </code>
              （而非前端域名 <code className="font-mono text-xs">chonkybird.com</code>）。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
                <code>{mcpConfigJson}</code>
              </pre>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute top-3 right-3 h-7 gap-1.5 px-2.5 text-xs"
                onClick={() => handleCopy(mcpConfigJson, "mcp-json", " mcp_config.json 配置")}
              >
                {copiedKey === "mcp-json" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                复制 JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部：MCP Server 已开放的 Tools 与 Resources 清单 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-primary" />
              已注册 MCP Tools（共 {MCP_TOOLS.length} 个）
            </CardTitle>
            <CardDescription>AI 客户端连接成功后可直接调用的工具函数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {MCP_TOOLS.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono font-semibold text-foreground">{tool.name}</div>
                    <div className="text-muted-foreground">{tool.desc}</div>
                  </div>
                  <Badge
                    variant={
                      tool.scope === "写入"
                        ? "default"
                        : tool.scope === "运维"
                          ? "destructive"
                          : "secondary"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {tool.scope}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              已注册 MCP Resources（共 {MCP_RESOURCES.length} 个）
            </CardTitle>
            <CardDescription>AI 客户端可按 URI 直接读取的上下文资源与写作规范</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {MCP_RESOURCES.map((res) => (
                <div key={res.uri} className="space-y-1 px-3.5 py-3 text-xs">
                  <div className="font-mono font-semibold text-foreground">{res.uri}</div>
                  <div className="text-muted-foreground">{res.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

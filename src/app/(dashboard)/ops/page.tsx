"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOpsStream, type OpsChatMode } from "@/hooks/useOpsStream";
import { TerminalPanel } from "@/components/features/ops/TerminalPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, User, SendHorizonal, Trash2, ShieldAlert } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OpsMessage } from "@/types";

// ─── AI 回复的 Markdown 渲染器 ────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // 标题层级
        h1: ({ children }) => <h1 className="mt-2 mb-1 text-base font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-2 mb-1 text-sm font-bold">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-1.5 mb-0.5 text-sm font-semibold">{children}</h3>,
        // 文本威次
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        // 内行代码
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code
              className={cn(
                "mt-1 mb-1 block rounded bg-black/30 p-2 font-mono text-xs break-all whitespace-pre-wrap",
                className
              )}
            >
              {children}
            </code>
          ) : (
            <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-xs">{children}</code>
          );
        },
        // 代码块
        pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
        // 引用块
        blockquote: ({ children }) => (
          <blockquote className="my-1 border-l-2 border-current pl-2 italic opacity-70">
            {children}
          </blockquote>
        ),
        // 列表
        ul: ({ children }) => (
          <ul className="my-1 list-inside list-disc space-y-0.5 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1 list-inside list-decimal space-y-0.5 pl-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // 段落
        p: ({ children }) => <p className="my-0.5 leading-relaxed">{children}</p>,
        // 分隔线
        hr: () => <hr className="my-2 border-current opacity-20" />,
        // 表格（GFM）
        table: ({ children }) => (
          <div className="my-1 overflow-x-auto">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-current/30 bg-current/10 px-2 py-1 font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => <td className="border border-current/30 px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── 聊天气泡 ──────────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: OpsMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {/* 头像 */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      {/* 气泡 */}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
          isUser
            ? "rounded-tr-sm bg-primary whitespace-pre-wrap text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground"
        )}
      >
        {/* 用户消息用纯文本；AI 回复用 Markdown 渲染 */}
        {isUser ? msg.content : <MarkdownContent content={msg.content} />}
      </div>
    </div>
  );
}

// ─── 流式输出气泡（AI 正在回复中） ────────────────────────────────────────────

function StreamingBubble({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm leading-relaxed break-words text-foreground">
        {/* 流式输出同样走 Markdown 渲染，避免显示原始 **粗体** `代码` 等符号 */}
        <MarkdownContent content={text} />
        <span
          className="ml-0.5 inline-block h-3.5 w-[6px] bg-foreground align-middle opacity-70"
          style={{ animation: "blink 1s step-end infinite" }}
        />
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function OpsPage() {
  const [mode, setMode] = useState<OpsChatMode>("langchain4j");
  const [selectedModel, setSelectedModel] = useState("gemini-flash-latest");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<OpsMessage[]>([]);
  const chatAnchorRef = useRef<HTMLDivElement>(null);
  // 防止 streaming→done 归档执行两次的标记（每轮 send 重置）
  const hasArchivedRef = useRef(false);
  // 用 ref 同步最新 streamingText，避免 useEffect 因 deps 变化多次触发归档
  const streamingTextRef = useRef("");

  const isMcpMode = mode === "spring-ai-mcp";

  // ── 动态拉取后端 Google GenAI API 支持的 Gemini 聊天模型列表 ─────────────
  const { data: mcpModels } = useQuery({
    queryKey: ["ops-mcp-models"],
    queryFn: () => fetchWithAuth<string[]>("/api/v1/ops/mcp-models"),
    enabled: isMcpMode,
    staleTime: 5 * 60 * 1000,
  });

  const modelOptions =
    mcpModels && mcpModels.length > 0
      ? mcpModels
      : ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.8-flash"];

  const {
    streamingText,
    terminalLines,
    latestToolCall,
    status,
    error,
    send,
    clearTerminal,
    abort,
  } = useOpsStream(mode, selectedModel);

  // ── 同步 streamingText 到 ref（供 useEffect 安全读取，不加入 deps）─────────
  useEffect(() => {
    streamingTextRef.current = streamingText;
  });

  // ── 每次发送新指令时重置归档标记 ──────────────────────────────────────────
  useEffect(() => {
    if (status === "connecting") {
      hasArchivedRef.current = false;
    }
  }, [status]);

  // ── 当 SSE 流结束时，将完成的 AI 消息归档到历史（只触发一次）──────────────
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // streaming → done：从 ref 读取最终文本，用标记确保只归档一次
    if (prev === "streaming" && status === "done" && !hasArchivedRef.current) {
      hasArchivedRef.current = true;
      const finalText = streamingTextRef.current;
      if (finalText) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: finalText,
            timestamp: Date.now(),
          },
        ]);
      }
    }

    // 错误处理
    if (status === "error" && error) {
      toast.error(`Agent 异常：${error}`);
    }
  }, [status, error]);

  // ── 聊天区自动滚到底部 ─────────────────────────────────────────────────────
  useEffect(() => {
    chatAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ── 组件卸载时关闭 SSE 连接（防止泄漏） ──────────────────────────────────
  useEffect(() => {
    return () => abort();
  }, [abort]);

  // ── 切换 Agent 引擎模式（中止进行中的流） ─────────────────────────────────
  const handleModeChange = (nextMode: string) => {
    abort();
    setMode(nextMode as OpsChatMode);
  };

  // ── 发送消息 ───────────────────────────────────────────────────────────────
  const handleSend = () => {
    const q = input.trim();
    if (!q || status === "streaming" || status === "connecting") return;

    // 先写入用户消息
    setMessages((m) => [...m, { role: "user", content: q, timestamp: Date.now() }]);
    setInput("");
    send(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    // 同时中止正在进行的 SSE 流，防止清空后旧回复继续追加
    abort();
    setMessages([]);
    toast.success("对话记录已清空");
  };

  const isStreaming = status === "streaming" || status === "connecting";

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] flex-col gap-4">
      {/* ── 页面标题栏与模式切换 ──────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Ops Copilot</h2>
          <Badge variant="secondary" className="text-xs">
            AI 运维助手
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* 对话引擎模式切换器 */}
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="h-8">
              <TabsTrigger id="ops-mode-langchain4j" value="langchain4j" className="text-xs">
                LangChain4j 模式
              </TabsTrigger>
              <TabsTrigger id="ops-mode-spring-ai-mcp" value="spring-ai-mcp" className="text-xs">
                Spring AI + MCP 模式
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>仅管理员可用 · 命令在白名单内执行</span>
          </div>
        </div>
      </div>

      {/* ── 双栏主区域 ──────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ━━ 左栏：AI 对话 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
          {/* 左栏顶部 */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI 对话</span>
              <Badge variant="outline" className="text-[10px]">
                {isMcpMode ? "Spring AI + MCP" : "LangChain4j"}
              </Badge>

              {/* Spring AI + MCP 模式专属：动态 Gemini 模型选择下拉框 */}
              {isMcpMode && (
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={isStreaming}
                >
                  <SelectTrigger
                    id="ops-mcp-model-select"
                    size="sm"
                    className="h-7 min-w-[210px] text-xs"
                  >
                    <SelectValue placeholder="选择 Gemini 模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((modelId) => (
                      <SelectItem key={modelId} value={modelId} className="text-xs">
                        {modelId === "gemini-flash-latest"
                          ? "gemini-flash-latest（默认 · 主力均衡）"
                          : modelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              id="ops-chat-clear"
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-destructive"
              onClick={handleClearChat}
              disabled={messages.length === 0 && !streamingText}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              清空
            </Button>
          </div>

          {/* 消息列表 */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 p-4">
              {messages.length === 0 && !streamingText && (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Bot className="h-10 w-10 opacity-20" />
                  <p className="text-sm">发送运维指令，Agent 将自动执行并返回结果</p>
                  <p className="text-xs opacity-60">
                    {isMcpMode
                      ? "例如：检查一下服务器状态 / 查看博客文章分类"
                      : "例如：帮我查看 frontend 服务日志"}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {/* 流式输出中的气泡：仅在流式传输期间渲染。
                                status=done 后 streamingText 不会立即清空，
                                若不加 isStreaming 条件，会与归档后的 ChatBubble 同时出现，导致显示两遍 */}
              {isStreaming && <StreamingBubble text={streamingText} />}
              {/* 滚动锚点 */}
              <div ref={chatAnchorRef} />
            </div>
          </ScrollArea>

          {/* 输入区 */}
          <div className="shrink-0 border-t p-4">
            <div className="flex items-end gap-2">
              <Textarea
                id="ops-input"
                placeholder="输入运维指令… (Enter 发送，Shift+Enter 换行)"
                className="max-h-[120px] min-h-[44px] resize-none text-sm"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
              />
              <Button
                id="ops-send"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isMcpMode
                ? "基于 Spring AI ChatClient + MCP Client 回环调用 /mcp 工具，结果直接展示在对话区"
                : "基于白名单的 SSH 命令执行，结果实时推送到右侧终端"}
            </p>
          </div>
        </div>

        {/* ━━ 右栏：终端输出 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TerminalPanel
          lines={terminalLines}
          status={status}
          mode={mode}
          latestToolCall={latestToolCall}
          onClear={clearTerminal}
          className="min-h-0"
        />
      </div>
    </div>
  );
}

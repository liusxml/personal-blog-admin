"use client";

import { useState, useRef, useCallback } from "react";
import type { OpsStreamStatus, OpsToolCall } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ─── 模式与返回值类型 ──────────────────────────────────────────────────────────

/**
 * Ops Copilot 对话引擎模式
 *
 * - `langchain4j`：旧模式（LangChain4j AiServices + 本地 @Tool 执行 SSH，实时推送 ops_log 到右侧终端）
 * - `spring-ai-mcp`：新模式（Spring AI ChatClient + Advisor 责任链 + MCP Client 回环调用 /mcp 工具）
 */
export type OpsChatMode = "langchain4j" | "spring-ai-mcp";

export interface UseOpsStreamReturn {
  /** AI 当前正在流式输出的文本（每次 send 后重置） */
  streamingText: string;
  /** 终端日志行（来自 event: ops_log，跨多轮累积） */
  terminalLines: string[];
  /** 最近一次工具调用信息（来自 event: tool_call） */
  latestToolCall: OpsToolCall | null;
  /** 当前 SSE 流状态 */
  status: OpsStreamStatus;
  /** 错误信息（status === 'error' 时非 null） */
  error: string | null;
  /** 发送一条运维指令，建立新 SSE 流 */
  send: (message: string, sessionId?: string) => void;
  /** 清空终端输出 */
  clearTerminal: () => void;
  /** 强制中止当前 SSE 请求 */
  abort: () => void;
}

// ─── SSE 文本帧解析器 ──────────────────────────────────────────────────────────

/**
 * parseSseLine
 *
 * 将从 ReadableStream 读取的原始文本中提取 SSE 事件。
 *
 * SSE 格式规范（text/event-stream）：
 *   event: <type>\n
 *   data: <payload>\n
 *   \n          ← 空行代表一条事件结束
 *
 * @param chunk  从流中读取的原始文本（可能包含多条事件）
 * @param onEvent  回调：(eventType, data) => void
 */
function parseSseChunk(chunk: string, onEvent: (type: string, data: string) => void): void {
  // 按完整事件帧（\n\n 双换行）分割，逐帧解析
  const events = chunk.split(/\n\n/);
  for (const event of events) {
    if (!event.trim()) continue;

    let type = "message";
    const dataLines: string[] = [];

    for (const line of event.split("\n")) {
      if (line.startsWith("event:")) {
        type = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        // SSE 规范：单个事件若包含换行符，服务端 SseEmitter 会拆分为多行 `data:`，
        // 客户端需按规范将同一事件内的多行 `data:` 以 `\n` 拼接还原完整文本。
        dataLines.push(line.slice("data:".length));
      }
    }

    if (dataLines.length > 0) {
      onEvent(type, dataLines.join("\n"));
    }
  }
}

// ─── Hook 实现 ────────────────────────────────────────────────────────────────

/**
 * useOpsStream
 *
 * 使用 Fetch API + ReadableStream 消费后端 Ops Agent SSE 端点。
 *
 * 相比 EventSource 的优势：
 *   - ✅ 支持自定义 Header（Authorization: Bearer <token>）
 *   - ✅ 支持 GET/POST，指令可放在请求体中（不受 URL 长度限制）
 *   - ✅ 无需后端修改 SecurityConfig 支持 query param token
 *
 * 监听 5 种具名事件：
 *   - event: message   → AI 逐 token 流式追加到 streamingText
 *   - event: ops_log   → SSH 终端输出，追加到 terminalLines
 *   - event: tool_call → 工具调用完成通知，更新 latestToolCall
 *   - event: done      → 整轮对话结束，关闭流
 *   - event: error     → 服务端异常，更新 error 状态
 *
 * @param mode  当前选中的对话引擎模式（默认 'langchain4j'）
 * @param model Spring AI + MCP 模式下选中的 Gemini 模型名称（默认 'gemini-2.5-flash'）
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream
 */
export function useOpsStream(
  mode: OpsChatMode = "langchain4j",
  model = "gemini-flash-latest"
): UseOpsStreamReturn {
  const [streamingText, setStreamingText] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [latestToolCall, setLatestToolCall] = useState<OpsToolCall | null>(null);
  const [status, setStatus] = useState<OpsStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // AbortController 用于中止 fetch 请求
  const abortCtrlRef = useRef<AbortController | null>(null);

  /** 中止当前请求并清理 */
  const abortCurrent = useCallback(() => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }
  }, []);

  /** 强制关闭（供父组件 useEffect cleanup 调用） */
  const abort = useCallback(() => {
    abortCurrent();
    setStatus("idle");
  }, [abortCurrent]);

  /** 清空终端日志 */
  const clearTerminal = useCallback(() => {
    setTerminalLines([]);
  }, []);

  /**
   * 向后端发送运维指令，建立新的 SSE 流。
   *
   * 使用 GET + query param 与后端接口对齐（后端为 @GetMapping）。
   * Authorization 通过标准 Header 传递，无需改动 SecurityConfig。
   *
   * @param message   用户自然语言运维指令
   * @param sessionId 会话 ID，用于多轮记忆（默认 'default'）
   */
  const send = useCallback(
    (message: string, sessionId = "default") => {
      // 中止上一次请求
      abortCurrent();

      // 重置本轮状态（terminalLines 跨轮累积，由 clearTerminal 显式清空）
      setStreamingText("");
      setLatestToolCall(null);
      setError(null);
      setStatus("connecting");

      // 读取 token（规则 4.1）
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      // 根据模式路由到不同的后端 SSE 接口：
      // - langchain4j 模式：GET /api/v1/ops/chat?message=...&sessionId=...
      // - spring-ai-mcp 模式：GET /api/v1/ops/mcp-chat?message=...&conversationId=...&model=...
      const isMcpMode = mode === "spring-ai-mcp";
      const endpoint = isMcpMode ? "/api/v1/ops/mcp-chat" : "/api/v1/ops/chat";
      const params = new URLSearchParams(
        isMcpMode ? { message, conversationId: sessionId, model } : { message, sessionId }
      );
      const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;

      // 异步消费 SSE 流
      (async () => {
        let response: Response;

        try {
          response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "text/event-stream",
              "Cache-Control": "no-cache",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            signal: ctrl.signal,
          });
        } catch (err) {
          // AbortError 是正常中止，非用户侧错误
          if ((err as Error).name === "AbortError") return;
          setError(`连接失败：${(err as Error).message}`);
          setStatus("error");
          return;
        }

        if (!response.ok) {
          setError(`HTTP ${response.status}：${response.statusText}`);
          setStatus("error");
          return;
        }

        if (!response.body) {
          setError("响应体为空，服务端未返回 SSE 流");
          setStatus("error");
          return;
        }

        setStatus("streaming");

        // 读取 ReadableStream，解码为文本，逐块解析 SSE 事件
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        // 跨 chunk 累积缓冲（事件帧可能在多个 chunk 中传输）
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // 按完整事件帧（\n\n 双换行）解析，剩余不完整的留在 buffer
            const lastDelimiter = buffer.lastIndexOf("\n\n");
            if (lastDelimiter === -1) continue;

            const complete = buffer.slice(0, lastDelimiter + 2);
            buffer = buffer.slice(lastDelimiter + 2);

            parseSseChunk(complete, (type, data) => {
              switch (type) {
                case "message":
                  setStreamingText((prev) => prev + data);
                  break;

                case "ops_log": {
                  const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false });
                  setTerminalLines((prev) => [...prev, `[${ts}] ${data}`]);
                  break;
                }

                case "tool_call":
                  setLatestToolCall({ toolName: data, timestamp: Date.now() });
                  break;

                case "done":
                  setStatus("done");
                  ctrl.abort(); // 关闭底层连接
                  break;

                case "error":
                  setError(data);
                  setStatus("error");
                  ctrl.abort();
                  break;
              }
            });
          }
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            setError(`流读取异常：${(err as Error).message}`);
            setStatus("error");
          }
        } finally {
          reader.releaseLock();
          abortCtrlRef.current = null;
        }
      })();
    },
    [abortCurrent, mode, model]
  );

  return {
    streamingText,
    terminalLines,
    latestToolCall,
    status,
    error,
    send,
    clearTerminal,
    abort,
  };
}

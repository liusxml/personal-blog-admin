# personal-blog-admin

个人博客管理后台，基于 Next.js 15 + React 19 构建的现代化单页应用，提供文章、分类、标签、评论、文件的全生命周期管理，以及集成 AI 运维助手（Ops Copilot）的智能运维能力。

---

## 技术栈

| 模块 | 技术 | 版本 |
|:---|:---|:---|
| 核心框架 | Next.js | 16.x（App Router） |
| UI 库 | React | 19.x |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS | v4 |
| 组件库 | Shadcn/UI（Radix UI） | latest |
| 服务端状态 | TanStack Query | v5 |
| 客户端状态 | Zustand | v5（持久化） |
| 表单验证 | Zod | v4 |
| 表格 | TanStack Table | v8 |
| Markdown 编辑器 | @uiw/react-md-editor | v4 |
| 图标 | Lucide React | latest |
| Toast 通知 | Sonner | v2 |
| Cookie 管理 | js-cookie | v3 |
| 文件 MD5 | spark-md5 | v3 |

---

## 项目结构

```
personal-blog-admin/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 认证路由组
│   │   │   ├── login/page.tsx        # 登录页
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # 后台管理路由组
│   │   │   ├── layout.tsx            # 侧边栏布局（SidebarProvider）
│   │   │   ├── dashboard/            # 仪表盘（实时统计 + 健康状态）
│   │   │   ├── articles/             # 文章管理
│   │   │   │   ├── page.tsx          # 文章列表（筛选 + 分页 + 操作）
│   │   │   │   ├── create/page.tsx   # 新建文章（Markdown 编辑器）
│   │   │   │   └── [id]/edit/page.tsx # 编辑文章
│   │   │   ├── categories/page.tsx   # 分类管理（树形结构）
│   │   │   ├── tags/page.tsx         # 标签管理（分页 + 合并）
│   │   │   ├── comments/page.tsx     # 评论管理（审核 + 举报）
│   │   │   ├── files/page.tsx        # 文件管理（预签名上传 + 分类筛选）
│   │   │   └── ops/page.tsx          # Ops Copilot（AI 运维助手）
│   │   ├── layout.tsx                # 根布局（ThemeProvider + QueryClient）
│   │   ├── page.tsx                  # 根页面（重定向到 /dashboard）
│   │   ├── providers.tsx             # 全局 Providers
│   │   └── globals.css               # 全局样式（CSS Variables + Tailwind）
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/UI 组件（自动生成，勿手动修改）
│   │   └── features/                 # 业务组件
│   │       ├── AiAssistantDialog.tsx # AI 助手弹窗（RAG 问答）
│   │       ├── ArticleSearch.tsx     # 文章搜索组件
│   │       ├── CategorySelect.tsx    # 分类树选择器
│   │       ├── ImageUpload.tsx       # 图片上传（预签名 + MD5 秒传）
│   │       ├── TagMultiSelect.tsx    # 标签多选（支持创建）
│   │       └── ops/                  # Ops Copilot 专用子组件
│   │
│   ├── hooks/                        # 自定义 Hooks
│   │   ├── useDashboardStats.ts      # 仪表盘统计数据（TanStack Query）
│   │   ├── useOpsStream.ts           # SSE 流式消费（Fetch API + ReadableStream）
│   │   ├── useBingWallpaper.ts       # 必应壁纸随机获取
│   │   ├── use-mobile.ts             # 移动端检测
│   │   └── use-toast.ts              # Toast 通知
│   │
│   ├── lib/
│   │   ├── api.ts                    # 统一 API 客户端（fetchWithAuth + 401 自动跳转）
│   │   ├── validations.ts            # Zod 表单验证 Schema
│   │   ├── uploadImage.ts            # 图片上传工具（预签名流程 + MD5 去重）
│   │   ├── mdEditorCommands.ts       # Markdown 编辑器自定义命令
│   │   └── utils.ts                  # 通用工具函数（cn）
│   │
│   ├── stores/                       # Zustand 客户端状态
│   │   ├── useAuthStore.ts           # 认证状态（Token + User，持久化到 localStorage）
│   │   └── useAiChatStore.ts         # AI 助手聊天历史
│   │
│   ├── types/
│   │   └── index.ts                  # 全局 TypeScript 类型定义
│   │
│   └── proxy.ts                      # Next.js Middleware（路由保护 + 登录态重定向）
│
├── .github/workflows/
│   └── docker-publish.yml            # CI/CD：main 分支推送后自动构建并发布 Docker 镜像
│
├── next.config.ts                    # Next.js 配置（standalone 输出 + API 反向代理）
├── Dockerfile                        # 多阶段构建（deps → builder → runner）
├── components.json                   # Shadcn/UI 配置
├── tsconfig.json                     # TypeScript 配置
└── .env.local                        # 本地环境变量（不提交 Git）
```

---

## 功能模块

### 仪表盘（Dashboard）

- **实时业务统计**：从 Spring Boot Actuator Micrometer 指标端点拉取数据，展示文章总数、已发布文章数、评论总数、待审核评论数
- **系统健康状态**：定时请求 `/actuator/health`，显示后端服务及各依赖组件（MySQL、Redis 等）的健康状况
- **自动刷新**：业务指标每 30 秒刷新，健康状态每 60 秒刷新

### 文章管理（Articles）

- **列表展示**：分页展示文章，支持按关键词、状态（草稿 / 已发布 / 已归档）、分类、标签多维筛选
- **Markdown 编辑器**：基于 `@uiw/react-md-editor`，支持实时预览，内置图片上传自定义命令
- **封面图选择**：支持上传本地图片 or 从必应壁纸（近 7 天随机）中选择封面
- **文章属性配置**：
  - 文章类型：原创 / 转载 / 翻译
  - 置顶 / 精选标记
  - 禁用评论
  - 访问密码保护
- **生命周期管理**：草稿 → 发布 → 归档的完整状态流转

### 分类管理（Categories）

- **树形结构展示**：递归渲染多级分类树
- **增删改查**：支持创建子分类、调整排序、移动到其他父节点
- **文章数统计**：每个分类显示关联文章数

### 标签管理（Tags）

- **分页列表**：关键词搜索，分页展示标签
- **标签合并**：将重复标签合并到目标标签，自动迁移关联文章
- **批量创建**：文章编辑时可即时创建新标签，自动同步到标签库

### 评论管理（Comments）

- **分页列表**：按状态（待审核 / 已通过 / 已拒绝）过滤
- **审核操作**：通过、拒绝（填写原因）、强制删除（填写原因）
- **举报处理**：查看用户举报列表，对举报进行通过或拒绝处理

### 文件管理（Files）

- **预签名上传流程**：
  1. 前端计算文件 MD5（spark-md5）
  2. 后端返回预签名 PUT URL（支持 MD5 去重秒传）
  3. 前端直接 PUT 上传到 Bitiful OSS（绕过后端，减少带宽）
  4. 前端调用确认接口，后端标记上传完成
- **文件分类浏览**：按 IMAGE / VIDEO / DOCUMENT / OTHER 筛选
- **文件管理**：查看文件详情、获取访问 URL、删除文件

### AI 助手（AI Assistant）

侧边栏底部常驻入口，点击弹出 RAG 智能问答对话框：

- **RAG 问答**：基于已发布文章向量索引（Qdrant Cloud），通过通义千问生成答案
- **参考来源**：回答中附带相关文章列表，支持跳转阅读
- **多轮对话**：聊天历史存储在 Zustand Store

### Ops Copilot（AI 运维助手）

独立页面，提供自然语言驱动的服务器运维能力：

- **自然语言指令**：用户输入中文指令，AI 规划并执行运维任务
- **SSE 流式输出**：使用 Fetch API + ReadableStream 消费后端 SSE 流（支持携带 JWT，规避 EventSource 限制）
- **多事件类型**：
  - `message`：AI 逐 token 流式回复
  - `ops_log`：SSH 终端实时输出
  - `tool_call`：工具调用通知（显示正在执行的操作）
  - `done` / `error`：流结束信号
- **终端模拟**：以终端样式滚动展示 SSH 执行日志，带时间戳前缀
- **CI 事件追踪**：展示近期 GitHub Actions 运行记录（状态 + 结论）
- **多轮记忆**：通过 `sessionId` 维持会话上下文

---

## 架构设计

### API 通信

Next.js 服务端通过 `rewrites` 将请求代理到后端，规避跨域问题：

```
浏览器 → Next.js Server → backend:8080
  /api/*        →  /api/*
  /actuator/*   →  /actuator/*
```

> 代理目标通过运行时环境变量 `BACKEND_URL` 配置，Docker 网络中默认为 `http://backend:8080`，本地开发默认为 `http://localhost:8080`。

### 认证流程

```
登录成功
   │
   ├─ localStorage：存储 token（fetchWithAuth 读取，放入 Authorization Header）
   └─ Cookie：存储 token（Next.js Middleware 读取，做路由保护）

Token 过期（HTTP 401）→ 自动清除凭证 → 跳转 /login
```

- **路由保护**：`src/proxy.ts`（Next.js Middleware）在 Edge Runtime 中拦截请求，未携带 Cookie token 的 `/dashboard/**` 访问自动跳转登录页
- **Zustand 持久化**：认证状态通过 `persist` 中间件序列化到 `localStorage`，刷新页面不丢失登录态

### 文件上传（预签名流程）

```
前端                          后端                         Bitiful OSS
  │                            │                               │
  │── POST /files/presigned ──►│ 生成预签名 PUT URL             │
  │◄── { uploadUrl, fileId } ──│                               │
  │                            │                               │
  │── PUT {uploadUrl} ──────────────────────────────────────── ►│ 直传文件
  │                            │                               │
  │── PATCH /files/{id}/confirm►│ 标记上传完成                  │
  │◄── 200 OK ──────────────── │                               │
```

MD5 计算在前端同步执行（spark-md5），若文件 MD5 已存在，后端直接返回已有文件，实现秒传。

### Ops Copilot SSE 流

```
useOpsStream Hook
    │
    ├─ send(message) → fetch GET /api/v1/ops/chat?message=xxx
    │                        Headers: Authorization: Bearer <token>
    │
    ├─ ReadableStream 逐 chunk 读取
    │
    └─ parseSseChunk() 解析事件帧
           ├─ event: message   → streamingText += token（逐字追加）
           ├─ event: ops_log   → terminalLines.push（终端输出）
           ├─ event: tool_call → latestToolCall = { toolName }
           ├─ event: done      → status = 'done'
           └─ event: error     → status = 'error'
```

> 使用 Fetch API 而非 `EventSource` 的原因：`EventSource` 不支持自定义请求 Header，无法传递 JWT Token。

### 状态管理策略

| 数据类型 | 管理方案 | 说明 |
|:---|:---|:---|
| 服务端数据（文章、评论等） | TanStack Query | 自动缓存、失效、重新获取 |
| 认证状态（User + Token） | Zustand + persist | 持久化到 localStorage |
| AI 聊天历史 | Zustand | 内存存储，页面刷新丢失 |
| 本地表单状态 | React Hook Form + Zod | 表单验证 + 错误提示 |

---

## 本地开发

### 前置条件

- Node.js 20+（推荐使用 [vfox](https://vfox.linspiration.dev/) 管理，见 `.vfox.toml`）
- 后端服务已启动（`personal-blog-backend`，默认监听 `localhost:8080`）

### 启动步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# 3. 启动开发服务器（端口 3001，避免与 frontend:3000 冲突）
npm run dev
```

访问 http://localhost:3001

### 可用脚本

| 命令 | 说明 |
|:---|:---|
| `npm run dev` | 开发服务器（端口 3001，热重载） |
| `npm run build` | 构建生产包（standalone 输出） |
| `npm run start` | 启动生产服务（需先 build） |
| `npm run lint` | ESLint 代码检查 |

### 环境变量

| 变量 | 说明 | 本地默认值 |
|:---|:---|:---|
| `NEXT_PUBLIC_API_URL` | 后端 API 基础 URL（**构建时**打包进客户端 JS） | `http://localhost:8080` |
| `BACKEND_URL` | 服务端 rewrites 代理目标（**运行时**读取，仅服务端可见） | `http://localhost:8080` |

> ⚠️ `NEXT_PUBLIC_API_URL` 在 `next build` 时打包进客户端 JS，**运行时无法修改**。Docker 镜像的生产地址通过 CI/CD 构建参数注入（`https://api.chonkybird.com`）。

### 添加 Shadcn/UI 组件

```bash
npx shadcn@latest add button
npx shadcn@latest add table
npx shadcn@latest add form
```

---

## 构建与部署

### Docker 多阶段构建

| 阶段 | 基础镜像 | 作用 |
|:---|:---|:---|
| `deps` | `node:20-alpine` | 安装 npm 依赖（BuildKit 缓存挂载加速） |
| `builder` | `node:20-alpine` | 执行 `next build`，生成 standalone 产物 |
| `runner` | `node:20-alpine` | 仅包含运行时产物，最小化镜像体积 |

关键配置：

- `next.config.ts` 中 `output: 'standalone'`：生成自包含运行时，无需完整 `node_modules`
- 以非 root 用户（`appuser`）运行，符合安全规范
- `HEALTHCHECK`：每 30 秒 `wget` 探活 `http://localhost:3000/`

### GitHub Actions CI/CD

推送到 `main` 分支时自动触发 `.github/workflows/docker-publish.yml`：

```
push to main
     │
     ▼
Checkout → Docker Login → Setup Buildx → Build & Push
                                              │
                          标签：latest + sha-<commit>
                          构建参数：NEXT_PUBLIC_API_URL=https://api.chonkybird.com
                          缓存：GitHub Actions Cache（GHA）
```

**所需 GitHub Secrets / Variables：**

| 名称 | 类型 | 说明 |
|:---|:---|:---|
| `DOCKERHUB_USERNAME` | Variable | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Secret | Docker Hub Access Token |

### 运行 Docker 镜像

```bash
docker run -d \
  -p 3000:3000 \
  -e BACKEND_URL=http://your-backend:8080 \
  liusxml/personal-blog-admin:latest
```

---

## 后端 API 对应关系

| 模块 | 接口前缀 | 关键端点 |
|:---|:---|:---|
| 认证 | `/api/v1/auth` | `POST /login`，`POST /logout` |
| 用户 | `/api/v1/users` | `GET /me` |
| 文章（管理端） | `/api/v1/admin/articles` | CRUD + `/{id}/publish` + `/{id}/archive` + `/rebuild-embeddings` |
| 分类（管理端） | `/api/v1/admin/categories` | CRUD + `/tree` + `/{id}/move` |
| 标签（管理端） | `/api/v1/admin/tags` | CRUD + `/batch` + `/{id}/merge` |
| 评论（管理端） | `/api/v1/admin/comments` | 分页列表 |
| 评论审核 | `/api/v1/comments/audit` | `/{id}/approve`，`/{id}/reject`，`DELETE /{id}` |
| 评论举报 | `/api/v1/comments/reports` | 列表 + `/{id}/approve` + `/{id}/reject` |
| 文件 | `/api/v1/files` | 分页 + `/presigned` + `/{id}/confirm` + `/{id}/access-url` + `DELETE /{id}` |
| AI | `/api/v1/ai` | `POST /ask`（RAG 问答） |
| Ops | `/api/v1/ops` | `GET /chat`（SSE 流式运维） |
| 壁纸 | `/api/v1/admin/wallpapers` | `GET /bing`（必应随机壁纸） |
| Actuator | `/actuator` | `/health`，`/metrics`（通过 rewrites 代理） |

---

## 开发规范

### 组件规范

- 默认使用 Server Component，需要客户端交互时在文件顶部声明 `'use client'`
- 业务组件放 `components/features/`，UI 基础组件通过 `npx shadcn@latest add` 生成到 `components/ui/`（不要手动修改）
- 所有表单必须使用 Zod Schema 验证，配合 `react-hook-form` 的 `@hookform/resolvers` 使用

### 数据获取规范

```tsx
// ✅ 服务端数据：TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['articles', query],
  queryFn: () => getArticles(query),
})

// ✅ 变更操作：useMutation + 使缓存失效
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: deleteArticle,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['articles'] }),
})
```

### API 客户端规范

所有带鉴权的请求通过 `fetchWithAuth<T>` 统一处理：

```ts
// ✅ 自动：携带 Authorization Header、处理 401、解包 ApiResponse<T>
const article = await fetchWithAuth<ArticleDetailVO>(`/api/v1/admin/articles/${id}`)
```

### 文件命名规范

| 类型 | 命名规范 | 示例 |
|:---|:---|:---|
| 页面 | `page.tsx` | `app/articles/page.tsx` |
| 布局 | `layout.tsx` | `app/(dashboard)/layout.tsx` |
| 组件 | PascalCase | `ArticleCard.tsx` |
| Hooks | camelCase + `use` 前缀 | `useArticles.ts` |
| Stores | camelCase + `use` 前缀 | `useAuthStore.ts` |
| 工具函数 | camelCase | `uploadImage.ts` |
| 类型文件 | camelCase | `index.ts` |

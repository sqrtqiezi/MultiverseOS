# MultiverseOS — 组件清单

## Core 包组件

### Store 层

| 组件 | 文件 | 用途 |
|------|------|------|
| `VerseStore` | `core/src/store/verse-store.ts` | Verse 实体的增删改查 |
| `RunStore` | `core/src/store/run-store.ts` | 会话生命周期管理 |
| `EventStore` | `core/src/store/event-store.ts` | 事件与步骤日志记录 |

### Engine 层

| 组件 | 文件 | 用途 |
|------|------|------|
| `IngestEngine` | `core/src/engine/ingest.ts` | Hook 事件 → 数据库管道 |
| `classifyKind()` | `core/src/engine/ingest.ts` | 工具名称 → 步骤类型映射 |
| `buildSummary()` | `core/src/engine/ingest.ts` | 事件 → 可读摘要生成 |

### 基础设施

| 组件 | 文件 | 用途 |
|------|------|------|
| `createDb()` | `core/src/db.ts` | 基于文件的 SQLite 连接 |
| `createMemoryDb()` | `core/src/db.ts` | 用于测试的内存数据库 |
| `migrateDb()` | `core/src/db.ts` | Schema 迁移（幂等） |
| `newVerseId()` 等 | `core/src/id.ts` | 基于 ULID 的 ID 生成器 |

---

## CLI 包组件

### 命令（13 个）

| 命令 | 文件 | 描述 |
|------|------|------|
| `init` | `cli/src/commands/init.ts` | 项目初始化 |
| `create` | `cli/src/commands/create.ts` | 创建 verse + git 分支 |
| `serve` | `cli/src/commands/serve.ts` | 启动 HTTP 服务器 |
| `list` | `cli/src/commands/list.ts` | 列出 verse |
| `show` | `cli/src/commands/show.ts` | 显示 verse 详情 |
| `fork` | `cli/src/commands/fork.ts` | 分叉 verse |
| `diff` | `cli/src/commands/df.ts` | 比较 verse 配置 |
| `runs` | `cli/src/commands/runs.ts` | 列出运行记录 |
| `inspect` | `cli/src/commands/inspect.ts` | 运行详情 |
| `timeline` | `cli/src/commands/timeline.ts` | 步骤时间线 |
| `events` | `cli/src/commands/events.ts` | 原始事件导出 |
| `bind` | `cli/src/commands/bind.ts` | 将运行绑定到 verse |
| `cost` | `cli/src/commands/cost.ts` | 费用汇总 |
| `ui` | `cli/src/commands/ui.ts` | 打开浏览器 |

### 服务器

| 组件 | 文件 | 用途 |
|------|------|------|
| `createServer()` | `cli/src/server.ts` | 包含所有路由的 Hono 应用 |
| `startServer()` | `cli/src/server.ts` | 监听 7777 端口的 HTTP 服务 |
| `drainBuffer()` | `cli/src/buffer-drain.ts` | JSONL 缓冲区数据摄入 |

---

## Hooks 包组件

| 组件 | 文件 | 用途 |
|------|------|------|
| `readStdin()` | `hooks/src/common.ts` | 从 stdin 解析 JSON（1 秒超时） |
| `buildPayload()` | `hooks/src/common.ts` | 标准化事件载荷 |
| `sendEvent()` | `hooks/src/common.ts` | POST 到摄入端点（2 秒超时） |
| `getGitBranch()` | `hooks/src/common.ts` | Git 分支检测 |
| `pre-tool-use.ts` | `hooks/src/pre-tool-use.ts` | PreToolUse hook 脚本 |
| `post-tool-use.ts` | `hooks/src/post-tool-use.ts` | PostToolUse hook 脚本 |
| `stop.ts` | `hooks/src/stop.ts` | Stop hook 脚本 |
| `notification.ts` | `hooks/src/notification.ts` | Notification hook 脚本 |

---

## UI 包组件

### 视图

| 组件 | 文件 | 用途 |
|------|------|------|
| `App` | `ui/src/App.tsx` | 根组件，导航状态管理 |
| `VerseListView` | `ui/src/views/VerseListView.tsx` | Verse 列表（含嵌套运行记录） |
| `TimelineView` | `ui/src/views/TimelineView.tsx` | 运行步骤时间线 |

### 可复用组件

| 组件 | 文件 | 用途 |
|------|------|------|
| `StepCard` | `ui/src/components/StepCard.tsx` | 步骤展示卡片（图标、时间、费用） |

### 工具函数

| 组件 | 文件 | 用途 |
|------|------|------|
| `fetchVerses()` | `ui/src/api.ts` | GET /api/verses |
| `fetchRuns()` | `ui/src/api.ts` | GET /api/runs |
| `fetchTimeline()` | `ui/src/api.ts` | GET /api/runs/:id/timeline |
| `fetchEvents()` | `ui/src/api.ts` | GET /api/runs/:id/events |

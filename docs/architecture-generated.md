# MultiverseOS — 架构文档

## 1. 系统概述

MultiverseOS 是一个面向 Claude Code 的本地优先实验管理层。它通过 hooks 捕获 Claude Code 会话中的工具使用事件，将其持久化到本地 SQLite 数据库，并提供 CLI 和 Web 界面进行浏览。

### 架构风格

事件溯源、本地优先、monorepo 架构，包含 4 个通过 workspace 依赖和 HTTP API 通信的包。

### 数据流

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code Session                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │PreToolUse│  │PostToolUse│  │   Stop   │  │Notification│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
└───────┼──────────────┼──────────────┼──────────────┼────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│ @multiverseos/hooks                                         │
│  readStdin() → buildPayload() → sendEvent()                │
│  Fallback: append to ~/.multiverseos/buffer.jsonl           │
└────────────────────────┬────────────────────────────────────┘
                         │ POST /api/events
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ @multiverseos/cli (Hono HTTP Server, port 7777)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Event Ingest │  │  REST API    │  │ Static UI Serve  │  │
│  │ POST /events │  │ GET /verses  │  │ SPA fallback     │  │
│  └──────┬───────┘  │ GET /runs    │  └──────────────────┘  │
│         │          │ GET /timeline│                          │
│         ▼          └──────────────┘                          │
│  IngestEngine                                                │
│  findOrCreate(run) → insertStep() → insertEvent()           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ @multiverseos/core (SQLite + Drizzle ORM)                   │
│  ┌────────┐ ┌──────┐ ┌───────┐ ┌────────┐ ┌────────────┐  │
│  │ verses │ │ runs │ │ steps │ │ events │ │ artifacts  │  │
│  └────────┘ └──────┘ └───────┘ └────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │ fetch /api/*
┌─────────────────────────────────────────────────────────────┐
│ @multiverseos/ui (React 19 + Vite + Tailwind)               │
│  App → VerseListView / TimelineView                         │
│  Proxy: /api/* → http://127.0.0.1:7777                     │
└─────────────────────────────────────────────────────────────┘
```

## 2. 包架构

### 2.1 @multiverseos/core

**职责**：数据层 — 模式定义、存储类、事件摄取引擎。

**数据库模式**（5 张表）：

| 表名 | 主键 | 关键字段 | 用途 |
|------|------|---------|------|
| `verses` | `verse_[ulid]` | name (unique), gitBranch, parentId, config (JSON) | 实验定义 |
| `runs` | `run_[ulid]` | verseId (FK), claudeSessionId, status, totalCostUsd, totalTokens | 会话记录 |
| `steps` | `step_[ulid]` | runId (FK), seq, kind, toolName, summary, costUsd, tokens | 逻辑操作 |
| `events` | `evt_[ulid]` | runId (FK), stepId (FK), type, source, attrs (JSON) | 原始事件日志 |
| `artifacts` | `art_[ulid]` | runId (FK), stepId (FK), type, path, hash, meta (JSON) | 生成产物 |

**Store 类**：
- `VerseStore` — verse 的增删改查（create, getById, getByName, getByBranch, list）
- `RunStore` — 会话管理（findOrCreate, end, bindVerse, listByVerse）
- `EventStore` — 事件/步骤记录（insert, insertStep, endStep, listByRun, listStepsByRun）

**IngestEngine**：处理 HookEvent 载荷：
1. 根据 session_id 查找或创建 run
2. 根据 git_branch 自动绑定 verse
3. 处理 Stop → 结束 run
4. 处理 PreToolUse → 创建 step
5. 处理 PostToolUse → 结束 step
6. 始终插入 event 记录

**工具分类**：
- Edit, Write → `file_edit`
- Agent → `subagent`
- Bash, Read, Glob, Grep 等 → `tool_call`

### 2.2 @multiverseos/cli

**职责**：面向用户的 CLI（`verse` 命令）+ HTTP 服务器。

**13 个命令**：

| 命令 | 说明 |
|------|------|
| `verse init` | 初始化项目，创建数据库，注册 hooks |
| `verse create <name>` | 创建 verse 并关联 git 分支 |
| `verse serve` | 启动 HTTP 服务器（端口 7777） |
| `verse list` | 列出所有 verse |
| `verse show <name>` | 显示 verse 详情 |
| `verse fork <src> <new>` | 从已有 verse 派生新 verse |
| `verse diff <a> <b>` | 比较 verse 配置 |
| `verse runs` | 列出 run |
| `verse inspect <run>` | 显示 run 详情 |
| `verse timeline <run>` | 显示步骤时间线 |
| `verse events <run>` | 导出原始事件 |
| `verse bind <run> <verse>` | 将孤立 run 绑定到 verse |
| `verse cost` | 显示费用汇总 |
| `verse ui` | 在浏览器中打开 Web UI |

**HTTP 服务器**（Hono）：
- `POST /api/events` — 事件摄取端点
- `GET /api/verses`, `GET /api/verses/:id` — verse 查询
- `POST /api/verses` — 创建 verse
- `GET /api/runs`, `GET /api/runs/:id` — run 查询
- `GET /api/runs/:id/events` — 事件列表
- `GET /api/runs/:id/timeline` — 步骤时间线
- 静态文件服务（UI），支持 SPA fallback

**缓冲区排空**：服务器启动时读取 `~/.multiverseos/buffer.jsonl` 并摄取缓冲的事件。

### 2.3 @multiverseos/hooks

**职责**：Claude Code hook 脚本，用于捕获会话事件。

**4 种 Hook 类型**（均遵循相同模式）：
1. `pre-tool-use.ts` — 工具调用前
2. `post-tool-use.ts` — 工具完成后
3. `stop.ts` — 会话结束
4. `notification.ts` — 通用通知

**执行流程**：`readStdin()` → `buildPayload()` → `getGitBranch()` → `sendEvent()`

**容错机制**：stdin 超时 1 秒，HTTP 超时 2 秒，失败时回退写入 JSONL 缓冲文件。

### 2.4 @multiverseos/ui

**职责**：Web 仪表盘，用于可视化 verse、run 和时间线。

**组件**：
- `App` — 根组件，管理导航状态
- `VerseListView` — 列出 verse 及其嵌套的 run
- `TimelineView` — 所选 run 的步骤时间线
- `StepCard` — 单个步骤展示，包含图标、耗时、费用

**状态管理**：仅使用 React hooks（useState, useEffect），无全局状态库。

**API 客户端**（`api.ts`）：基于 fetch，4 个端点（verses, runs, timeline, events）。

**样式**：Tailwind CSS v4.2，通过 Vite 插件集成。

## 3. 跨包集成

```
hooks ──POST──→ cli/server ──uses──→ core/IngestEngine
                cli/server ──uses──→ core/stores
                cli/commands ──uses──→ core/stores
ui ──fetch──→ cli/server (via /api/* proxy)
```

**依赖关系图**：
- `core` → 独立（无 workspace 依赖）
- `hooks` → 独立（无 workspace 依赖）
- `cli` → 依赖 `core`（workspace:*）
- `ui` → 独立（通过 HTTP 连接）

## 4. 数据存储

- **数据库**：`.multiverseos/multiverseos.db`（SQLite，WAL 模式，外键约束开启）
- **缓冲区**：`~/.multiverseos/buffer.jsonl`（服务器不可用时的回退存储）
- **初始化**：`migrateDb()` 幂等地创建所有表和索引

## 5. ID 策略

基于 ULID，带实体前缀：`verse_`, `run_`, `step_`, `evt_`, `art_`

优势：字典序可排序、按时间排列、前缀可读性强。
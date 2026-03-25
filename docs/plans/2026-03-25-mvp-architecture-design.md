# MultiverseOS MVP 全局架构设计

> 日期: 2026-03-25
> 状态: 已批准

## 1. 概述

MultiverseOS 是面向 Claude Code 的多分支实验操作系统。MVP 目标是建立"可观测的实验管理层"：通过 Claude Code hooks 自动采集开发过程数据，以 Verse（实验配方 + git branch）为单位组织实验，提供 Timeline UI 可视化。

### 核心概念

- **Verse**: 一次实验的完整定义，1:1 绑定一个 git branch。包含模型配置、skills、plugins、权限策略等"配方"信息。
- **Run**: 一次 Claude Code 会话的自动记录。用户无需主动创建，hooks 自动采集。
- **Step**: Run 中的一个逻辑步骤（工具调用、文件编辑、测试等）。
- **Event**: 原始事件记录，append-only。
- **Artifact**: 工件（diff、测试报告、日志等）。

### 设计决策摘要

| 决策 | 选择 | 理由 |
|---|---|---|
| 技术栈 | TypeScript 全栈 | 生态成熟、与 Claude Code 插件体系天然对齐 |
| 交付形态 | CLI + 轻量 Web UI | 平衡可用性和开发成本 |
| 架构策略 | 渐进式（hooks → tool plane） | MVP 先做观测，后续接管执行层 |
| 存储 | SQLite + 本地文件系统 | 零依赖、即开即用、可移植 |
| UI 框架 | React (Vite + TailwindCSS) | 快速迭代 |
| 部署模型 | 本地优先 | 零基础设施依赖 |
| Verse ↔ Git | 1:1 绑定 | 简单直观，Run 通过 cwd 自动归属 |
| Run 创建 | 全自动（零操作） | hooks 被动采集，不改变用户工作流 |

## 2. 项目结构

```
multiverseos/
├── package.json                    # 根 monorepo（pnpm workspaces）
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── core/                       # 核心库：数据模型 + 存储 + 事件引擎
│   │   ├── src/
│   │   │   ├── models/             # Verse, Run, Step, Event, Artifact
│   │   │   ├── store/              # SQLite 存储层（drizzle-orm）
│   │   │   ├── engine/             # 事件处理引擎（摄取、关联、聚合）
│   │   │   └── index.ts
│   │   └── package.json
│   ├── cli/                        # CLI 工具：verse 命令
│   │   ├── src/
│   │   │   ├── commands/           # create, list, show, fork, serve, ui...
│   │   │   └── index.ts
│   │   └── package.json
│   ├── hooks/                      # Claude Code hooks 脚本
│   │   ├── src/
│   │   │   ├── pre-tool-use.ts
│   │   │   ├── post-tool-use.ts
│   │   │   ├── notification.ts
│   │   │   ├── stop.ts
│   │   │   └── ingest-client.ts    # HTTP 推送到 verse serve
│   │   └── package.json
│   └── ui/                         # React SPA
│       ├── src/
│       │   ├── views/              # VerseListView, TimelineView
│       │   ├── components/         # EventCard, DiffViewer, CostBadge
│       │   └── App.tsx
│       └── package.json
└── docs/
    └── plans/
```

## 3. 数据模型

### Verse（逻辑分支 / 实验配方）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | `verse_<ulid>` |
| name | TEXT UNIQUE | 用户命名，如 `sonnet46-deploy-v2` |
| parent_id | TEXT? FK | 父 verse id（fork 来源） |
| git_branch | TEXT | 绑定的 git branch 名 |
| fork_from_commit | TEXT? | fork 时的源 commit SHA |
| config | JSON | 完整配方：model, skills, plugins, permissions, workflow |
| created_at | TEXT | ISO timestamp |

### Run（一次 Claude Code 会话）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | `run_<ulid>` |
| verse_id | TEXT? FK | 所属 verse（可后续绑定） |
| repo_commit | TEXT? | 开始时的 git commit SHA |
| git_branch | TEXT? | 所在 git branch |
| worktree_path | TEXT? | git worktree 路径 |
| claude_session_id | TEXT | Claude Code session id |
| status | TEXT | `running` / `completed` / `failed` / `aborted` |
| started_at | TEXT | |
| ended_at | TEXT? | |
| total_cost_usd | REAL? | 累计成本 |
| total_tokens | INT? | 累计 token |

### Step（步骤）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | `step_<ulid>` |
| run_id | TEXT FK | |
| seq | INT | 序号 |
| kind | TEXT | `user_prompt` / `tool_call` / `file_edit` / `test` / `subagent` |
| tool_name | TEXT? | 工具名 |
| summary | TEXT | 步骤摘要 |
| started_at | TEXT | |
| ended_at | TEXT? | |
| cost_usd | REAL? | |
| tokens | INT? | |

### Event（原始事件，append-only）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | `evt_<ulid>` |
| run_id | TEXT FK | |
| step_id | TEXT? FK | 关联步骤 |
| ts | TEXT | 时间戳 |
| source | TEXT | `hook` / `statusline` / `otel` |
| type | TEXT | `PreToolUse` / `PostToolUse` / `Notification` / `Stop` |
| attrs | JSON | 事件属性 |
| payload_ref | TEXT? | 工件引用 |

### Artifact（工件）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | `art_<ulid>` |
| run_id | TEXT FK | |
| step_id | TEXT? FK | |
| type | TEXT | `diff` / `snapshot` / `test_report` / `transcript_chunk` |
| path | TEXT | 本地文件路径 |
| hash | TEXT | SHA-256 |
| created_at | TEXT | |
| meta | JSON? | 额外元数据 |

## 4. 事件采集管道

### 数据流

```
Claude Code 会话
  │
  ├── PreToolUse hook ──→ HTTP POST /api/events ──→ Ingest Engine ──→ SQLite
  ├── PostToolUse hook ─→ HTTP POST /api/events ──→ Ingest Engine ──→ SQLite
  ├── Notification hook → HTTP POST /api/events ──→ Ingest Engine ──→ SQLite
  └── Stop hook ────────→ HTTP POST /api/runs/end → 结束 run，汇总成本
```

### Hooks 配置

`verse init` 在 Claude Code settings 中注册以下 hooks：

```json
{
  "hooks": {
    "PreToolUse": [{
      "type": "command",
      "command": "node <hooks-dir>/pre-tool-use.js"
    }],
    "PostToolUse": [{
      "type": "command",
      "command": "node <hooks-dir>/post-tool-use.js"
    }],
    "Notification": [{
      "type": "command",
      "command": "node <hooks-dir>/notification.js"
    }],
    "Stop": [{
      "type": "command",
      "command": "node <hooks-dir>/stop.js"
    }]
  }
}
```

### Hook 采集字段

| Hook 事件 | 采集内容 |
|---|---|
| PreToolUse | tool_name, input (命令/文件路径), session_id, cwd |
| PostToolUse | tool_name, output 摘要, 耗时, stdout/stderr (truncated) |
| Notification | 模型生成的摘要文本、成本/token 快照 |
| Stop | session 结束信号、最终成本/token 合计 |

### Ingest Engine 处理流程

1. 验证 & 规范化：校验必要字段，补全时间戳
2. Run 关联：按 session_id 查找活跃 run；若无则自动创建
3. Verse 关联：按 cwd 推断 git branch → 匹配 verse；无匹配归入 `default`
4. Step 关联：按 tool_use_id 关联或创建 Step
5. 写入 Event 表（append-only）
6. 工件提取：如果事件含 diff/test output，存入 artifacts/
7. 聚合更新：更新 Run 的 total_cost、total_tokens

### 离线容错

如果 `verse serve` 未运行，hooks 脚本将事件写入 `~/.multiverseos/buffer.jsonl`，下次启动时自动消费。

## 5. CLI 命令体系

```bash
verse init                            # 初始化：创建数据目录、注册 hooks
verse serve                           # 启动本地服务（API + UI）

# verse（实验配方）管理
verse create <name> [--from <id>]     # 创建新 verse（含 git branch）
verse list                            # 列出所有 verse
verse show <id|name>                  # 查看 verse 配方
verse diff <a> <b>                    # 对比两个 verse 配方
verse fork <src> <name> [--at <sha>]  # 从任意 commit 分叉新 verse

# run 查询（只读，自动采集）
verse runs [--verse <id>]             # 列出 runs
verse inspect <run-id>                # 查看 run 详情
verse timeline <run-id>               # 终端时间线
verse events <run-id> [--type <t>]    # 原始事件流
verse bind <run-id> <verse>           # 把 orphan run 绑定到 verse

# 其他
verse cost [--verse <id>] [--last 7d] # 成本汇总
verse ui                              # 在浏览器中打开 UI
```

### verse fork 流程

```bash
verse fork sonnet46-deploy-v2 try-alt-approach --at abc123

# 执行：
# 1. 从 abc123 创建新 git branch: try-alt-approach
# 2. 复制源 verse 的配方到新 verse（可选修改）
# 3. 记录 parent_id 和 fork_from_commit
```

## 6. HTTP API

```
POST   /api/events              # hooks 事件摄取
GET    /api/verses               # 列出所有 verse
GET    /api/verses/:id           # verse 详情（含配方）
POST   /api/verses               # 创建 verse
GET    /api/runs                 # 列出 runs（支持 ?verse_id= 过滤）
GET    /api/runs/:id             # run 详情
GET    /api/runs/:id/events      # run 的事件流
GET    /api/runs/:id/timeline    # run 的时间线（聚合为 steps）
GET    /api/runs/:id/artifacts   # run 的工件列表
GET    /api/runs/:id/stream      # SSE 实时事件推送
GET    /api/artifacts/:id        # 获取工件内容
GET    /api/cost                 # 成本汇总
```

## 7. Timeline UI

### Verse 列表视图（首页）

展示所有 verse 及其 run 统计：名称、git branch、run 数量、最近活动时间、累计成本。

### Run Timeline 视图（核心）

按时间轴展示 run 中的所有 steps：
- 每个 step 显示：时间戳、工具名、摘要、耗时、成本
- 文件编辑 step 可展开查看 diff
- 测试 step 显示通过/失败计数
- 底部汇总：总成本、总 token、总时长

### 技术实现

- Vite + React + TailwindCSS
- `verse serve` 同时服务 API 和静态前端资源
- SSE 实时更新（run 进行中时自动滚动）

## 8. 技术依赖

| 依赖 | 用途 |
|---|---|
| pnpm | monorepo 包管理 |
| better-sqlite3 | SQLite 驱动 |
| drizzle-orm | 数据库 schema & 查询 |
| Hono | HTTP 服务框架 |
| commander | CLI 框架 |
| Vite + React | 前端构建 + UI |
| TailwindCSS | 样式 |
| ulid | ID 生成 |
| zod | 运行时校验 |

## 9. 安全边界

- 不存储 prompt/response 全文，只保存工具名、摘要、成本等元数据
- Artifacts（diff、测试报告）按需保存，默认存本地
- API 仅监听 `127.0.0.1:7777`
- hooks 脚本不采集环境变量值，只采集名称

## 10. 目录约定

```
~/.multiverseos/                     # 全局配置
├── config.toml                      # 默认端口等
└── buffer.jsonl                     # 离线事件缓冲

<project-root>/
├── .multiverseos/                   # 项目级数据
│   ├── multiverseos.db              # SQLite 数据库
│   └── artifacts/                   # 工件存储
└── .verse                           # 当前活跃 verse id（可选）
```

## 11. MVP 不做的事

| 不做 | 计划阶段 |
|---|---|
| Run 对比（并排对比两次 run） | V1 |
| Proxy replay（记录回放） | V1 |
| Fork-from-step（步骤级分叉） | V1 |
| OTel 集成 | V1 |
| Tool Plane 接管（MCP 虚拟化） | V1/V2 |
| 多用户 / 认证 | V2 |
| Workspace snapshot（完整快照） | V1 |

## 12. 演进路线

```
MVP: hooks 采集 + Run Ledger + Verse 管理 + Timeline UI
 ↓
V1:  Run 对比 + OTel + workspace snapshot + fork-from-step + proxy replay
 ↓
V2:  Tool Plane 接管 + 多用户 + 审计重跑 + 安全治理
```

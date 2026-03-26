# MultiverseOS MVP 架构

> 日期: 2026-03-25
> 状态: 实施中

## 概述

MultiverseOS 是面向 Claude Code 的多分支实验操作系统。通过 hooks 自动采集开发过程数据，以 Verse（实验配方 + git branch）为单位组织实验，提供 Timeline UI 可视化。

### 核心概念

- **Verse**: 实验配方（模型 + skills + plugins + 权限）1:1 绑定 git branch
- **Run**: Claude Code 会话的自动记录
- **Step**: Run 中的逻辑步骤（工具调用、编辑、测试）
- **Event**: 原始事件（append-only）
- **Artifact**: 工件（diff、日志、测试报告）

### 设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 技术栈 | TypeScript 全栈 | 与 Claude Code 生态对齐 |
| 交付形态 | CLI + Web UI | 平衡可用性和成本 |
| 存储 | SQLite + 本地文件 | 零依赖、即开即用 |
| UI 框架 | React + Vite + Tailwind | 快速迭代 |
| 部署 | 本地优先 | 零基础设施依赖 |
| Run 创建 | 全自动 | hooks 被动采集 |

## 数据模型

### Verse（实验配方）

```typescript
{
  id: string              // verse_<ulid>
  name: string            // 用户命名
  parent_id?: string      // 父 verse（fork 来源）
  git_branch: string      // 绑定的 git branch
  config: {               // 完整配方
    model: string
    skills: Array<{name, path, hash}>
    plugins: Array<{source, name, version, hash}>
    permissions: object
  }
  created_at: string
}
```

### Run（会话记录）

```typescript
{
  id: string              // run_<ulid>
  verse_id?: string       // 所属 verse
  repo_commit?: string    // git commit SHA
  git_branch?: string     // git branch
  claude_session_id: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  ended_at?: string
  total_cost_usd?: number
  total_tokens?: number
}
```

### Step（步骤）

```typescript
{
  id: string              // step_<ulid>
  run_id: string
  seq: number             // 序号
  kind: 'user_prompt' | 'tool_call' | 'file_edit' | 'test'
  tool_name?: string
  summary: string
  started_at: string
  ended_at?: string
  cost_usd?: number
  tokens?: number
}
```

### Event（原始事件）

```typescript
{
  id: string              // evt_<ulid>
  run_id: string
  step_id?: string
  ts: string              // 时间戳
  source: 'hook' | 'statusline' | 'otel'
  type: 'PreToolUse' | 'PostToolUse' | 'Notification' | 'Stop'
  attrs: object           // 事件属性
  payload_ref?: string    // 工件引用
}
```

### Artifact（工件）

```typescript
{
  id: string              // art_<ulid>
  run_id: string
  step_id?: string
  type: 'diff' | 'snapshot' | 'test_report' | 'transcript_chunk'
  path: string            // 本地文件路径
  hash: string            // SHA-256
  created_at: string
  meta?: object
}
```

## 事件采集管道

### 数据流

```
Claude Code 会话
  │
  ├── PreToolUse hook ──→ HTTP POST /api/events ──→ Ingest Engine ──→ SQLite
  ├── PostToolUse hook ─→ HTTP POST /api/events ──→ Ingest Engine ──→ SQLite
  ├── Notification hook → HTTP POST /api/events ──→ Ingest Engine ──→ SQLite
  └── Stop hook ────────→ HTTP POST /api/runs/end → 结束 run
```

### Hooks 配置

`verse init` 在 `~/.claude/settings.json` 中注册：

```json
{
  "hooks": [
    {
      "type": "PreToolUse",
      "command": "node <hooks-dir>/pre-tool-use.js"
    },
    {
      "type": "PostToolUse",
      "command": "node <hooks-dir>/post-tool-use.js"
    },
    {
      "type": "Notification",
      "command": "node <hooks-dir>/notification.js"
    },
    {
      "type": "Stop",
      "command": "node <hooks-dir>/stop.js"
    }
  ]
}
```

### Ingest Engine 处理流程

1. 验证 & 规范化
2. Run 关联（按 session_id）
3. Verse 关联（按 cwd → git branch）
4. Step 关联（按 tool_use_id）
5. 写入 Event 表
6. 工件提取
7. 聚合更新（成本、token）

### 离线容错

hooks 脚本在 `verse serve` 未运行时将事件写入 `~/.multiverseos/buffer.jsonl`，下次启动自动消费。

## CLI 命令

```bash
verse init                            # 初始化
verse serve                           # 启动服务

# verse 管理
verse create <name> [--from <id>]     # 创建 verse
verse list                            # 列出 verses
verse show <id|name>                  # 查看详情
verse diff <a> <b>                    # 对比配方
verse fork <src> <name>               # 分叉

# run 查询
verse runs [--verse <id>]             # 列出 runs
verse inspect <run-id>                # run 详情
verse timeline <run-id>               # 时间线
verse events <run-id>                 # 原始事件
verse bind <run-id> <verse>           # 绑定 run

# 其他
verse cost [--verse <id>]             # 成本汇总
verse ui                              # 打开 UI
```

## HTTP API

```
POST   /api/events              # hooks 事件摄取
GET    /api/verses              # 列出 verses
GET    /api/verses/:id          # verse 详情
POST   /api/verses              # 创建 verse
GET    /api/runs                # 列出 runs
GET    /api/runs/:id            # run 详情
GET    /api/runs/:id/events     # run 事件流
GET    /api/runs/:id/timeline   # run 时间线
GET    /api/runs/:id/stream     # SSE 实时推送
GET    /api/artifacts/:id       # 获取工件
GET    /api/cost                # 成本汇总
```

## Timeline UI

### Verse 列表视图

展示所有 verse 及统计：名称、git branch、run 数量、最近活动、累计成本。

### Run Timeline 视图

按时间轴展示 steps：
- 时间戳、工具名、摘要、耗时、成本
- 文件编辑可展开查看 diff
- 测试显示通过/失败
- 底部汇总：总成本、总 token、总时长

### 技术实现

- Vite + React + TailwindCSS
- `verse serve` 同时服务 API 和静态资源
- SSE 实时更新

## 技术依赖

| 依赖 | 用途 |
|---|---|
| pnpm | monorepo 管理 |
| better-sqlite3 | SQLite 驱动 |
| drizzle-orm | 数据库 ORM |
| Hono | HTTP 框架 |
| commander | CLI 框架 |
| Vite + React | 前端 |
| TailwindCSS | 样式 |
| ulid | ID 生成 |

## 安全边界

- 不存储 prompt/response 全文，只保存元数据
- Artifacts 按需保存，默认本地
- API 仅监听 `127.0.0.1:7777`
- hooks 不采集环境变量值

## 目录约定

```
~/.multiverseos/
├── config.toml
└── buffer.jsonl

<project-root>/
├── .multiverseos/
│   ├── multiverseos.db
│   └── artifacts/
└── .verse                # 当前活跃 verse id
```

## MVP 范围

**包含**：
- hooks 采集 + Run Ledger
- Verse 管理（创建、列表、对比）
- Timeline UI（可视化 + 实时更新）
- 成本汇总

**不包含**（后续版本）：
- Run 对比
- Proxy replay
- Fork-from-step
- OTel 集成
- Tool Plane 接管
- 多用户/认证

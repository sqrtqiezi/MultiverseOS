# MultiverseOS — 集成架构

## 包间通信

```
┌──────────────┐     stdin/JSON      ┌──────────────┐
│ Claude Code  │ ──────────────────→ │    hooks     │
│  (Session)   │                     │ (4 scripts)  │
└──────────────┘                     └──────┬───────┘
                                            │
                                   POST /api/events
                                   (or buffer.jsonl)
                                            │
                                            ▼
┌──────────────┐     fetch /api/*    ┌──────────────┐
│      ui      │ ←─────────────────→ │     cli      │
│ (React SPA)  │                     │ (Hono server)│
└──────────────┘                     └──────┬───────┘
                                            │
                                   workspace:* import
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │     core     │
                                     │  (SQLite DB) │
                                     └──────────────┘
```

## 集成点

| 来源 | 目标 | 类型 | 协议 | 详情 |
|------|------|------|------|------|
| Claude Code | hooks | stdin | JSON pipe | Hook 脚本通过 process.stdin 接收事件数据 |
| hooks | cli/server | HTTP | POST /api/events | 事件载荷，2 秒超时 |
| hooks | 文件系统 | File I/O | JSONL append | 回退缓冲区位于 `~/.multiverseos/buffer.jsonl` |
| cli/server | core | Import | workspace:* | 通过 pnpm workspace 直接调用函数 |
| ui | cli/server | HTTP | REST API | Vite 代理 `/api/*` → `http://127.0.0.1:7777` |
| cli/commands | core | Import | workspace:* | 所有 CLI 操作直接调用函数 |
| cli/server | 文件系统 | File I/O | Static serve | UI 构建产物作为静态文件提供 |

## 依赖关系图

```
hooks (独立)
  └─→ cli/server (通过 HTTP)

core (独立)
  └─→ cli (通过 workspace:*)

ui (独立)
  └─→ cli/server (通过 HTTP proxy)
```

**构建依赖**：
- `core` 必须在 `cli` 之前构建（workspace 依赖）
- `hooks` 和 `ui` 可以独立构建
- `pnpm -r build` 会自动处理拓扑排序

## 数据流：Hook 事件生命周期

1. Claude Code 调用一个工具
2. Hook 脚本（`pre-tool-use.ts`）通过 stdin 接收事件
3. Hook 构建载荷并 POST 到 `/api/events`
4. 如果服务器不可用，事件追加写入 `buffer.jsonl`
5. 服务器的 `IngestEngine.ingest()` 处理事件：
   - 根据 session_id 查找或创建 Run
   - 根据 git_branch 自动绑定 Verse
   - 创建 Step（PreToolUse）或结束 Step（PostToolUse）
   - 插入 Event 记录
6. UI 通过 REST API 获取数据进行可视化展示

## 共享数据契约

### HookEvent (hooks → cli)

```typescript
interface HookEvent {
  session_id: string;
  cwd: string;
  type: "PreToolUse" | "PostToolUse" | "Stop" | "Notification";
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  git_branch?: string;
  transcript_path?: string;
}
```

### API 类型 (cli → ui)

```typescript
interface Verse { id, name, parentId, gitBranch, config, createdAt }
interface Run { id, verseId, claudeSessionId, status, startedAt, endedAt, totalCostUsd, totalTokens }
interface Step { id, runId, seq, kind, toolName, summary, startedAt, endedAt, costUsd, tokens }
```

注意：类型在 `ui/src/api.ts` 中独立定义（未从 core 共享）。这是潜在的类型漂移来源。

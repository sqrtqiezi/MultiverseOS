# MultiverseOS — API 契约

## 基础 URL

`http://127.0.0.1:7777/api`

## 端点

### 事件摄入

#### `POST /api/events`

从 Claude Code 摄入 hook 事件。

**请求体** (`HookEvent`):
```json
{
  "session_id": "string",
  "cwd": "string",
  "type": "PreToolUse | PostToolUse | Stop | Notification",
  "tool_name": "string (optional)",
  "tool_input": "object (optional)",
  "result": "any (optional)",
  "transcript_path": "string (optional)",
  "git_branch": "string (optional)"
}
```

**响应**: `200 OK`，返回 `{ "ok": true }`

---

### Verses（实验分支）

#### `GET /api/verses`

列出所有 verse。

**响应**: `200 OK`
```json
[
  {
    "id": "verse_01HXYZ...",
    "name": "experiment-a",
    "parentId": null,
    "gitBranch": "verse/experiment-a",
    "forkFromCommit": null,
    "config": {},
    "createdAt": "2026-03-26T10:00:00.000Z"
  }
]
```

#### `GET /api/verses/:id`

根据 ID 或名称获取 verse。

**响应**: `200 OK`（verse 对象）或 `404`

#### `POST /api/verses`

创建新的 verse。

**请求体**:
```json
{
  "name": "string",
  "gitBranch": "string (optional)",
  "parentId": "string (optional)",
  "config": "object (optional)"
}
```

**响应**: `201 Created`，返回 verse 对象

---

### Runs（运行记录）

#### `GET /api/runs`

列出运行记录。可选查询参数: `?verse_id=<id>`

**响应**: `200 OK`
```json
[
  {
    "id": "run_01HXYZ...",
    "verseId": "verse_01HXYZ...",
    "claudeSessionId": "session-abc",
    "gitBranch": "main",
    "status": "running | done",
    "startedAt": "2026-03-26T10:00:00.000Z",
    "endedAt": null,
    "totalCostUsd": 0.05,
    "totalTokens": 12000
  }
]
```

#### `GET /api/runs/:id`

根据 ID 获取运行记录。

**响应**: `200 OK`（run 对象）或 `404`

#### `GET /api/runs/:id/events`

列出某次运行的所有事件。

**响应**: `200 OK`
```json
[
  {
    "id": "evt_01HXYZ...",
    "runId": "run_01HXYZ...",
    "stepId": "step_01HXYZ...",
    "ts": "2026-03-26T10:00:01.000Z",
    "source": "hook",
    "type": "PreToolUse",
    "attrs": { "tool_name": "Bash", "tool_input": { "command": "ls" } }
  }
]
```

#### `GET /api/runs/:id/timeline`

获取某次运行的步骤时间线（按序列排序）。

**响应**: `200 OK`
```json
[
  {
    "id": "step_01HXYZ...",
    "runId": "run_01HXYZ...",
    "seq": 1,
    "kind": "tool_call",
    "toolName": "Bash",
    "summary": "Bash: ls -la",
    "startedAt": "2026-03-26T10:00:01.000Z",
    "endedAt": "2026-03-26T10:00:02.000Z",
    "costUsd": 0.001,
    "tokens": 150
  }
]
```

#### `GET /api/runs/:id/stream`（存根）

用于实时运行更新的 SSE 端点。目前为存根实现。

---

### 静态文件

服务器将 UI 构建产物作为静态文件提供，并支持 SPA 回退（所有非 API 路由均返回 `index.html`）。

# MultiverseOS — 数据模型

## 数据库引擎

- **SQLite**，通过 better-sqlite3 驱动
- **ORM**: Drizzle ORM（push 模式迁移）
- **Pragmas**: `journal_mode = WAL`, `foreign_keys = ON`
- **存储位置**: `.multiverseos/multiverseos.db`

## 表结构

### verses

绑定到 git 分支的实验定义。

| 列名 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | TEXT | PK | `verse_[ulid]` |
| name | TEXT | UNIQUE, NOT NULL | 可读名称 |
| parentId | TEXT | FK → verses.id | 父级 verse（用于 fork） |
| gitBranch | TEXT | | 关联的 git 分支 |
| forkFromCommit | TEXT | | fork 来源的 commit hash |
| config | TEXT | | JSON 序列化的配置对象 |
| createdAt | TEXT | NOT NULL | ISO 8601 时间戳 |

### runs

Claude Code 会话记录。

| 列名 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | TEXT | PK | `run_[ulid]` |
| verseId | TEXT | FK → verses.id | 关联的 verse（可为空） |
| claudeSessionId | TEXT | | Claude 会话标识符 |
| gitBranch | TEXT | | Git 分支上下文 |
| repoCommit | TEXT | | 仓库 commit hash |
| worktreePath | TEXT | | Git worktree 路径 |
| status | TEXT | NOT NULL | `running` 或 `done` |
| startedAt | TEXT | NOT NULL | ISO 8601 时间戳 |
| endedAt | TEXT | | ISO 8601 时间戳 |
| totalCostUsd | REAL | | 累计 USD 费用 |
| totalTokens | INTEGER | | 累计 token 数量 |

**索引**: `idx_runs_verse` (verseId), `idx_runs_session` (claudeSessionId), `idx_runs_branch` (gitBranch)

### steps

运行中的逻辑操作。

| 列名 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | TEXT | PK | `step_[ulid]` |
| runId | TEXT | FK → runs.id, NOT NULL | 所属运行 |
| seq | INTEGER | NOT NULL | 顺序编号 |
| kind | TEXT | NOT NULL | `file_edit`、`subagent`、`tool_call` |
| toolName | TEXT | | 工具标识符 |
| summary | TEXT | | 可读描述 |
| startedAt | TEXT | NOT NULL | ISO 8601 时间戳 |
| endedAt | TEXT | | ISO 8601 时间戳 |
| costUsd | REAL | | 步骤 USD 费用 |
| tokens | INTEGER | | 步骤 token 数量 |

**索引**: `idx_steps_run` (runId)

### events

原始的仅追加事件日志。

| 列名 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | TEXT | PK | `evt_[ulid]` |
| runId | TEXT | FK → runs.id, NOT NULL | 所属运行 |
| stepId | TEXT | FK → steps.id | 关联的步骤（可为空） |
| ts | TEXT | NOT NULL | 事件时间戳 |
| source | TEXT | NOT NULL | 事件来源（`hook`） |
| type | TEXT | NOT NULL | 事件类型（PreToolUse、PostToolUse、Stop、Notification） |
| attrs | TEXT | | JSON 序列化的属性 |
| payloadRef | TEXT | | 外部 payload 引用 |

**索引**: `idx_events_run` (runId), `idx_events_step` (stepId)

### artifacts

运行产生的输出产物。

| 列名 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | TEXT | PK | `art_[ulid]` |
| runId | TEXT | FK → runs.id, NOT NULL | 所属运行 |
| stepId | TEXT | FK → steps.id | 关联的步骤（可为空） |
| type | TEXT | NOT NULL | 产物类型 |
| path | TEXT | NOT NULL | 文件路径 |
| hash | TEXT | | 内容 hash |
| createdAt | TEXT | NOT NULL | ISO 8601 时间戳 |
| meta | TEXT | | JSON 序列化的元数据 |

**索引**: `idx_artifacts_run` (runId)

## 实体关系

```
verses (1) ←──── (N) runs (1) ←──── (N) steps (1) ←──── (N) events
                  runs (1) ←──── (N) artifacts
                  steps (1) ←──── (N) events
verses (1) ←──── (N) verses (通过 parentId 自引用)
```

## ID 策略

所有实体使用带有实体前缀的 ULID：
- `verse_` — verses
- `run_` — runs
- `step_` — steps
- `evt_` — events
- `art_` — artifacts

ULID 支持字典序排序，并编码了创建时间。

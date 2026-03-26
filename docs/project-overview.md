# MultiverseOS — 项目概览

> 面向 Claude Code harness 工程的本地优先实验管理层。

## 摘要

MultiverseOS 是一款开发者工具，用于捕获、组织和可视化 Claude Code 会话，使其成为可复现的实验。它引入了"Verse"概念 — 与 git 分支一一绑定的隔离开发上下文 — 并提供从 Claude Code hooks 到 Web 时间线查看器的完整事件溯源管道。

## 仓库结构

- **类型**: pnpm monorepo
- **语言**: TypeScript (ES2022 target, strict mode)
- **包管理器**: pnpm（使用 workspace 协议）

## 组成部分

| 包 | 类型 | 用途 |
|---------|------|---------|
| `packages/core` | 后端/库 | 数据层：SQLite + Drizzle ORM schema、存储、事件摄取引擎 |
| `packages/cli` | 命令行工具 | `verse` CLI，包含 13 个命令 + 内嵌 HTTP 服务器 |
| `packages/hooks` | 库 | Claude Code hook 脚本（PreToolUse、PostToolUse、Stop、Notification） |
| `packages/ui` | Web 前端 | React 19 + Vite + Tailwind CSS 仪表盘，用于 verse/run/timeline 可视化 |

## 技术栈

| 类别 | 技术 | 版本 |
|----------|-----------|---------|
| 语言 | TypeScript | ~5.9 |
| 运行时 | Node.js | ES2022+ |
| 数据库 | SQLite (better-sqlite3) | ^11.0.0 |
| ORM | Drizzle ORM | ^0.38.0 |
| 校验 | Zod | ^3.24.0 |
| ID 生成 | ULID | ^2.3.0 |
| CLI 框架 | Commander.js | ^13.0.0 |
| HTTP 服务器 | Hono | ^4.7.0 |
| 前端 | React | ^19.2.4 |
| 构建工具 | Vite | ^8.0.1 |
| CSS 框架 | Tailwind CSS | ^4.2.2 |
| 测试 | Vitest | ^3.0.0 |

## 架构模式

**事件溯源的本地优先系统**

```
Claude Code Session
    ↓ (hooks)
@multiverseos/hooks → POST /api/events (or buffer.jsonl fallback)
    ↓
@multiverseos/cli (Hono server) → IngestEngine
    ↓
@multiverseos/core (SQLite via Drizzle ORM)
    ↓
@multiverseos/ui (React dashboard via /api/* proxy)
```

## 核心概念

- **Verse**: 实验配方（模型配置 + 技能 + 插件 + 权限），与 git 分支一一绑定
- **Run**: 单次 Claude Code 会话，自动记录
- **Step**: Run 中的一个逻辑操作（工具调用、文件编辑、子代理调用）
- **Event**: 来自 hooks 的原始追加式事件记录
- **Artifact**: 生成的产出物（diff、测试报告、日志）

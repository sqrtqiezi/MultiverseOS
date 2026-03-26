# MultiverseOS — 源码目录分析

```
MultiverseOS/                          # pnpm monorepo 根目录
├── package.json                       # 根工作区脚本 (build, test, dev, verse)
├── pnpm-workspace.yaml                # 工作区配置: packages/*
├── pnpm-lock.yaml                     # 锁文件
├── tsconfig.base.json                 # 共享 TS 配置 (ES2022, ESNext, strict)
├── README.md                          # 项目 README 及快速入门
├── .gitignore                         # 忽略: node_modules, dist, *.db, .multiverseos/, buffer.jsonl
│
├── .multiverseos/                     # 运行时数据目录 (已 gitignore)
│   ├── multiverseos.db                # SQLite 数据库 (WAL 模式)
│   ├── multiverseos.db-shm            # WAL 共享内存
│   └── multiverseos.db-wal            # WAL 日志
│
├── packages/
│   ├── core/                          # @multiverseos/core — 数据层
│   │   ├── package.json               # 依赖: better-sqlite3, drizzle-orm, ulid, zod
│   │   ├── tsconfig.json              # 继承基础配置
│   │   └── src/
│   │       ├── index.ts               # ★ 包入口: 重新导出所有模块
│   │       ├── schema.ts              # Drizzle ORM 表定义 (5 张表)
│   │       ├── db.ts                  # 数据库初始化: createDb(), createMemoryDb(), migrateDb()
│   │       ├── id.ts                  # ULID 生成器: newVerseId(), newRunId() 等
│   │       ├── schema.test.ts         # Schema 迁移测试
│   │       ├── integration.test.ts    # 完整流水线集成测试
│   │       ├── store/
│   │       │   ├── verse-store.ts     # VerseStore: verse 的增删改查
│   │       │   ├── verse-store.test.ts
│   │       │   ├── run-store.ts       # RunStore: 会话管理
│   │       │   ├── run-store.test.ts
│   │       │   ├── event-store.ts     # EventStore: 事件/步骤日志
│   │       │   └── event-store.test.ts
│   │       └── engine/
│   │           ├── ingest.ts          # IngestEngine: hook 事件 → 数据库流水线
│   │           └── ingest.test.ts
│   │
│   ├── cli/                           # @multiverseos/cli — CLI + HTTP 服务器
│   │   ├── package.json               # 依赖: commander, chalk, hono, @multiverseos/core
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # ★ CLI 入口: 通过 Commander.js 提供 13 个命令
│   │       ├── server.ts              # Hono HTTP 服务器: API 路由 + 静态 UI
│   │       ├── buffer-drain.ts        # 服务器启动时的 JSONL 缓冲区排空
│   │       ├── buffer-drain.test.ts
│   │       └── commands/              # 各命令的具体实现
│   │           ├── init.ts            # verse init: 初始化数据库 + 注册 hooks
│   │           ├── create.ts          # verse create: 创建新 verse + git 分支
│   │           ├── serve.ts           # verse serve: 启动 HTTP 服务器
│   │           ├── list.ts            # verse list: 显示所有 verse
│   │           ├── show.ts            # verse show: verse 详情
│   │           ├── fork.ts            # verse fork: 从已有 verse 派生
│   │           ├── df.ts            # verse diff: 比较配置差异
│   │           ├── runs.ts            # verse runs: 列出运行记录
│   │           ├── inspect.ts         # verse inspect: 运行详情
│   │           ├── timeline.ts        # verse timeline: 步骤时间线
│   │           ├── events.ts          # verse events: 原始事件导出
│   │           ├── bind.ts            # verse bind: 将运行绑定到 verse
│   │           ├── cost.ts            # verse cost: 成本汇总
│   │           └── ui.ts             # verse ui: 打开浏览器
│   │
│   ├── hooks/                         # @multiverseos/hooks — Claude Code hooks
│   │   ├── package.json               # 依赖: zod
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # 空占位文件
│   │       ├── common.ts             # 公共模块: readStdin, buildPayload, sendEvent, getGitBranch
│   │       ├── common.test.ts
│   │       ├── pre-tool-use.ts        # Hook: 工具调用前
│   │       ├── post-tool-use.ts       # Hook: 工具完成后
│   │       ├── stop.ts               # Hook: 会话结束
│   │       └── notification.ts        # Hook: 通用通知
│   │
│   └── ui/                            # @multiverseos/ui — Web 仪表盘
│       ├── package.json               # 依赖: react, react-dom, tailwindcss, vite
│       ├── tsconfig.json
│       ├── vite.config.ts             # Vite: React 插件 + Tailwind + /api 代理 → :7777
│       ├── index.html                 # SPA 入口 HTML
│       └── src/
│           ├── main.tsx               # ★ React 入口: createRoot
│           ├── App.tsx                # 根组件: 导航状态
│           ├── api.ts                 # API 客户端: fetchVerses, fetchRuns, fetchTimeline
│           ├── index.css              # Tailwind 导入
│           ├── vite-env.d.ts          # Vite 类型声明
│           ├── components/
│           │   └── StepCard.tsx       # 步骤展示: 图标、时间、耗时、成本
│           └── views/
│               ├── VerseListView.tsx   # Verse 列表及嵌套运行记录
│               └── TimelineView.tsx    # 运行时间线及步骤卡片
│
├── docs/                              # 项目文档
│   ├── prd.md                         # 产品需求文档
│   ├── architecture.md                # 原始架构文档
│   ├── plans/
│   │   ├── 2026-03-25-mvp-architecture-design.md
│   │   └── 2026-03-25-mvp-implementation-plan.md
│   └── design/
│       └── 2026-03-25-mvp-architecture.md
│
└── _bmad/                             # BMad 工作流配置
    ├── _config/                       # BMad 清单及 IDE 配置
    ├── core/                          # 核心模块配置
    └── bmm/                           # BMad Method 模块配置
```

## 关键目录

| 目录 | 用途 |
|------|------|
| `packages/core/src/store/` | 数据访问层 — 所有数据库操作 |
| `packages/core/src/engine/` | 事件摄取流水线 |
| `packages/cli/src/commands/` | 全部 13 个 CLI 命令实现 |
| `packages/hooks/src/` | Claude Code hook 脚本 |
| `packages/ui/src/views/` | 主要 UI 视图 |
| `.multiverseos/` | 运行时 SQLite 数据库 (已 gitignore) |

## 入口文件

| 包 | 入口 | 可执行文件 |
|----|------|-----------|
| core | `src/index.ts` → `dist/index.js` | — |
| cli | `src/index.ts` → `dist/index.js` | `verse` |
| hooks | `src/index.ts` → `dist/index.js` | — |
| ui | `src/main.tsx` → Vite bundle | — |

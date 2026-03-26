# MultiverseOS — 开发指南

## 前置要求

- Node.js（需支持 ES2022+）
- pnpm（workspace 协议）
- Git

## 快速开始

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm -r build

# 初始化 MultiverseOS（创建 .multiverseos/ 目录、迁移数据库、注册 hooks）
pnpm verse init

# 启动 HTTP 服务器 + UI
pnpm verse serve

# 打开 Web 仪表盘
pnpm verse ui
```

## 包脚本

### 根目录

| 脚本 | 命令 | 说明 |
|------|------|------|
| `build` | `pnpm -r build` | 构建所有包 |
| `test` | `pnpm -r test` | 运行所有测试 |
| `dev` | `pnpm -r --parallel dev` | 所有包的监听模式 |
| `verse` | `node packages/cli/dist/index.js` | 直接运行 CLI |

### 各包脚本

| 包 | 构建 | 测试 | 开发 |
|----|------|------|------|
| core | `tsc` | `vitest run` | `tsc --watch` |
| cli | `tsc` | `vitest run` | `tsc --watch` |
| hooks | `tsc` | `vitest run` | — |
| ui | `tsc -b && vite build` | — | `vite`（开发服务器） |

## 测试

**框架**: Vitest 3.0

**测试文件**（共 8 个）:

| 文件 | 类型 | 测试内容 |
|------|------|----------|
| `core/src/schema.test.ts` | 单元测试 | 表创建、迁移幂等性 |
| `core/src/store/verse-store.test.ts` | 单元测试 | Verse 增删改查操作 |
| `core/src/store/run-store.test.ts` | 单元测试 | Run 生命周期、findOrCreate |
| `core/src/store/event-store.test.ts` | 单元测试 | 事件/步骤的插入与查询 |
| `core/src/engine/ingest.test.ts` | 集成测试 | 完整事件摄取流水线 |
| `core/src/integration.test.ts` | 集成测试 | 端到端数据流 |
| `cli/src/buffer-drain.test.ts` | 单元测试 | JSONL 缓冲区解析与排空 |
| `hooks/src/common.test.ts` | 单元测试 | Payload 构造 |

**测试模式**: 所有 store 测试使用 `createTestDb()`（内存 SQLite）实现隔离。

```bash
# 运行所有测试
pnpm -r test

# 运行指定包的测试
cd packages/core && pnpm test
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VERSE_INGEST_URL` | `http://127.0.0.1:7777/api/events` | 事件摄取端点 |

## 数据库

- **位置**: `.multiverseos/multiverseos.db`
- **引擎**: SQLite，WAL 模式
- **ORM**: Drizzle ORM，基于 push 的迁移
- **Schema**: 5 张表（verses, runs, steps, events, artifacts）

## 构建顺序

由于工作区依赖关系，构建顺序很重要：

1. `packages/core`（无依赖）
2. `packages/hooks`（无依赖）
3. `packages/cli`（依赖 core）
4. `packages/ui`（独立，通过 HTTP 连接）

`pnpm -r build` 会通过拓扑排序自动处理构建顺序。

## TypeScript 配置

- **基础配置**: `tsconfig.base.json` — ES2022 目标、ESNext 模块、bundler 解析、严格模式
- 每个包继承基础配置，并按需覆盖 `outDir`/`rootDir`
- UI 使用 `react-jsx` 转换，Vite 负责打包（tsc 仅用于类型检查）

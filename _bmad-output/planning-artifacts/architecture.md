---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-03-27.md
  - docs/prd.md
  - docs/architecture-generated.md
  - docs/design/2026-03-25-mvp-architecture.md
  - docs/plans/2026-03-25-mvp-architecture-design.md
workflowType: 'architecture'
project_name: 'MultiverseOS'
user_name: 'Njin'
date: '2026-03-27'
lastStep: 8
status: 'complete'
completedAt: '2026-03-27'
---

# Architecture Decision Document

## Project Context Analysis

### Requirements Overview

**Functional Requirements：**

PRD 已定义 FR1-FR53，核心可归并为 9 类能力：
- EnvSpec 生命周期管理（创建、编辑、验证、版本化、历史）
- 容器化实验执行（构建、挂载、运行、状态观测）
- 事件采集与 Run Ledger 存储（hooks/statusline/buffer drain）
- 回放与审阅（timeline、step 详情、可跳转回放）
- 对比分析（事件差异 + 代码差异 + 成本差异）
- 成本与指标追踪（run/step token、成本汇总）
- CLI 入口（init/run/replay/compare/ui + JSON 输出）
- Web UI 浏览与分析（runs/timeline/diff/search）
- 数据管理与诊断（SQLite、快照、导出、清理、错误诊断）

**Non-Functional Requirements：**

NFR1-NFR11 直接约束架构：
- 低侵入采集：事件采集不阻塞 Claude Code 主流程
- 可靠性：零丢失路径（buffer + drain）与一致性存储
- 安全性：本地优先，敏感数据不默认出站
- 可维护性：模块边界清晰，诊断信息可执行
- 性能目标：事件上报延迟与容器启动时间可度量

**Scale & Complexity：**

- Primary domain: AI-assisted developer tooling（CLI + local service + UI）
- Complexity level: medium-high（事件溯源 + 容器化隔离 + 多视图对比）
- Estimated architectural components: 8（core schema/store、ingest engine、hook adapters、CLI surface、HTTP API、UI、envspec applier、replay/compare pipeline）

### Technical Constraints & Dependencies

- 技术栈约束：TypeScript monorepo（pnpm workspace）
- 运行时约束：Node.js LTS 线（22.x）
- 存储约束：SQLite（better-sqlite3）+ Drizzle ORM
- 协议约束：Claude hooks/statusline/可选 OTel
- 部署约束：本地优先，后续可扩展团队内网模式
- 兼容约束：现有 packages/core, cli, hooks, ui 已落地，不可破坏现有命令与数据模型

### Cross-Cutting Concerns Identified

- 可追溯性：所有 run、step、event 必须可回链到输入上下文
- 可重复性：重放与重跑语义分离（Proxy Replay vs Audit Rerun）
- 安全治理：工具权限、网络策略、密钥边界
- 成本治理：run/step 粒度成本归因
- 演进兼容：MVP 到 Growth/Vision 不破坏 run ledger 主键与事件语义

## Starter Template Evaluation

### Primary Technology Domain

Brownfield TypeScript monorepo with CLI + local server + React dashboard。

### Starter Options Considered

1. 保持现有 monorepo（推荐）
- 优点：零迁移成本，与现有 `packages/*`、数据模型、CLI 命令完全兼容
- 风险：需要在现有结构上渐进式补齐 EnvSpec/Tool Plane

2. 重新以脚手架重建（不推荐）
- 优点：可一次性统一新约束
- 风险：会引入高迁移成本与行为回归，不适合当前已有 MVP 代码库

### Selected Starter: Keep Existing Monorepo Baseline

**Rationale for Selection：**

本项目已经有可运行 MVP 与真实数据路径。架构目标是“增强可控实验能力”，不是“重建项目骨架”。因此选择保留现有骨架并增量演进。

**Current Version Verification（web 校验摘要）：**

- Node.js：22.22.1（LTS，2026-03-05 发布）
- React：19.2 可用
- Vite：当前主支持线为 8.x，7.x 接收重要修复

**Initialization Command：**

```bash
pnpm install
pnpm -r build
pnpm -r test
```

**Note：** 由于是棕地项目，不引入新的 starter 初始化命令。第一个实施故事应为“基于现有 monorepo 建立 EnvSpec/Tool Plane 增量落地路径”。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation)：**
- 统一事件语义与写入顺序（run/step/event 原子关系）
- EnvSpec v1 数据模型与装配器边界
- Tool Plane MVP 边界（注册、策略、可观测）
- Replay 模式定义与约束

**Important Decisions (Shape Architecture)：**
- API 规范（REST + SSE）
- 前端状态组织与对比视图数据契约
- 数据清理/导出策略
- 安全策略注入点（hook pre-check + server-side policy）

**Deferred Decisions (Post-MVP)：**
- 组织级 RBAC 与多租户
- Audit Rerun 强一致执行沙箱
- 高阶搜索与实验知识图谱

### Data Architecture

- Database: SQLite（WAL）
- ORM: Drizzle
- 事件策略：append-only events，step 负责聚合语义，run 负责会话级指标
- 快照策略：workspace snapshot 作为 artifact 引用，不与 event 主表强耦合
- 校验策略：入站 payload 以 zod schema 校验

### Authentication & Security

- MVP 阶段默认本地单用户运行
- API 安全：仅本地回环地址监听（127.0.0.1）
- 事件入站限制：仅接受定义好的 hooks payload 结构
- 密钥处理：不在 ledger 记录原始 secrets，仅记录引用和策略事件

### API & Communication Patterns

- API 风格：REST（查询）+ POST（摄取）+ SSE（实时）
- 错误格式：`{ code, message, details? }`
- 成功格式：查询接口使用明确对象 envelope，避免裸数组扩展困难
- 内部通信：hooks -> HTTP ingest；UI -> /api

### Frontend Architecture

- UI 保持 React + Vite
- 视图分层：list（verses/runs）-> detail（timeline）-> compare（dual run）
- 状态策略：先使用轻量 hooks，跨页聚合后再引入状态库
- 性能策略：timeline 分段渲染 + 按需加载事件详情

### Infrastructure & Deployment

- 开发运行：`verse serve` 提供 API + 静态 UI
- 数据路径：`.multiverseos/`（项目内 DB）+ `~/.multiverseos/`（buffer）
- CI 方向：逐步加入 schema consistency、ingest compatibility、replay regression 测试

### Decision Impact Analysis

**Implementation Sequence：**
1. 固化 EnvSpec v1 schema + parser
2. 增加 Tool Registry 与 Policy Evaluator
3. 扩展 ingest 事件类型与 replay metadata
4. 打通 compare 视图（事件差异 + 成本差异 + 代码差异）

**Cross-Component Dependencies：**
- core schema 变化会影响 cli ingest、ui timeline、hooks payload
- replay 语义依赖 artifacts 完整性和 step 边界定义

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified：**
12 类（命名、事件格式、错误返回、时间戳、ID、目录边界、测试位置、状态字段、payload 序列化、成本字段、回放标签、策略日志）

### Naming Patterns

**Database Naming Conventions：**
- 表名/列名一律 `snake_case`
- 主键前缀保持现状：`verse_`, `run_`, `step_`, `evt_`, `art_`
- 外键列统一 `<entity>_id`

**API Naming Conventions：**
- 路径使用复数名词：`/api/runs`, `/api/verses`
- 查询参数统一 `snake_case`
- 内部 TypeScript 类型字段可用 `camelCase`，通过边界层转换

**Code Naming Conventions：**
- 文件名：`kebab-case.ts`
- 类型/类：`PascalCase`
- 函数/变量：`camelCase`

### Structure Patterns

**Project Organization：**
- `packages/core`: 数据模型、store、ingest engine
- `packages/cli`: 命令面与 HTTP server
- `packages/hooks`: Claude hook adapters
- `packages/ui`: dashboard

**Test Placement：**
- 单元测试与实现同目录，后缀 `.test.ts`
- 跨包集成测试放 core 或 cli 的 integration test 文件

### Format Patterns

**API Response Formats：**
- 成功：`{ data, meta? }`
- 失败：`{ code, message, details? }`

**Event Formats：**
- 时间字段统一 ISO8601 字符串
- 成本字段统一 `costUsd`（number）
- token 字段统一 `tokens`（int）

### Communication Patterns

**Event System Patterns：**
- Hook 事件类型保持 Claude 生命周期命名（PreToolUse/PostToolUse/Stop/Notification）
- Run/Step 关联规则在 ingest engine 内部唯一实现，其他层不重复计算

**State Management Patterns：**
- UI 层不直接拼接业务语义，语义聚合在 API 层完成

### Process Patterns

**Error Handling Patterns：**
- 入站校验失败：返回 4xx + 结构化错误
- 存储失败：记录可诊断日志，必要时回退 buffer

**Loading State Patterns：**
- UI 统一使用 `idle/loading/error/ready` 四态

### Enforcement Guidelines

**All AI Agents MUST：**
- 不绕过 core schema 直接写数据库
- 不在 UI 层硬编码业务映射逻辑
- 所有新增 event 类型必须附带回放语义说明

**Pattern Enforcement：**
- PR checklist 增加“命名与边界一致性”
- 关键路径新增测试：ingest 兼容、timeline 稳定、replay 元数据完整

### Pattern Examples

**Good Example：**
- 新增事件类型时，同时更新：zod schema -> ingest mapping -> API contract -> UI rendering

**Anti-Patterns：**
- 在 hooks 直接写数据库
- 在 ui 组件拼装 run 成本聚合逻辑
- 用未版本化的 ad-hoc JSON 扩展事件字段

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
multiverseos/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── .multiverseos/
│   └── multiverseos.db
├── docs/
│   ├── prd.md
│   ├── architecture-generated.md
│   └── design/
├── _bmad-output/
│   └── planning-artifacts/
│       ├── prd.md
│       ├── architecture.md
│       └── implementation-readiness-report-2026-03-27.md
└── packages/
    ├── core/
    │   ├── src/
    │   │   ├── schema.ts
    │   │   ├── db.ts
    │   │   ├── id.ts
    │   │   └── index.ts
    │   └── package.json
    ├── cli/
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── server.ts
    │   │   └── buffer-drain.ts
    │   └── package.json
    ├── hooks/
    │   ├── src/
    │   │   ├── pre-tool-use.ts
    │   │   ├── post-tool-use.ts
    │   │   ├── notification.ts
    │   │   └── stop.ts
    │   └── package.json
    └── ui/
        ├── src/
        │   ├── api.ts
        │   └── ...
        └── package.json
```

### Architectural Boundaries

**API Boundaries：**
- `cli/server.ts` 是唯一 HTTP 对外入口
- ingest 路由只接收标准化 hooks/statusline 事件

**Component Boundaries：**
- core 不依赖 cli/ui
- cli 依赖 core
- ui 通过 HTTP 与 cli 交互，不直接依赖 core

**Service Boundaries：**
- 数据持久化只在 core store 层
- 业务编排由 cli 命令或 ingest engine 驱动

**Data Boundaries：**
- 结构化元数据入 SQLite
- 大对象（transcript/snapshot）以 artifact ref 方式关联

### Requirements to Structure Mapping

**Feature Mapping：**
- FR1-FR15（EnvSpec/采集/存储）：`packages/core`, `packages/hooks`, `packages/cli`
- FR16-FR30（回放/对比/成本）：`packages/core`, `packages/cli`, `packages/ui`
- FR31-FR38（CLI）：`packages/cli`
- FR39-FR44（UI）：`packages/ui`
- FR45-FR53（数据管理/诊断）：`packages/core`, `packages/cli`

**Cross-Cutting Concerns：**
- 错误诊断：core+cli 共担，ui 展示
- 一致性约束：通过 schema + tests + checklist 落地

### Integration Points

**Internal Communication：**
- hooks -> /api/events
- ui -> /api/runs /api/verses /api/timeline

**External Integrations：**
- Claude hooks lifecycle
- optional OTel exporter pipeline

**Data Flow：**
- ingress -> normalize -> run/step bind -> persist -> aggregate -> query

### File Organization Patterns

- 配置集中在根目录和各 package 根目录
- 业务逻辑集中在 `src/`
- 测试与实现近邻，防止语义漂移
- 产出文档统一放 `_bmad-output/planning-artifacts/`

### Development Workflow Integration

- 本地开发：`pnpm -r dev`
- 构建：`pnpm -r build`
- 测试：`pnpm -r test`
- 运行服务：通过 `verse` 命令入口

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility：**
- 现有 TypeScript + Hono + React + SQLite 组合内部兼容
- 与既有包边界一致，无需大规模重构

**Pattern Consistency：**
- 命名、格式、边界规则可直接映射到现有目录结构

**Structure Alignment：**
- 目录结构支持 PRD 中 FR 分层，不存在明显结构冲突

### Requirements Coverage Validation

**Functional Requirements Coverage：**
- 架构层面对 FR1-FR53 给出了承载位置映射

**Non-Functional Requirements Coverage：**
- 性能、可靠性、安全、可维护性均有对应架构策略

### Implementation Readiness Validation

**Decision Completeness：**
- 关键决策均已明确并标注优先级

**Structure Completeness：**
- 目录、边界、通信路径、映射关系完整

**Pattern Completeness：**
- 已给出冲突点分类、强制规则与反模式

### Gap Analysis Results

**Critical Gaps（外部依赖）：**
- 仍需单独产出 Epics/Stories 与 UX 文档，作为实现前置输入

**Important Gaps：**
- EnvSpec v1 具体 schema 与版本迁移策略需在后续技术设计中细化
- Replay 元数据字段还需与 CLI/UI 接口逐项对齐

### Architecture Completeness Checklist

- [x] 项目上下文与约束分析
- [x] 核心技术决策
- [x] 一致性规则
- [x] 目录与边界
- [x] 覆盖度与缺口评估

### Architecture Readiness Assessment

**Overall Status：** READY FOR ARCHITECTURE-ALIGNED IMPLEMENTATION（前提：补齐 epics/ux）

**Confidence Level：** medium-high

**Key Strengths：**
- 与现有 MVP 一致，落地阻力低
- 事件账本与可观测主线明确
- 对 AI agent 一致性有可执行约束

**Areas for Future Enhancement：**
- 组织级治理（RBAC、策略下发）
- Audit Rerun 与强隔离执行
- 高阶检索与实验知识图谱

### Implementation Handoff

**AI Agent Guidelines：**
- 严格遵循本文档中的边界和命名规则
- 所有新增能力先做 schema 与 contract，再做实现
- 不跨层直接调用持久化实现

**First Implementation Priority：**
- 实现 `EnvSpec v1 + Tool Registry + Policy Evaluator` 的最小闭环，并接入现有 ingest/timeline 数据路径

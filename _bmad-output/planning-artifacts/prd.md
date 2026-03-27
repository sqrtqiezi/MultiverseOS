---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
classification:
  projectType: developer_tool
  domain: ai_assisted_development
  complexity: medium
  projectContext: brownfield
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/plans/2026-03-25-mvp-implementation-plan.md
  - docs/plans/2026-03-25-mvp-architecture-design.md
  - docs/design/2026-03-25-mvp-architecture.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture-generated.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 8
---

# Product Requirements Document - MultiverseOS

**Author:** Njin
**Date:** 2026-03-26

## 执行摘要

MultiverseOS 是面向 Claude Code harness 工程的实验操作系统。它将 skills、plugins、subagents 和 workflows 的开发迭代过程——目前依赖反复试错——转变为可控、可复现的实验，具备可版本化的执行环境、从检查点重放事件序列、以及跨实验对比的能力。

本产品解决了 agentic coding 中的一个根本性缺口：Claude Code 会话的结果不仅取决于 prompt 和代码状态，还取决于一系列隐式的执行环境变量——skill 定义、MCP server 配置、工具权限策略、模型参数、插件版本。如今，这些变量是不可见的、未版本化的、不可追溯的。当会话产出意外结果时，团队无法回答"为什么昨天能跑通今天跑不通？"或"哪个变量的改动导致了回归？"

MultiverseOS 通过三个架构层将这些隐式环境显式化：
1. **Tool Plane（工具平面）**——一个执行控制层，注册所有工具、skills、MCP servers 和 subagents，将 Claude Code 从黑盒运行时转变为可控的实验平台
2. **EnvSpec（环境规格）**——执行环境的声明式、可版本化规格（模型配置 + skill bundle + 工具策略 + MCP 配置），实现"环境即代码"
3. **Run Ledger（运行账本）**——仅追加的事件存储，捕获完整执行轨迹，支持从任意检查点使用不同 EnvSpec 重放

核心用户场景：*"我改了一个 skill 定义，能立刻看到它对同一个任务的效果差异"*——通过从检查点分叉、在 EnvSpec 中替换该 skill、重放事件序列、并行对比结果来实现。

### 核心差异化

MultiverseOS 不是又一个 LLM 可观测工具。可观测平台（Langfuse、Braintrust）回答的是"发生了什么？"——MultiverseOS 回答的是"如果我改了 X，结果会有什么不同？"这个区别——从被动遥测到主动实验控制——是产品的核心差异化。

关键架构洞察：与其通过 hooks 被动监听 Claude Code 内部的工具调用，MultiverseOS 将自身定位为 Claude *通过其执行*的环境层。工具、skills 和 MCP servers 注册在 MultiverseOS 的 Tool Plane 上；Claude 是使用者。这赋予了 MultiverseOS 对执行环境任何组件的完整控制——录制、版本化、重放、替换。

这使得现有工具无法提供的能力成为可能：
- **环境 A/B 测试**——改变一个变量（skill 定义），控制其他变量不变（相同任务、相同 repo 状态、相同模型），对比结果
- **从检查点分叉**——在任意步骤分支实验，替换环境变量，重放后续部分
- **可复现实验**——从确定性检查点重放事件序列，而非仅仅重新提交 prompt
- **环境可移植**——将成功会话的 EnvSpec 打包，迁移到另一位开发者或 CI runner

## 项目分类

- **项目类型：** 开发者工具——CLI（`verse` 命令）+ 核心库 + Web 仪表盘
- **领域：** AI 辅助开发 / 开发者体验（DevEx）
- **复杂度：** 中等——事件溯源架构、Claude Code hooks/OTel 集成、git worktree 管理、实时事件处理
- **项目上下文：** 棕地——MVP 已实现（4 个包：core、cli、hooks、ui），事件捕获、运行账本和基础时间线查看器已可运行。下一阶段：Tool Plane 和 EnvSpec 架构。

## 成功标准

### 用户成功

**核心场景：对比实验的可操作性**
- **实验迭代速度**：从"改 EnvSpec 或 prompt → 触发实验 → 查看对比"端到端 MVP ≤ 15 分钟，Growth ≤ 5 分钟
- **操作步骤数**：完成一次对比实验 ≤ 3 步（改变量 → 触发实验 → 查看对比）
- **对比完整性**：对比视图展示代码 diff、工具调用序列 diff、token/成本、时间线，用户无需手动拼凑
- **实验可追溯**：任意时间点，用户能从 run timeline 回溯"当时用了什么 EnvSpec + 什么 prompt + 什么 repo 状态"
- **知识可传递**：将一个实验（EnvSpec + Checkpoint + prompt）导出，另一位开发者能在 15 分钟内加载并重放
- **实验标注**：用户可对任意 run 或对比结果添加标签和笔记（如"此 EnvSpec 在重构场景下更优"），标注随实验记录持久化，用于团队知识沉淀

**概念模型**
- **Verse = 实验环境**：EnvSpec 的运行时实例，通过 Docker 容器隔离
- **Prompt = 实验操作**：在 Verse 中执行的指令，不改变 Verse 本身
- 同一 Prompt 在不同 Verse 中执行 = 环境 A/B 测试
- 不同 Prompt 在同一 Verse 中执行 = 操作对比
- MultiverseOS 提供对比的可操作性和实验记录，不判断优劣，优劣由用户标注

### 业务成功

**采纳指标**
- **被动采集采纳率**：8 周后 ≥ 80% 的 Claude Code 会话自动记录到 run ledger
- **主动使用采纳率**：8 周后 ≥ 30% 的 harness 工程师用过 `verse fork` 做对比实验
- **知识传递率**：≥ 40% 的 PR 附带 run timeline 链接
- **标注率**：≥ 20% 的对比实验有用户标注

**Go/No-Go（MVP 后 6-8 周）**
- 事件采集稳定性 ≥ 95%
- 用户能端到端完成一次对比实验
- 否则暂停扩展，优先加固

### 技术成功

**回放模式分层指标**

| 回放模式 | 定义 | 一致性指标 | 阶段 |
|---------|------|-----------|------|
| **Proxy Replay** | 回放录制的工具输出，不重新调用 | 100% 还原（需自动化验收测试验证） | MVP |
| **Deterministic Replay** | 只读工具重放，写工具 mock | 只读序列 ≥ 95% 一致 | Growth |
| **Audit Rerun** | 重新调模型和工具 | 记录差异，不强求一致 | Vision |

**数据完整性**
- **事件顺序保证**：同一 run 内事件时间戳严格单调递增（100%）
- **Checkpoint 恢复验证**：从 checkpoint 恢复后，repo 状态与原始 checkpoint 的 git diff 为空（100%）

**容器隔离**
- Verse 启动的 Docker 容器内 EnvSpec 配置与声明一致（100%）
- 容器启动时间 ≤ 30 秒（不计入实验端到端时间）
- 容器内 hooks 事件上报到宿主 Run Ledger 延迟 ≤ 1 秒

**EnvSpec 覆盖率**
- 先定义影响会话结果的变量清单（model config、skills、MCP、CLAUDE.md、工具策略等）
- 衡量 EnvSpec 覆盖其中多少（目标 ≥ 90%）

**Tool Plane 分层**
- MVP：EnvSpec Applier = Docker 容器构建与启动，按 EnvSpec 配置容器环境
- Growth：Runtime Proxy = 容器内运行时拦截工具调用

### 可量化结果

| 指标 | 基线 | MVP | Growth |
|------|------|-----|--------|
| 对比实验端到端时间 | 30-90 min | ≤ 15 min | ≤ 5 min |
| 对比实验操作步数 | 10+ 步 | ≤ 5 步 | ≤ 3 步 |
| 被动采集采纳率 | ~0% | ≥ 60% | ≥ 80% |
| 主动使用采纳率 | ~0% | ≥ 15% | ≥ 30% |
| 工具调用采集率 | ~70% | ≥ 90% | ≥ 99% |
| Proxy Replay 还原率 | N/A | 100% | 100% |
| 容器启动时间 | N/A | ≤ 60s | ≤ 30s |

## 产品范围

### MVP — 观测 + 理解 + 基础实验

**目标**：能记录、能回看、能对比、能通过 Docker 隔离运行不同 EnvSpec

- 完善事件采集（hooks + buffer drain + 零丢失）
- EnvSpec v1：声明式配置（model config + skill bundle + 工具策略 + MCP 配置）
- **Docker 隔离**：每个 Verse 对应一个 Docker 容器，按 EnvSpec 配置容器内 Claude Code 环境
- **EnvSpec Applier**：根据 EnvSpec 构建 Docker image / 启动容器 / 挂载项目 repo
- 容器内 hooks 事件上报到宿主 Run Ledger
- Proxy Replay：回放录制的工具输出（含自动化验收测试）
- 对比 UI：两个 Run 的事件 diff + 代码 diff 并排展示
- **实验标注**：用户可对 run 和对比结果添加标签和笔记
- CLI：`verse run`（启动容器化实验）、`verse replay`、`verse compare`
- 成本/token 按 run/step 汇总

### Growth — 运行时控制 + 精确实验

**目标**：能分叉、能运行时拦截、能从中间重放

- **Tool Plane Runtime Proxy**：容器内运行时代理工具调用
- Checkpoint 系统：从任意 Step 创建 Checkpoint（事件位置 + repo 状态）
- Fork-from-Checkpoint：分叉实验，加载不同 EnvSpec 到新容器，重放事件序列
- EnvSpec v2：skill bundle 版本锁定 + hash 校验
- Workspace Snapshot：git commit + patch + 非 git 文件策略
- Deterministic Replay：只读工具重放，写工具 mock
- OTel 集成
- 知识检索：按标注/标签搜索历史实验

### Vision — 审计 + 治理

**目标**：可审计、可规模化、可治理

- Audit Rerun：固定容器镜像重新调模型和工具
- Secrets 管理 + RBAC
- 组织级策略分发
- 多维分析（按团队/模型/插件/标注归因）
- PROV 标准化
- Tool Plane v2：工具沙箱化、工具替换
- 实验知识图谱：标注 + EnvSpec + 结果的关联分析

---

## 用户旅程

### 旅程 1：首次使用 — 从"看不见"到"看得见"

**角色**：AI 工具开发者 Alex
**场景**：刚开始用 Claude Code 开发 CLI 工具，想知道 Claude 到底做了什么

**步骤**：
1. **安装 MultiverseOS**：`npm install -g @multiverseos/cli`
2. **初始化项目**：在项目根目录运行 `verse init`
   - 自动检测 Claude Code hooks 配置
   - 创建 `.verse/` 目录和 SQLite 数据库
3. **正常使用 Claude Code**：继续用 Claude Code 开发
   - MultiverseOS 在后台自动记录所有事件
   - 无需改变工作流
4. **查看时间线**：运行 `verse ui`
   - 打开 Web 仪表盘（http://localhost:3000）
   - 看到完整的操作时间线：每个文件修改、命令执行、工具调用
   - 点击任意 Step 查看详细上下文

**啊哈时刻**：
"原来 Claude 改了这么多文件！我之前完全不知道它在背后做了什么。"

**价值**：从黑盒到白盒 — 可观测性

---

### 旅程 2：实验对比 — 从"试错"到"对照实验"

**角色**：Prompt 工程师 Sam
**场景**：正在优化一个 skill 定义，想知道改动后效果是否更好

**步骤**：
1. **当前状态**：在 main 分支上，已有一次 Claude Code 会话记录（Run #42）
   - 任务：重构一个 API 模块
   - 结果：Claude 生成了代码，但测试失败
2. **创建实验分支**：`verse fork experiment/better-skill`
   - 自动创建 git 分支
   - 复制当前 Verse 配置
3. **修改 skill 定义**：编辑 `.claude/skills/refactor.md`
   - 添加更详细的测试要求
   - 强调错误处理
4. **重放任务**：`verse replay 42 --from-step 5`
   - 从 Step 5（开始重构）重新执行
   - 使用新的 skill 定义
   - 自动记录为新的 Run #43
5. **对比结果**：`verse diff 42 43`
   - 并排显示两次运行的代码差异
   - 对比测试通过率、token 消耗、执行时间
   - 高亮关键差异点

**啊哈时刻**：
"我改了 skill 定义，立刻就能看到它对同一个任务的效果差异 — 就像 A/B 测试一样！"

**价值**：从试错到科学实验 — 可控对比

---

### 旅程 3：环境隔离 — 从"污染环境"到"干净实验"

**角色**：开源维护者 Jordan
**场景**：想测试不同的 MCP 服务器组合，但不想污染主环境

**步骤**：
1. **当前问题**：在 main 分支上安装了 5 个 MCP 服务器
   - 有些服务器会互相冲突
   - 不确定哪个服务器真正有用
2. **创建隔离环境**：`verse fork experiment/minimal-mcp --isolate`
   - 创建新分支 + 新 Verse
   - 复制 `.claude/` 配置到独立目录
3. **修改 EnvSpec**：编辑 `.verse/env.yaml`
   - 只保留 2 个核心 MCP 服务器
   - 禁用其他插件
4. **测试任务**：在新 Verse 中运行 Claude Code
   - 执行相同的开发任务
   - MultiverseOS 自动使用新的 EnvSpec
5. **对比性能**：`verse compare main experiment/minimal-mcp`
   - 对比 token 消耗：减少 30%
   - 对比响应时间：快 2 倍
   - 对比成功率：相同

**啊哈时刻**：
"原来那 3 个 MCP 服务器根本没用，还拖慢了速度！现在我可以放心删掉它们了。"

**价值**：从环境污染到干净实验 — 隔离控制

---

### 旅程 4：团队协作 — 从"个人经验"到"团队知识"

**角色**：团队 Tech Lead Taylor
**场景**：团队有 5 个人在用 Claude Code，想分享最佳实践

**步骤**：
1. **当前问题**：每个人都在摸索自己的 prompt 和 skill
   - 有人效果好，有人效果差
   - 没有统一的最佳实践
2. **导出成功案例**：`verse export run-156 --template`
   - 导出一次成功的 Run 为模板
   - 包含 EnvSpec、skill 定义、关键 prompt
3. **分享给团队**：提交到 git 仓库
   - `.verse/templates/api-refactor.yaml`
   - 团队成员可以直接使用
4. **应用模板**：其他成员运行 `verse apply api-refactor`
   - 自动创建新 Verse
   - 复制成功的配置
   - 可以在此基础上继续优化
5. **积累知识库**：随着时间推移
   - 团队积累了 20+ 个模板
   - 每个模板都是验证过的最佳实践
   - 新成员可以快速上手

**啊哈时刻**：
"我们终于有了一个团队共享的 'Claude Code 最佳实践库'，不用每个人都重新摸索了！"

**价值**：从个人经验到团队知识 — 可复用性

---

## 域特定需求

### 本地优先架构
- **部署模式**：个人开发者本地部署，无需云端服务
- **数据存储**：所有数据（事件、快照、配置）存储在本地
- **隐私保护**：代码和 prompt 不离开本地环境

### Claude Code 深度集成
- **MVP 范围**：专注 Claude Code 集成
  - Hooks 事件采集
  - Statusline 数据获取
  - OpenTelemetry 可选支持
- **未来扩展**：预留多提供商接口（OpenAI Codex、GitHub Copilot 等）

### 成本追踪（非控制）
- **记录 Token 使用**：按 run/step 汇总
- **成本可见性**：在 UI 中展示，用于对比分析
- **无预算限制**：不设置告警或硬性限制

### 技术约束
- **API 依赖**：依赖 Anthropic API 可用性
- **非确定性处理**：明确区分 proxy replay（确定）vs audit rerun（非确定）
- **性能要求**：
  - 事件采集延迟 < 1 秒
  - 容器启动时间 < 30-60 秒
  - 本地 SQLite 数据库性能

### 实验可复现性
- **环境版本化**：EnvSpec 固化所有影响结果的变量
- **Workspace 快照**：Git + worktree + patch 管理
- **回放策略**：只回放录制的事件（Proxy Replay），重跑即创建新 Verse 对比

---

## 创新与新颖模式

### 检测到的创新领域

**1. 范式转变：从被动观测到主动实验控制**
- 现有工具（Langfuse、Agenta）回答"发生了什么"
- MultiverseOS 回答"如果改变 X，结果会怎样"
- 将 AI agent 开发从"手工艺"转变为"工程学科"

**2. 环境即代码（EnvSpec）**
- 将隐式执行环境（skills、MCP、模型配置、工具策略）显式化
- 声明式、可版本化、可移植的环境规格
- 类比：Docker 之于应用环境，EnvSpec 之于 AI agent 环境

**3. 逻辑分支与物理分支分离**
- 物理分支 = git branch/worktree（代码状态）
- 逻辑分支 = 实验配方（环境配置）
- 任意组合实现指数级实验空间

**4. 简化的回放策略**
- **回放 = 看历史录像**：Proxy Replay 回放已录制的事件和输出，100% 确定性
- **重跑 = 新实验**：创建新 Verse，Fork 新分支，记录新 Run，然后对比
- 承认 LLM 非确定性，不追求"完全相同的重跑"
- 用户心智模型清晰：回放用于审阅，重跑用于对比

**5. 时间旅行与分叉探索**
- 从任意检查点创建新实验分支
- 不是"撤销"而是"多路径探索"
- 保留所有历史，支持对比分析

### 市场定位与竞争差异

**MultiverseOS 不是：**
- 又一个 LLM 可观测工具
- 更好的日志系统
- Prompt 管理平台

**MultiverseOS 是：**
- AI agent 开发的"实验操作系统"
- 将环境版本化的基础设施
- 科学实验方法应用于 agent 工程

**类比定位：**
- Git 让代码版本化 → MultiverseOS 让 agent 环境版本化
- A/B 测试让产品迭代可量化 → MultiverseOS 让 agent 配置迭代可量化

### 验证方法

**可复现性验证：**
- 同一 EnvSpec + 同一任务，proxy replay 应 100% 一致
- 跨机器、跨时间的一致性测试

**效率验证：**
- "从想法到对比结果"时间：目标从 30-90 分钟降至 5-15 分钟
- 对比实验操作步数：从 10+ 步降至 3 步
- 需要在 MVP 阶段建立真实基线数据

**知识传递验证：**
- 成功配置的复现时间 < 15 分钟
- 个人开发者能快速迭代 skill 配置

**回归检测验证：**
- 通过对比历史 run 定位问题的时间减少 50-80%

### 风险缓解

**风险 1：EnvSpec 覆盖不全**
- 缓解：MVP 先覆盖核心变量（模型、skills、MCP）
- 备选：降级为"最佳努力"记录，仍有观测价值

**风险 2：学习曲线过高**
- 缓解：渐进式揭示复杂功能，新用户先看简单对比
- 备选：提供预设模板和向导式引导

**风险 3：用户不需要对比功能**
- 缓解：MVP 先验证核心场景（skill 迭代、配置优化）
- 备选：简化为纯观测工具

**风险 4：性能瓶颈**
- 缓解：本地 SQLite 存储，异步事件采集
- 备选：限制快照频率，优化存储策略

---

## Developer Tool 特定需求

### 项目类型概述

MultiverseOS 是一个 TypeScript/Node.js 开发的 CLI 工具，专注于为 Claude Code 提供实验操作系统能力。作为开发者工具，它需要简单的安装流程、清晰的 CLI 接口、以及完善的文档支持。

### 语言与运行时

**主要技术栈：**
- TypeScript（开发语言）
- Node.js（运行时）
- 目标用户：使用 Claude Code 的开发者

**版本要求：**
- Node.js >= 18
- TypeScript 编译目标（ES2020+）

### 安装方式

**包管理器支持：**
- **npm**：`npm install -g @multiverseos/cli`
- **pnpm**：`pnpm add -g @multiverseos/cli`
- **bun**（考虑支持）：`bun add -g @multiverseos/cli`

**安装验证：**
- `verse --version` 显示版本号
- `verse --help` 显示命令帮助

### CLI 接口设计

**核心命令：**
- `verse init` - 初始化项目
- `verse run` - 启动容器化实验
- `verse replay <run-id>` - 回放历史 run
- `verse fork <run-id>` - 从 run 创建新分支
- `verse compare <run-id-1> <run-id-2>` - 对比两次 run
- `verse ui` - 启动 Web 仪表盘

**命令特性：**
- 交互式提示（使用 inquirer 或类似库）
- 结构化输出（支持 `--json` 标志）
- 进度指示器（长时间操作）
- 错误信息清晰可操作

### 文档需求

**使用指南：**
- 快速开始（5 分钟上手）
- 核心概念（Verse、EnvSpec、Run、Replay）
- 常见场景（skill 迭代、配置对比）
- 故障排查

**架构文档：**
- 系统架构概览
- 数据模型（LogicalBranch、Run、Step、Event）
- 事件采集机制（hooks、statusline、OTel）
- 扩展点（自定义适配器）

### 示例与参考

**当前 MVP 作为示例：**
- 现有的 MVP 实现即为参考示例
- 展示完整的工作流程
- 包含真实的使用场景

**文档中的代码片段：**
- 基本使用示例
- EnvSpec 配置示例
- 常见问题解决方案

---

## 项目范围与分阶段开发

### MVP 策略与理念

**MVP 方法：** 问题解决型 MVP - 聚焦核心场景"skill 迭代对比实验"

**核心价值主张：** 让开发者能在隔离环境中运行实验、回放历史、对比差异，将对比实验时间从 30-90 分钟降至 15 分钟以内。

**资源要求：**
- 2-3 名全栈开发者（TypeScript/Node.js/Docker）
- 1 名前端开发者（React/时间线 UI）
- 开发周期：2-3 个月

### MVP 功能集（Phase 1）

**核心用户旅程支持：**
- 旅程 1：首次使用 - 从"看不见"到"看得见"
- 旅程 2：实验对比 - 从"试错"到"对照实验"

**必需能力：**
1. **完善事件采集** - hooks + statusline + buffer drain，零丢失
2. **EnvSpec v1** - 声明式配置（模型 + skills + MCP + 工具策略）
3. **Docker 隔离** - 每个 Verse 对应一个容器，按 EnvSpec 配置环境
4. **EnvSpec Applier** - 构建 Docker image、启动容器、挂载项目 repo
5. **容器内事件上报** - 容器内 hooks 事件上报到宿主 Run Ledger
6. **Proxy Replay** - 回放录制的工具输出（含自动化验收测试）
7. **对比 UI** - 两个 run 的事件 diff + 代码 diff 并排展示
8. **基础 CLI** - `verse run`、`verse replay`、`verse compare`、`verse ui`
9. **成本追踪** - 按 run/step 汇总 token 和成本

### Post-MVP 功能（Phase 2: Growth）

**运行时控制 + 精确实验：**
- Tool Plane Runtime Proxy（容器内运行时拦截）
- Checkpoint 系统：从任意 Step 创建 checkpoint
- Fork-from-Checkpoint：分叉实验，重放事件序列
- EnvSpec v2：skill bundle 版本锁定 + hash 校验
- Workspace Snapshot：git commit + patch + 非 git 文件
- OTel 集成

### 未来扩展（Phase 3: Vision）

**审计 + 治理：**
- Secrets 管理 + RBAC
- 组织级策略分发
- 多维分析（按模型/插件归因）
- Tool Plane v2：工具沙箱化、工具替换

### 风险缓解策略

**技术风险：**
- Docker 容器启动性能 → 优化镜像大小，使用缓存层
- 事件采集稳定性 → buffer + 重试机制，目标 95% 可靠性

**市场风险：**
- 用户不需要对比功能 → MVP 先验证核心场景（skill 迭代）
- 学习曲线过高 → 渐进式 UI，新用户先看简单对比

**资源风险：**
- 开发资源不足 → 优先 Proxy Replay，暂缓 Checkpoint 系统
- 性能瓶颈 → 本地 SQLite + 异步事件处理

---

## 功能需求

### 环境配置管理

- FR1: 开发者可以创建 EnvSpec 配置文件（包含模型配置、skills、MCP、工具策略）
- FR2: 开发者可以编辑现有的 EnvSpec 配置
- FR3: 开发者可以验证 EnvSpec 的完整性和正确性
- FR4: 系统可以版本化 EnvSpec 配置
- FR5: 开发者可以查看 EnvSpec 的历史版本

### 实验执行

- FR6: 开发者可以基于 EnvSpec 启动容器化实验
- FR7: 系统可以根据 EnvSpec 构建 Docker 镜像
- FR8: 系统可以在隔离容器中运行 Claude Code 会话
- FR9: 系统可以将项目 repo 挂载到容器内
- FR10: 开发者可以查看正在运行的实验状态

### 事件采集与存储

- FR11: 系统可以通过 hooks 捕获 Claude Code 事件
- FR12: 系统可以通过 statusline 获取会话元数据
- FR13: 系统可以将事件存储到 Run Ledger
- FR14: 系统可以保证事件采集的零丢失（buffer + drain）
- FR15: 容器内的事件可以上报到宿主 Run Ledger

### 回放与审阅

- FR16: 开发者可以回放历史 run 的完整事件序列
- FR17: 开发者可以查看 run 的时间线视图
- FR18: 开发者可以查看特定 step 的详细信息
- FR19: 系统可以按时间顺序重放录制的工具输出
- FR20: 开发者可以在回放中暂停和跳转

### 对比分析

- FR21: 开发者可以选择两个 run 进行对比
- FR22: 系统可以展示两个 run 的事件差异
- FR23: 系统可以展示两个 run 的代码 diff
- FR24: 系统可以并排显示对比结果
- FR25: 开发者可以查看对比的详细差异点

### 成本与指标追踪

- FR26: 系统可以记录每个 run 的 token 使用量
- FR27: 系统可以计算每个 run 的成本
- FR28: 系统可以按 step 汇总 token 和成本
- FR29: 开发者可以查看 run 的成本明细
- FR30: 开发者可以在对比视图中查看成本差异

### CLI 接口

- FR31: 开发者可以通过 CLI 初始化项目（verse init）
- FR32: 开发者可以通过 CLI 启动实验（verse run）
- FR33: 开发者可以通过 CLI 回放 run（verse replay）
- FR34: 开发者可以通过 CLI 对比 run（verse compare）
- FR35: 开发者可以通过 CLI 启动 Web UI（verse ui）
- FR36: CLI 可以显示命令帮助和版本信息
- FR37: CLI 可以提供交互式提示
- FR38: CLI 可以输出结构化数据（JSON 格式）

### Web UI 界面

- FR39: 开发者可以通过 Web UI 查看所有 run 列表
- FR40: 开发者可以通过 Web UI 查看 run 的时间线
- FR41: 开发者可以通过 Web UI 查看事件详情
- FR42: 开发者可以通过 Web UI 执行对比操作
- FR43: 开发者可以通过 Web UI 查看代码 diff
- FR44: 开发者可以通过 Web UI 过滤和搜索 run

### 数据管理

- FR45: 系统可以将 run 数据存储到本地 SQLite 数据库
- FR46: 系统可以管理 workspace 快照
- FR47: 开发者可以删除历史 run 数据
- FR48: 系统可以导出 run 数据
- FR49: 系统可以清理过期数据

### 错误处理与诊断

- FR50: 系统可以记录错误和异常信息
- FR51: 开发者可以查看错误日志
- FR52: CLI 可以提供清晰的错误提示
- FR53: 系统可以在失败时提供诊断建议

---

## 非功能需求

### 性能

- NFR1: 事件采集应尽可能低延迟，不阻塞 Claude Code 执行
- NFR2: 容器启动时间应在合理范围内
- NFR3: UI 响应应流畅，不影响用户操作

### 可靠性

- NFR4: 事件采集应保证零丢失（通过 buffer + drain 机制）
- NFR5: 数据存储应保证完整性和一致性
- NFR6: 系统错误应有清晰的日志和诊断信息

### 安全性

- NFR7: 代码和 prompt 数据应存储在本地，不上传云端
- NFR8: 容器应提供隔离环境，防止环境污染

### 可维护性

- NFR9: 代码应有清晰的模块划分和文档
- NFR10: 配置文件应易于理解和修改
- NFR11: 错误信息应提供可操作的诊断建议

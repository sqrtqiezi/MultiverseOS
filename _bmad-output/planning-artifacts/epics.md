---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-03-27.md
status: complete
workflowType: epics-and-stories
---

# MultiverseOS - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MultiverseOS, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: 开发者可以创建 EnvSpec 配置文件（包含模型配置、skills、MCP、工具策略）  
FR2: 开发者可以编辑现有的 EnvSpec 配置  
FR3: 开发者可以验证 EnvSpec 的完整性和正确性  
FR4: 系统可以版本化 EnvSpec 配置  
FR5: 开发者可以查看 EnvSpec 的历史版本  
FR6: 开发者可以基于 EnvSpec 启动容器化实验  
FR7: 系统可以根据 EnvSpec 构建 Docker 镜像  
FR8: 系统可以在隔离容器中运行 Claude Code 会话  
FR9: 系统可以将项目 repo 挂载到容器内  
FR10: 开发者可以查看正在运行的实验状态  
FR11: 系统可以通过 hooks 捕获 Claude Code 事件  
FR12: 系统可以通过 statusline 获取会话元数据  
FR13: 系统可以将事件存储到 Run Ledger  
FR14: 系统可以保证事件采集的零丢失（buffer + drain）  
FR15: 容器内的事件可以上报到宿主 Run Ledger  
FR16: 开发者可以回放历史 run 的完整事件序列  
FR17: 开发者可以查看 run 的时间线视图  
FR18: 开发者可以查看特定 step 的详细信息  
FR19: 系统可以按时间顺序重放录制的工具输出  
FR20: 开发者可以在回放中暂停和跳转  
FR21: 开发者可以选择两个 run 进行对比  
FR22: 系统可以展示两个 run 的事件差异  
FR23: 系统可以展示两个 run 的代码 diff  
FR24: 系统可以并排显示对比结果  
FR25: 开发者可以查看对比的详细差异点  
FR26: 系统可以记录每个 run 的 token 使用量  
FR27: 系统可以计算每个 run 的成本  
FR28: 系统可以按 step 汇总 token 和成本  
FR29: 开发者可以查看 run 的成本明细  
FR30: 开发者可以在对比视图中查看成本差异  
FR31: 开发者可以通过 CLI 初始化项目（verse init）  
FR32: 开发者可以通过 CLI 启动实验（verse run）  
FR33: 开发者可以通过 CLI 回放 run（verse replay）  
FR34: 开发者可以通过 CLI 对比 run（verse compare）  
FR35: 开发者可以通过 CLI 启动 Web UI（verse ui）  
FR36: CLI 可以显示命令帮助和版本信息  
FR37: CLI 可以提供交互式提示  
FR38: CLI 可以输出结构化数据（JSON 格式）  
FR39: 开发者可以通过 Web UI 查看所有 run 列表  
FR40: 开发者可以通过 Web UI 查看 run 的时间线  
FR41: 开发者可以通过 Web UI 查看事件详情  
FR42: 开发者可以通过 Web UI 执行对比操作  
FR43: 开发者可以通过 Web UI 查看代码 diff  
FR44: 开发者可以通过 Web UI 过滤和搜索 run  
FR45: 系统可以将 run 数据存储到本地 SQLite 数据库  
FR46: 系统可以管理 workspace 快照  
FR47: 开发者可以删除历史 run 数据  
FR48: 系统可以导出 run 数据  
FR49: 系统可以清理过期数据  
FR50: 系统可以记录错误和异常信息  
FR51: 开发者可以查看错误日志  
FR52: CLI 可以提供清晰的错误提示  
FR53: 系统可以在失败时提供诊断建议

### NonFunctional Requirements

NFR1: 事件采集应尽可能低延迟，不阻塞 Claude Code 执行  
NFR2: 容器启动时间应在合理范围内  
NFR3: UI 响应应流畅，不影响用户操作  
NFR4: 事件采集应保证零丢失（通过 buffer + drain 机制）  
NFR5: 数据存储应保证完整性和一致性  
NFR6: 系统错误应有清晰的日志和诊断信息  
NFR7: 代码和 prompt 数据应存储在本地，不上传云端  
NFR8: 容器应提供隔离环境，防止环境污染  
NFR9: 代码应有清晰的模块划分和文档  
NFR10: 配置文件应易于理解和修改  
NFR11: 错误信息应提供可操作的诊断建议

### Additional Requirements

- 棕地约束：保持现有 TypeScript monorepo（`packages/core|cli|hooks|ui`）并增量演进。  
- 架构边界：所有持久化访问通过 core schema/store，不允许跨层直接写数据库。  
- 事件语义：append-only event ledger，run/step/event 关联规则在 ingest engine 内唯一实现。  
- 安全边界：本地回环地址服务优先（127.0.0.1），敏感信息不入 ledger 明文。  
- 一致性要求：新增事件类型必须同步更新 schema、ingest、API contract、UI rendering。  
- Starter 约束：不引入新脚手架，首个实现阶段围绕 `EnvSpec v1 + Tool Registry + Policy Evaluator`。

### UX Design Requirements

No dedicated UX design document found in planning artifacts at this time. UX stories are derived from PRD FR39-FR44 and existing architecture constraints.

### FR Coverage Map

FR1-FR5: Epic 1（实验环境配置管理）  
FR6-FR10: Epic 2（容器化实验执行）  
FR11-FR15: Epic 2（采集与账本）  
FR16-FR20: Epic 3（回放与时间线审阅）  
FR21-FR25: Epic 4（对比分析）  
FR26-FR30: Epic 4（成本与指标）  
FR31: Epic 1（初始化）  
FR32: Epic 2（运行）  
FR33: Epic 3（回放）  
FR34: Epic 4（对比）  
FR35: Epic 5（UI 启动）  
FR36-FR38: Epic 1（CLI 基础体验）  
FR39-FR44: Epic 5（Web UI 浏览、过滤、交互）  
FR45: Epic 1（本地数据库初始化）  
FR46: Epic 2（workspace 快照）  
FR47-FR49: Epic 6（数据治理）  
FR50-FR53: Epic 6（错误处理与诊断）

## Epic List

### Epic 1: 初始化与实验环境配置管理
建立 `verse init`、EnvSpec 生命周期与 CLI 基础能力，让开发者能够创建、验证、编辑并追踪实验环境配置。  
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR31, FR36, FR37, FR38, FR45

### Epic 2: 容器化实验执行与采集落账
让开发者能够基于 EnvSpec 启动隔离实验，并将完整执行事件稳定采集到 Run Ledger。  
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR32, FR46

### Epic 3: 回放与时间线审阅
让开发者能够回放历史运行并按 step 审阅完整执行轨迹。  
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR33, FR40, FR41

### Epic 4: 运行对比与成本归因
让开发者能够对两次运行进行差异分析，并获得 token/成本级别的定量比较。  
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR34, FR42, FR43

### Epic 5: Web UI 运行浏览与交互
让开发者在 Web UI 中浏览 run、执行过滤搜索并触发核心分析动作。  
**FRs covered:** FR35, FR39, FR44

### Epic 6: 数据治理与诊断运维
让开发者可管理历史运行数据、导出信息并在失败场景获得可执行诊断。  
**FRs covered:** FR47, FR48, FR49, FR50, FR51, FR52, FR53

## Epic 1: 初始化与实验环境配置管理

建立 `verse init`、EnvSpec 生命周期与 CLI 基础能力，让开发者能够创建、验证、编辑并追踪实验环境配置。

### Story 1.1: 初始化本地实验工作区

As a 开发者,  
I want 通过 `verse init` 初始化本地工作区和数据库,  
So that 我可以在零手工配置下开始记录实验。

**Implements:** FR31, FR45

**Acceptance Criteria:**

**Given** 当前仓库尚未初始化 MultiverseOS  
**When** 我执行 `verse init`  
**Then** 系统创建 `.multiverseos` 目录和 SQLite 数据库  
**And** 初始化结果输出包含后续可执行命令

**Given** 已完成初始化  
**When** 再次执行 `verse init`  
**Then** 初始化流程应幂等执行，不破坏已有数据  
**And** 给出明确提示说明已存在配置

### Story 1.2: 创建与校验 EnvSpec

As a harness 工程师,  
I want 创建并验证 EnvSpec 配置,  
So that 实验运行环境可声明式定义且可检查正确性。

**Implements:** FR1, FR3

**Acceptance Criteria:**

**Given** 我提供包含模型、skills、MCP、工具策略的 EnvSpec 文件  
**When** 执行 `verse env validate`  
**Then** 系统返回结构化校验结果  
**And** 指出缺失字段与非法配置位置

**Given** EnvSpec 完整且合法  
**When** 执行校验命令  
**Then** 返回通过状态  
**And** 可直接用于后续实验执行

### Story 1.3: EnvSpec 编辑、版本化与历史查询

As a harness 工程师,  
I want 编辑 EnvSpec 并查看历史版本,  
So that 我可以追踪环境变更并回溯决策。

**Implements:** FR2, FR4, FR5

**Acceptance Criteria:**

**Given** 已存在 EnvSpec v1  
**When** 我修改配置并保存  
**Then** 系统生成新版本记录  
**And** 保留旧版本可追踪引用

**Given** 存在多个 EnvSpec 版本  
**When** 我执行历史查询命令  
**Then** 能按时间顺序看到版本列表  
**And** 可以查看任一版本的完整配置

### Story 1.4: CLI 基础交互体验与结构化输出

As a 开发者,  
I want CLI 提供帮助、交互提示和 JSON 输出,  
So that 我可以在人工与自动化场景中稳定使用命令。

**Implements:** FR36, FR37, FR38

**Acceptance Criteria:**

**Given** 我执行任一 `verse` 子命令的 help 选项  
**When** 命令行返回帮助信息  
**Then** 包含参数说明、示例与错误用法提示  
**And** 输出格式与现有命令保持一致

**Given** 我使用 `--json` 运行支持命令  
**When** 命令完成  
**Then** 返回可被程序解析的 JSON  
**And** 不混入非结构化日志文本

## Epic 2: 容器化实验执行与采集落账

让开发者能够基于 EnvSpec 启动隔离实验，并将完整执行事件稳定采集到 Run Ledger。

### Story 2.1: 基于 EnvSpec 启动容器化实验

As a 开发者,  
I want 使用 `verse run` 启动隔离实验容器,  
So that 我能在可控环境中执行 Claude Code 会话。

**Implements:** FR6, FR7, FR8, FR9, FR10, FR32

**Acceptance Criteria:**

**Given** EnvSpec 校验通过且项目仓库可访问  
**When** 我执行 `verse run`  
**Then** 系统构建或复用目标镜像并启动容器  
**And** 将仓库按约定路径挂载到容器内

**Given** 运行中的实验容器  
**When** 我查询运行状态  
**Then** 返回 run 标识、状态、开始时间与关键元数据  
**And** 在容器失败时返回明确失败原因

### Story 2.2: Hooks 与 statusline 事件采集落账

As a 开发者,  
I want 自动采集会话事件并写入 Run Ledger,  
So that 我可以完整追踪每次实验执行过程。

**Implements:** FR11, FR12, FR13, FR14, FR15

**Acceptance Criteria:**

**Given** hooks 与 statusline 已注册  
**When** Claude Code 触发工具调用生命周期事件  
**Then** 系统按 run/step/event 规则写入 ledger  
**And** 事件顺序满足单 run 内可追踪要求

**Given** 采集端暂时不可用  
**When** 事件上报失败  
**Then** 事件写入本地 buffer 并在服务恢复后自动 drain  
**And** 不丢失事件记录

### Story 2.3: Workspace 快照管理

As a harness 工程师,  
I want 管理 run 对应的 workspace 快照,  
So that 后续回放与差异分析有稳定上下文基线。

**Implements:** FR46

**Acceptance Criteria:**

**Given** run 进入关键阶段或结束  
**When** 系统执行快照策略  
**Then** 生成与 run 关联的 snapshot artifact  
**And** 元数据包含来源 run、时间和哈希

**Given** 需要读取快照信息  
**When** 查询 run 详情  
**Then** 返回可追踪的快照引用  
**And** 缺失快照时给出明确诊断提示

## Epic 3: 回放与时间线审阅

让开发者能够回放历史运行并按 step 审阅完整执行轨迹。

### Story 3.1: 时间线查询与 step 详情

As a 开发者,  
I want 查看 run 时间线和 step 详情,  
So that 我能快速理解一次运行的关键行为。

**Implements:** FR17, FR18, FR40, FR41

**Acceptance Criteria:**

**Given** run 已有事件数据  
**When** 我在 CLI 或 UI 中打开 timeline  
**Then** 系统按时间顺序展示 step 列表  
**And** 每个 step 可展开查看详情

**Given** 某 step 涉及工具调用或编辑  
**When** 我查看 step 详情  
**Then** 返回关联事件、摘要和元信息  
**And** 不破坏现有 API 返回兼容性

### Story 3.2: 回放控制与命令入口

As a 开发者,  
I want 使用 `verse replay` 回放历史 run,  
So that 我能重现关键过程并定位问题。

**Implements:** FR16, FR19, FR20, FR33

**Acceptance Criteria:**

**Given** 某 run 已完成且存在可回放数据  
**When** 我执行 `verse replay <run-id>`  
**Then** 系统按记录顺序执行回放  
**And** 回放状态在过程中可被查询

**Given** 回放进行中  
**When** 我执行暂停或跳转操作  
**Then** 回放状态正确切换  
**And** 跳转后继续按目标位置运行

## Epic 4: 运行对比与成本归因

让开发者能够对两次运行进行差异分析，并获得 token/成本级别的定量比较。

### Story 4.1: 对比引擎与差异数据聚合

As a 开发者,  
I want 对比两个 run 的事件和代码差异,  
So that 我可以判断配置或策略变更的影响。

**Implements:** FR21, FR22, FR23, FR25, FR34

**Acceptance Criteria:**

**Given** 两个可用 run 标识  
**When** 我执行 `verse compare <a> <b>`  
**Then** 系统返回事件差异、代码差异和关键差异点  
**And** 差异结果可被 UI 直接消费

**Given** 其中一个 run 数据不完整  
**When** 发起对比  
**Then** 返回部分结果和明确缺失项说明  
**And** 不导致整体对比失败崩溃

### Story 4.2: 成本与 token 统计归因

As a 开发者,  
I want 查看 run/step 维度的 token 与成本统计,  
So that 我能进行效率与成本优化。

**Implements:** FR26, FR27, FR28, FR29, FR30

**Acceptance Criteria:**

**Given** run 事件包含可计量字段  
**When** 我查询成本报表  
**Then** 返回 run 总量与 step 维度明细  
**And** 支持对比视图展示成本差异

**Given** 某 step 缺失 token 或成本字段  
**When** 聚合统计  
**Then** 系统标记该字段缺失并继续计算其他项  
**And** 诊断信息可追踪到具体 step

### Story 4.3: UI 并排对比体验

As a 开发者,  
I want 在 Web UI 中并排查看两次 run 的对比结果,  
So that 我能在一个界面完成差异分析。

**Implements:** FR24, FR42, FR43

**Acceptance Criteria:**

**Given** 已加载两个 run 的对比结果  
**When** 打开 compare 视图  
**Then** UI 以并排方式展示事件和代码差异  
**And** 支持定位到具体差异点

**Given** 对比数据体量较大  
**When** 用户滚动或切换面板  
**Then** 页面交互保持可用  
**And** 不出现明显卡顿导致操作中断

## Epic 5: Web UI 运行浏览与交互

让开发者在 Web UI 中浏览 run、执行过滤搜索并触发核心分析动作。

### Story 5.1: 启动 UI 与 run 列表浏览

As a 开发者,  
I want 通过 `verse ui` 打开并浏览 run 列表,  
So that 我可以快速定位需要分析的实验运行。

**Implements:** FR35, FR39

**Acceptance Criteria:**

**Given** 本地服务可用  
**When** 我执行 `verse ui`  
**Then** 系统启动或打开 Web UI 入口  
**And** 默认展示 run 列表视图

**Given** run 列表存在多条记录  
**When** 我选择某一 run  
**Then** 成功跳转到对应详情或 timeline  
**And** 保留返回列表的导航能力

### Story 5.2: run 过滤与搜索

As a 开发者,  
I want 对 run 列表进行过滤和搜索,  
So that 我能在高数据量场景快速定位目标运行。

**Implements:** FR44

**Acceptance Criteria:**

**Given** run 列表页面已加载  
**When** 我输入搜索条件或选择过滤项  
**Then** 列表结果按条件更新  
**And** 清空条件后恢复完整列表

**Given** 搜索结果为空  
**When** 页面渲染空状态  
**Then** 显示可理解提示和下一步建议  
**And** 不影响继续调整过滤条件

## Epic 6: 数据治理与诊断运维

让开发者可管理历史运行数据、导出信息并在失败场景获得可执行诊断。

### Story 6.1: 历史数据删除与清理

As a 开发者,  
I want 删除单个 run 和清理过期数据,  
So that 我可以控制本地存储成本并维持系统健康。

**Implements:** FR47, FR49

**Acceptance Criteria:**

**Given** 指定 run 存在  
**When** 我执行删除操作  
**Then** 系统删除该 run 及其关联数据引用  
**And** 删除结果可审计

**Given** 配置了数据保留策略  
**When** 执行清理任务  
**Then** 过期数据被批量清理  
**And** 清理过程输出统计与失败项

### Story 6.2: 运行数据导出

As a 开发者,  
I want 导出 run 数据用于审阅或归档,  
So that 我可以在外部系统复用实验证据。

**Implements:** FR48

**Acceptance Criteria:**

**Given** 指定 run 存在且用户有导出权限  
**When** 我执行导出命令  
**Then** 系统生成可读取的导出包或结构化文件  
**And** 包含 run 元数据、事件和必要引用

**Given** 导出过程中遇到缺失 artifact  
**When** 导出完成  
**Then** 报告缺失项但导出不整体中断  
**And** 结果中包含可追踪告警

### Story 6.3: 错误日志与诊断建议

As a 开发者,  
I want 在失败时获得清晰错误和诊断建议,  
So that 我能快速定位并修复问题。

**Implements:** FR50, FR51, FR52, FR53

**Acceptance Criteria:**

**Given** 运行过程中发生错误  
**When** 系统记录失败事件  
**Then** 错误日志包含上下文信息和错误分类  
**And** 可通过 CLI/UI 查询到对应记录

**Given** 错误类型已知并有建议模板  
**When** 用户查看错误详情  
**Then** 返回可执行的诊断建议  
**And** 建议内容与当前错误类型匹配

# MultiverseOS — 项目文档索引

> 生成时间: 2026-03-26 | 扫描级别: 全量 | 工作流: 初始扫描

## 项目概览

- **类型**: pnpm monorepo，包含 4 个包
- **主要语言**: TypeScript (ES2022, strict mode)
- **架构**: 事件溯源、本地优先的 Claude Code 实验管理层

## 快速参考

### core（后端）
- **技术栈**: SQLite + Drizzle ORM + Zod + ULID
- **根目录**: `packages/core/`
- **入口**: `src/index.ts`

### cli（命令行工具）
- **技术栈**: Commander.js + Hono + Chalk
- **根目录**: `packages/cli/`
- **入口**: `src/index.ts` → 可执行文件: `verse`

### hooks（库）
- **技术栈**: Zod（声明依赖）、Node.js 内置模块
- **根目录**: `packages/hooks/`
- **入口**: `src/index.ts`

### ui（Web 前端）
- **技术栈**: React 19 + Vite + Tailwind CSS
- **根目录**: `packages/ui/`
- **入口**: `src/main.tsx`

## 生成的文档

- [项目概览](./project-overview.md)
- [架构](./architecture-generated.md)
- [源码树分析](./source-tree-analysis.md)
- [组件清单](./component-inventory.md)
- [开发指南](./development-guide.md)
- [API 契约](./api-contracts.md)
- [数据模型](./data-models.md)
- [集成架构](./integration-architecture.md)

## 已有文档

- [产品需求文档](./prd.md) — 包含可行性研究的原始 PRD
- [架构（原始版）](./architecture.md) — 原始架构讨论文档
- [MVP 架构设计](./plans/2026-03-25-mvp-architecture-design.md) — MVP 架构规划
- [MVP 实施计划](./plans/2026-03-25-mvp-implementation-plan.md) — MVP 实施路线图
- [MVP 架构（设计稿）](./design/2026-03-25-mvp-architecture.md) — MVP 架构设计文档

## 快速开始

```bash
pnpm install
pnpm -r build
pnpm verse init
pnpm verse serve
pnpm verse ui
```

完整的环境搭建说明请参阅[开发指南](./development-guide.md)。

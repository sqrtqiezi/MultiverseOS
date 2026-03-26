# MultiverseOS

MultiverseOS 是面向 Claude Code 的本地优先实验管理层，通过 hooks 自动采集开发事件，并将其组织为 Verses（绑定到 git 分支的实验配方），提供 Timeline UI 可视化。

## 核心概念

- **Verse**: 实验配方（模型配置 + skills + plugins + 权限策略）+ git branch 的 1:1 绑定
- **Run**: 一次 Claude Code 会话的自动记录，无需手动创建
- **Step**: Run 中的逻辑步骤（工具调用、文件编辑、测试等）
- **Event**: 原始事件记录（append-only）
- **Artifact**: 工件（diff、测试报告、日志等）

## 快速开始

### 安装依赖并构建

```bash
pnpm install
pnpm -r build
```

### 初始化项目

```bash
pnpm verse init
```

这会：
- 创建 `.multiverseos/` 数据目录和 SQLite 数据库
- 在 `~/.claude/settings.json` 中注册 hooks

### 启动服务

```bash
pnpm verse serve    # 启动 HTTP 服务（事件摄取 + API）
pnpm verse ui       # 在浏览器中打开 Timeline UI
```

## 命令参考

### Verse 管理

```bash
pnpm verse create <name>              # 创建新 verse
pnpm verse list                       # 列出所有 verses
pnpm verse show <name-or-id>          # 查看 verse 详情
pnpm verse fork <source> <new-name>   # 分叉 verse
pnpm verse diff <a> <b>               # 对比两个 verses
```

### Run 查询

```bash
pnpm verse runs [--verse <id>]        # 列出 runs
pnpm verse inspect <run-id>           # 查看 run 详情
pnpm verse timeline <run-id>          # 显示步骤时间线
pnpm verse events <run-id>            # 导出原始事件
pnpm verse bind <run-id> <verse>      # 绑定孤立 run 到 verse
```

### 其他

```bash
pnpm verse cost [--verse <id>]        # 成本汇总
pnpm verse ui                         # 打开 Web UI
```

## 架构

详见 `docs/design/2026-03-25-mvp-architecture.md`。

核心设计：
- **本地优先**：SQLite + 本地文件系统，零依赖
- **自动采集**：通过 Claude Code hooks 被动记录，不改变工作流
- **可回放**：记录完整事件链，支持审阅和复盘
- **分支化实验**：逻辑分支（配方）与物理分支（git）对齐

## 项目结构

```
packages/
├── core/      # 核心库：数据模型 + 存储 + 事件引擎
├── cli/       # CLI 工具：verse 命令
├── hooks/     # Claude Code hooks 脚本
└── ui/        # React Timeline UI
```

## 开发

```bash
pnpm dev       # 并行启动所有包的 watch 模式
pnpm test      # 运行测试
```

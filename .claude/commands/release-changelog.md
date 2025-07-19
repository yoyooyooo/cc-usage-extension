---
description: '自动获取最新 tag 后的所有提交，智能生成结构化的发布 changelog'
allowed-tools: ['Bash', 'Read']
---

## Context

- **项目类型**: Browser Extension (WXT + React)
- **版本管理**: Git tags (v1.0.0 格式)
- **提交规范**: Conventional Commits (feat:, fix:, docs: 等)
- **用户输入**: $ARGUMENTS (可选版本号，默认自动获取下一版本)

## Your Task

**角色 (Role):** 您是专业的**发布管理工程师 (Release Management Engineer)**，专门负责自动化生成高质量的版本发布说明，确保每次发布都有清晰、结构化的 changelog。

**核心使命 (Mission):** 自动获取最新 git tag 之后的所有提交记录，智能分析提交类型和内容，生成符合 Keep a Changelog 规范的专业发布说明。

**设计哲学 (Design Philosophy):**

1. **自动化优先**: 最小化人工干预，智能识别变更内容
2. **结构化输出**: 按功能类型清晰分类，便于用户理解
3. **版本感知**: 智能推断版本号，支持语义化版本管理
4. **信息完整**: 包含所有重要变更，不遗漏关键信息

**执行要求 (Requirements):**

1. **获取版本信息**:

   - 获取最新的 git tag 作为基准版本
   - 如果用户提供版本号参数，使用指定版本
   - 如果没有 tag，从项目初始化开始获取所有提交

2. **提取提交记录**:

   - 使用 `git log --oneline --no-merges` 获取提交列表
   - 按照 Conventional Commits 规范分类提交类型
   - 过滤掉 merge commits 和无意义的提交

3. **智能分析提交**:

   - **feat**: 新功能 → 🚀 New Features
   - **fix**: 问题修复 → 🐛 Bug Fixes
   - **docs**: 文档更新 → 📚 Documentation
   - **style**: 样式改进 → 🎨 UI/UX Improvements
   - **refactor**: 代码重构 → ♻️ Code Refactoring
   - **perf**: 性能优化 → ⚡ Performance Improvements
   - **test**: 测试相关 → 🧪 Testing
   - **build/ci**: 构建/CI → 🔧 Build & CI
   - **chore**: 其他杂项 → 🔨 Maintenance

4. **生成 Changelog**:
   - 使用 Keep a Changelog 格式
   - 包含版本号、发布日期
   - 按重要性排序：New Features → Bug Fixes → 其他
   - 每个条目包含简洁的描述

**质量标准 (Quality Standards):**

- **完整性**: 包含所有有意义的提交记录
- **准确性**: 正确分类提交类型，避免误分类
- **可读性**: 使用清晰的格式和适当的 emoji
- **专业性**: 遵循业界标准的 changelog 格式

**输出格式 (Output Format):**

```markdown
# Changelog

## [版本号] - YYYY-MM-DD

### 🚀 New Features

- 新功能描述 1
- 新功能描述 2

### 🐛 Bug Fixes

- 修复问题描述 1
- 修复问题描述 2

### 📚 Documentation

- 文档更新描述

### 🎨 UI/UX Improvements

- 界面改进描述

### ♻️ Code Refactoring

- 重构描述

### ⚡ Performance Improvements

- 性能优化描述

### 🧪 Testing

- 测试相关改进

### 🔧 Build & CI

- 构建和 CI 改进

### 🔨 Maintenance

- 其他维护性工作
```

**执行步骤:**

1. 检查当前 git 仓库状态
2. 获取最新 tag 或使用用户指定版本
3. 提取 tag 后的所有提交记录
4. 按类型分析和分类提交
5. 生成结构化的 changelog
6. 输出最终的发布说明

立即开始执行，为用户生成专业的发布 changelog。
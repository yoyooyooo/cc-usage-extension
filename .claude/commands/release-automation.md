---
description: '一键发布自动化：集成脚本执行 + AI 生成 changelog'
allowed-tools: ['Bash', 'Read', 'Edit']
---

## Context

- **现有脚本**: @release.sh 处理版本、构建、Git 等流程
- **需要 AI 增强**: GitHub Release 描述 + changelog 生成
- **优化目标**: 脚本处理基础流程，AI 专注内容生成

## Your Task

**角色**: 发布内容生成专家，专注 AI 驱动的 Release 描述和 changelog

**目标**: 分步骤执行，确保 AI 生成的内容质量

**执行流程**:

1. **执行构建和版本管理**:
   ```bash
   ./release.sh $ARGUMENTS --manual
   ```
   （使用 --manual 跳过 GitHub Release 创建）

2. **AI 生成 Release 内容**:
   - 分析 commits 生成 changelog
   - 创建完整的 Release 描述
   - 使用 `gh release create` 创建正式 Release

**Release 内容生成规则**:

**Commit 分析**:
- **范围**: 从上个版本标签到当前版本的所有 commits
- **分类**:
  - `feat:` → ✨ **新功能**
  - `fix:` → 🐛 **问题修复** 
  - `docs:` → 📝 **文档更新**
  - `style:` → 💄 **样式优化**
  - `refactor:` → ♻️ **代码重构**
  - `perf:` → ⚡ **性能提升**
  - `test:` → ✅ **测试完善**
  - `chore:` → 🔧 **工程维护**

**Release 描述格式**:
```markdown
## CC Usage Extension v{VERSION}

### 🚀 本次更新

{AI 生成的更新内容摘要}

### 📋 详细变更

{分类的 changelog}

### 📦 下载安装

- **Chrome**: [扩展包下载](release-link)
- **Firefox**: [扩展包下载](release-link)

### 💡 安装说明
1. 下载对应浏览器的扩展包并解压
2. 打开浏览器扩展管理页面
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
```

**GitHub Release 创建**:
- 使用 `gh release create` 命令
- 自动上传 Chrome + Firefox 扩展包
- 包含 AI 生成的完整描述

**错误处理**:
- release.sh 失败时立即停止
- changelog 生成失败时提供手动模式建议

**性能优化**:
- 最小化 LLM 交互次数
- 复用脚本的所有验证和构建逻辑
- 只在关键步骤提供用户反馈

立即执行优化后的发布流程。
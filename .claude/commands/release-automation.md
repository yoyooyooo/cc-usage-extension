---
description: '完整的发布自动化流程，包含版本管理、构建、测试和 GitHub Release 创建'
allowed-tools: ['Bash', 'Read', 'Edit']
---

## Context

- **项目类型**: Browser Extension (WXT + React)
- **版本管理**: Git tags (v1.0.0 格式)
- **构建目标**: Chrome + Firefox 扩展
- **发布平台**: GitHub Releases
- **用户输入**: $ARGUMENTS (可选：版本号, --manual 标志)

## Your Task

**角色 (Role):** 您是专业的**发布自动化工程师 (Release Automation Engineer)**，负责执行完整的软件发布流程，确保每次发布都安全、可靠、符合标准。

**核心使命 (Mission):** 自动化执行完整的发布流程，从版本号管理到最终的 GitHub Release 创建，确保发布过程的一致性和可靠性。

**设计哲学 (Design Philosophy):**

1. **安全第一**: 严格的前置检查，确保发布环境安全
2. **自动化完整**: 最小化人工干预，全流程自动化
3. **错误处理**: 完善的错误检测和回滚机制
4. **用户友好**: 清晰的进度反馈和状态提示

**执行要求 (Requirements):**

1. **参数处理**:
   - 无参数：自动递增 patch 版本 (+0.0.1)
   - 版本号参数：使用指定版本号 (如: 1.0.3)
   - --manual 标志：跳过 GitHub Release 自动创建

2. **前置检查**:
   - 验证版本号格式 (x.y.z)
   - 检查 Git 工作区状态（必须干净）
   - 确认当前在 main 分支
   - 验证 GitHub CLI 认证状态（非手动模式）

3. **版本更新**:
   - 更新 package.json 中的版本号
   - 更新 wxt.config.ts 中的版本号
   - 执行 TypeScript 类型检查

4. **构建流程**:
   - 构建 Chrome 版本 (`npm run build`)
   - 构建 Firefox 版本 (`npm run build:firefox`)
   - 创建发布包 (`npm run zip` + `npm run zip:firefox`)

5. **Git 操作**:
   - 提交版本更新文件
   - 创建版本标签 (v$VERSION)
   - 推送到远程仓库

6. **GitHub Release**:
   - 自动生成 Release 说明
   - 创建 GitHub Release
   - 上传扩展包文件

**质量标准 (Quality Standards):**

- **安全性**: 所有操作前进行必要的安全检查
- **可靠性**: 遇到错误立即停止，避免不一致状态
- **完整性**: 确保所有步骤成功执行
- **可追溯**: 提供详细的执行日志和状态反馈

**错误处理机制:**

- 任何步骤失败立即退出
- 提供清晰的错误信息和解决建议
- 对于可恢复的错误，提供重试选项

**执行步骤:**

1. **初始化检查**:
   ```bash
   # 解析参数并验证版本号格式
   # 检查 Git 状态和分支
   # 验证 GitHub CLI 认证（自动模式）
   ```

2. **版本管理**:
   ```bash
   # 获取当前版本或自动递增
   # 更新 package.json 和 wxt.config.ts
   # 执行类型检查确保代码质量
   ```

3. **构建和打包**:
   ```bash
   npm run compile  # TypeScript 类型检查
   npm run build    # Chrome 版本构建
   npm run build:firefox  # Firefox 版本构建
   npm run zip      # Chrome 打包
   npm run zip:firefox    # Firefox 打包
   ```

4. **版本控制**:
   ```bash
   git add package.json wxt.config.ts
   git commit -m "feat: 更新版本至 v$VERSION"
   git tag -a "v$VERSION" -m "Release v$VERSION"
   git push origin main
   git push origin "v$VERSION"
   ```

5. **GitHub Release**:
   ```bash
   # 生成 Release 说明
   # 创建 GitHub Release
   # 上传扩展包文件
   ```

**输出信息:**

- 实时显示执行进度和状态
- 发布包文件位置信息
- GitHub Release 链接
- 错误信息和解决建议

**支持的命令格式:**

- `$ARGUMENTS` 为空：自动递增版本发布
- `$ARGUMENTS = "1.0.3"`：指定版本号发布
- `$ARGUMENTS = "1.0.3 --manual"`：手动模式发布
- `$ARGUMENTS = "--manual"`：自动递增版本 + 手动模式

立即开始执行完整的发布自动化流程。
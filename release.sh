#!/bin/bash

# CC Usage Extension - 快速 Release 脚本
# 用法: ./release.sh [版本号] [--manual]
# 例如: ./release.sh 1.0.1
# 无参数: ./release.sh (自动递增 patch 版本 +0.0.1)
# 手动模式: ./release.sh 1.0.1 --manual

set -e  # 遇到错误立即退出

# 自动递增版本号函数
auto_increment_version() {
    local current_version=$(grep '"version"' package.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
    if [[ ! $current_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "❌ package.json 中的版本号格式错误: $current_version"
        exit 1
    fi
    
    local major=$(echo $current_version | cut -d. -f1)
    local minor=$(echo $current_version | cut -d. -f2)
    local patch=$(echo $current_version | cut -d. -f3)
    
    patch=$((patch + 1))
    echo "$major.$minor.$patch"
}

# 处理参数
VERSION=""
MANUAL_MODE=false

if [ $# -eq 0 ]; then
    # 无参数时自动递增版本
    VERSION=$(auto_increment_version)
    echo "🔄 自动递增版本号到: $VERSION"
elif [ $# -eq 1 ]; then
    if [ "$1" = "--manual" ]; then
        VERSION=$(auto_increment_version)
        MANUAL_MODE=true
        echo "🔄 自动递增版本号到: $VERSION (手动模式)"
    else
        VERSION=$1
        echo "📝 使用指定版本号: $VERSION"
    fi
elif [ $# -eq 2 ]; then
    VERSION=$1
    if [ "$2" = "--manual" ]; then
        MANUAL_MODE=true
        echo "📝 使用指定版本号: $VERSION (手动模式)"
    else
        echo "❌ 参数错误"
        echo "用法: ./release.sh [版本号] [--manual]"
        echo "例如: ./release.sh 1.0.1"
        echo "自动递增: ./release.sh"
        echo "手动模式: ./release.sh 1.0.1 --manual"
        exit 1
    fi
else
    echo "❌ 参数过多"
    echo "用法: ./release.sh [版本号] [--manual]"
    echo "例如: ./release.sh 1.0.1"
    echo "自动递增: ./release.sh"
    echo "手动模式: ./release.sh 1.0.1 --manual"
    exit 1
fi

# 检查版本号格式
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ 版本号格式错误，请使用 x.y.z 格式"
    exit 1
fi

echo "🚀 开始 Release 流程 - 版本 $VERSION"

# 检查 GitHub CLI 认证状态（仅在非手动模式下）
if [ "$MANUAL_MODE" = false ]; then
    echo "🔑 检查 GitHub CLI 认证状态..."
    if ! gh auth status >/dev/null 2>&1; then
        echo "❌ GitHub CLI 未认证或认证已过期"
        echo "请先运行: gh auth login"
        echo "或使用手动模式: ./release.sh $VERSION --manual"
        exit 1
    fi
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ 工作区有未提交的更改，请先提交或暂存"
    git status --short
    exit 1
fi

# 检查是否在 main 分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ 请在 main 分支上执行 release"
    echo "当前分支: $CURRENT_BRANCH"
    exit 1
fi

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 更新 package.json 版本号
echo "📝 更新 package.json 版本号到 $VERSION..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 更新 wxt.config.ts 版本号
echo "📝 更新 wxt.config.ts 版本号到 $VERSION..."
sed -i '' "s/version: '[^']*'/version: '$VERSION'/" wxt.config.ts

# 检查类型
echo "🔍 检查 TypeScript 类型..."
npm run compile

# 构建项目
echo "🔨 构建 Chrome 版本..."
npm run build

echo "🔨 构建 Firefox 版本..."
npm run build:firefox

# 创建发布包
echo "📦 创建发布包..."
npm run zip
npm run zip:firefox

# 提交版本更新
echo "📝 提交版本更新..."
git add package.json wxt.config.ts
git commit -m "feat: 更新版本至 v$VERSION"

# 创建并推送标签
echo "🏷️  创建标签 v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

echo "⬆️  推送到 GitHub..."
git push origin main
git push origin "v$VERSION"

# 显示发布包位置
echo ""
echo "✅ Release 完成！"
echo "📁 发布包位置:"
echo "   Chrome: .output/cc-usage-extension-$VERSION-chrome.zip"
echo "   Firefox: .output/cc-usage-extension-$VERSION-firefox.zip"

# 创建 GitHub Release（自动模式）
if [ "$MANUAL_MODE" = false ]; then
    echo ""
    echo "🎉 创建 GitHub Release..."
    
    # 生成 Release 说明
    RELEASE_NOTES="## CC Usage Extension v$VERSION

### 📦 下载
- **Chrome 扩展**: [cc-usage-extension-$VERSION-chrome.zip](../../releases/download/v$VERSION/cc-usage-extension-$VERSION-chrome.zip)
- **Firefox 扩展**: [cc-usage-extension-$VERSION-firefox.zip](../../releases/download/v$VERSION/cc-usage-extension-$VERSION-firefox.zip)

### 安装说明
1. 下载对应浏览器的扩展包
2. 解压缩文件
3. 在浏览器扩展管理页面启用\"开发者模式\"
4. 点击\"加载已解压的扩展程序\"，选择解压后的文件夹

---
*自动发布于 $(date '+%Y-%m-%d %H:%M:%S')*"

    # 创建 Release 并上传文件
    if gh release create "v$VERSION" \
        ".output/cc-usage-extension-$VERSION-chrome.zip" \
        ".output/cc-usage-extension-$VERSION-firefox.zip" \
        --title "CC Usage Extension v$VERSION" \
        --notes "$RELEASE_NOTES"; then
        echo ""
        echo "🎉 GitHub Release 创建成功！"
        echo "🔗 查看 Release: https://github.com/yoyooyooo/cc-usage-extension/releases/tag/v$VERSION"
    else
        echo ""
        echo "❌ GitHub Release 创建失败"
        echo "🔗 GitHub 地址: https://github.com/yoyooyooo/cc-usage-extension"
        echo "📋 请手动创建 Release 并上传发布包"
        exit 1
    fi
else
    echo ""
    echo "🔗 GitHub 地址: https://github.com/yoyooyooo/cc-usage-extension"
    echo "📋 接下来请到 GitHub 创建 Release 并上传发布包"
fi
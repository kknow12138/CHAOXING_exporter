#!/bin/bash
# 创建简单的占位符图标（纯色PNG）
# 需要 ImageMagick 工具

if ! command -v convert &> /dev/null; then
    echo "ImageMagick 未安装，请手动创建图标或使用在线工具"
    exit 1
fi

# 创建蓝色背景的占位符图标
convert -size 16x16 xc:#1976d2 icon16.png
convert -size 48x48 xc:#1976d2 icon48.png
convert -size 128x128 xc:#1976d2 icon128.png

echo "占位符图标已创建"

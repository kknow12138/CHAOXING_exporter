# 图标占位符

请将以下尺寸的图标放置在此目录：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## 快速生成图标

你可以使用以下方法生成图标：

1. **在线工具**：访问 https://www.favicon-generator.org/ 上传一张图片，生成多种尺寸
2. **使用 ImageMagick**（如果已安装）：
   ```bash
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

## 图标设计建议

- 使用蓝色主题（#1976d2）与扩展界面保持一致
- 包含文档或列表元素，体现"题目导出"功能
- 简洁清晰，在小尺寸下也能识别

## 临时方案

如果暂时没有图标，可以：
1. 从网上下载任意 PNG 图标
2. 重命名为 icon16.png, icon48.png, icon128.png
3. 放置在此目录下

扩展功能不受图标影响，只是视觉效果会有差异。

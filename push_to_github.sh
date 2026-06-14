#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🔓 移除 git 锁文件（如有）..."
rm -f .git/index.lock

echo "📝 提交..."
git commit -m "feat: 雨课堂习题集（studentCards）题目导出支持

- 新增 isYuketangCardsPage / extractYuketangCards / downloadQuizHTML
- 通过 /v2/api/web/cards/detlist/ API 提取题干+选项+答案（纯文字，非缩略图）
- 导出为内置打印按钮的 HTML，可一键另存为 PDF
- 原有雨课堂试卷 Word 导出流程不受影响
- 更新 popup.html 描述文字与 CHANGELOG"

echo "🚀 推送到 GitHub..."
git push origin main

echo "✅ 完成！"

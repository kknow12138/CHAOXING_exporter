# 更新日志

## 2026-06-13（下午）

- 新增 `findChaoxingQuestionsByBlocks`：遍历 `.mark_item` 题型块逐块拆出单题。
- 新增 `getChaoxingBlockType`：从块头（如「三、填空题」）读取权威题型，替代易出错的文本推断，确保 52 道题题型 100% 准确。
- 重构 `findQuestions`：抽出 `findBestContainerSet`，在块级与全局两种拆题结果中取题量更多者。
- 重新打包 `service-worker.js`，纳入综合填空题 `optionGroups`（子题选项分组）导出。

## 2026-06-13

- 修复学习通填空题/材料题中内嵌选择题选项未被正确导出的问题。
- 新增填空题 `optionGroups` 解析：可按小问 `（1）`、`（2）` 等分组提取 A/B/C/D 选项。
- 优化 Word 导出：填空题现在会在【题目内容】后增加【选项】板块，按小问展示选项。
- 修复学习通填空题答案抓取：优先读取 `dl.mark_fill.colorGreen` 的正确答案和 `dl.mark_fill.colorDeep` 的我的答案，避免把得分混入答案。
- 已用学习通作业详情页面中的第 29、30 题验证：多组填空选项和长会计分录选项均可完整读取。

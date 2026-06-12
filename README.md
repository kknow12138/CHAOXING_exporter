# 题目导出助手

一个浏览器扩展，可以把学习通（超星）、长江雨课堂和课堂派页面中的题目导出为 Word 文档，方便离线复习。

## 功能

- 一键抓取当前页面的所有题目
- 支持选择题、判断题、填空题、简答题等各种题型
- 导出为 Word 文档（.docx 格式）
- 支持学习通（超星）、长江雨课堂和课堂派
- 兼容 Edge 和 Chrome 浏览器

## 快速开始（推荐）

无需任何配置，下载即用：

**第一步：** 点击页面右上角绿色的 **Code** 按钮，选择 **Download ZIP**，下载完成后解压到本地任意文件夹。

**第二步：** 点击浏览器右上角的扩展图标 🧩，在弹出菜单底部点击「**管理扩展程序**」。

![步骤1：打开管理扩展程序](assets/install-step1.png)

**第三步：** 进入扩展管理页面后，点击左上角的「**加载未打包的扩展程序**」，选择刚才解压的文件夹即可。

![步骤2：加载未打包的扩展程序](assets/install-step2.png)

扩展图标出现在工具栏后，即可正常使用 ✅

> **Edge** 地址栏输入 `edge://extensions/`；**Chrome** 输入 `chrome://extensions/`，可直接打开扩展管理页面。

---

## 安装

### 准备图标文件

扩展需要图标才能加载。最简单的方法：

1. 随便找三张图片（或者用同一张）
2. 重命名为 `icon16.png`、`icon48.png`、`icon128.png`
3. 放到 `assets/` 文件夹

或者用在线工具生成：https://www.favicon-generator.org/

### 加载扩展

**Edge 浏览器：**
1. 地址栏输入 `edge://extensions/`
2. 打开右上角的"开发人员模式"
3. 点击"加载解压缩的扩展"
4. 选择项目文件夹

**Chrome 浏览器：**
1. 地址栏输入 `chrome://extensions/`
2. 打开右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目文件夹

## 使用

1. 登录学习通、长江雨课堂或课堂派，打开考试、作业、练习或试卷页面
2. 点击浏览器工具栏的扩展图标
3. 点击"抓取并导出题目"
4. 选择保存位置

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（自动监听文件变化）
npm run dev
```

## 项目结构

```
├── manifest.json          # 扩展配置
├── popup/                 # 弹窗界面
├── content/               # 页面脚本
│   ├── parser.js         # 题目解析
│   └── content.js        # 消息处理
├── background/            # 后台服务
│   └── service-worker.js # Word 生成和下载
├── lib/                   # 库文件
│   ├── font-decrypt.js   # 字体解密
│   └── typr.js           # 字体解析（占位符）
└── src/                   # 源代码
    ├── docx-generator.js # Word 生成器
    └── service-worker.js # 后台服务源码
```

## 注意事项

- 仅供个人学习使用，请勿用于考试作弊
- 扩展在本地处理数据，不会上传任何信息
- 页面结构可能更新，如遇问题请提 issue

## 字体解密

学习通使用自定义字体加密文本。如果题目显示乱码：

1. 从 https://github.com/photopea/Typr.js 下载 `Typr.js`
2. 替换 `lib/typr.js` 文件
3. 重新加载扩展

不过大部分情况下不需要字体解密也能正常使用。

## 技术栈

- Manifest V3
- docx - Word 文档生成
- Webpack - 打包工具

## License

MIT

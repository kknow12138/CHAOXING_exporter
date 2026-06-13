# 学习通题目导出器（Python 版）

通过学习通官方接口登录并抓取**已完成作业**的题目与答案，导出为 Word / JSON / Markdown，便于个人复习归档。

> 仅做读取与导出，**不包含任何自动作答或提交作业的功能**。请在遵守学校与平台规定的前提下，仅用于导出本人账号下的资料。

## 安装

```bash
cd py_exporter
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 运行

```bash
.venv/bin/python run.py
```

交互流程：

1. 选择登录方式（二维码 / 账号密码）
   - 二维码：终端会打印二维码，用学习通 App 扫描确认
   - 账号密码：手机号 + 密码（密码经 AES 加密后发送，不落盘）
2. 选择课程
3. 选择作业（支持逗号多选，或 `0` 全部导出）
4. 选择导出格式（1=Word，2=JSON，3=Markdown，可多选）

导出文件写入 `output/` 目录。

## 项目结构

| 文件 | 说明 |
|------|------|
| `chaoxing_exporter/client.py` | API 客户端：登录、取课程/作业、抓题目 HTML |
| `chaoxing_exporter/parser.py` | 把作业页面 HTML 解析为结构化题目 |
| `chaoxing_exporter/exporters.py` | 导出 Word / JSON / Markdown |
| `chaoxing_exporter/cli.py` | 交互式命令行 |
| `run.py` | 入口 |
| `tests/` | 解析器离线测试（含 HTML 样例） |

## 测试

```bash
.venv/bin/python tests/test_parser.py
```

## 已知限制

- 接口与登录加密方式参考自社区项目，若学习通改版可能失效，需更新 `client.py` 中的接口常量。
- 部分页面使用自定义字体加密，纯文本解析可能出现乱码（本工具未做字体反解；浏览器扩展版做了字体反解）。
- 题型识别基于题块内题型标记文本，覆盖单选/多选/判断/填空/简答/论述/编程题。

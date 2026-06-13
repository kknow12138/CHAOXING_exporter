# 学习通题目导出器（Python 版）

通过学习通官方接口登录并抓取**已完成作业**的题目与答案，导出为 Word / JSON / Markdown，便于个人复习归档。

> 仅做读取与导出，**不包含任何自动作答或提交作业的功能**。请在遵守学校与平台规定的前提下，仅用于导出本人账号下的资料。

## Windows 可执行版（免安装 Python）

到本仓库的 [Releases](../../releases) 页面下载 `chaoxing-exporter.exe`，双击运行即可，无需安装 Python 和依赖。

> exe 由 GitHub Actions 在 Windows 上用 PyInstaller 自动打包（见 `.github/workflows/build-windows.yml`）。维护者推送 `v*` 标签即触发构建并发布。

## macOS 安装与配置

macOS 没有 exe，直接用 Python 从源码运行（系统通常自带 Python 3）。

**1. 确认 Python 3**（macOS 自带；终端 `应用程序 → 实用工具 → 终端`）

```bash
python3 --version
```

显示 3.8 以上即可。若提示找不到命令，用 Homebrew 安装：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"  # 没装过 Homebrew 才需要
brew install python3
```

**2. 获取代码**（二选一）

```bash
# 方式 A：git 克隆
git clone https://github.com/kknow12138/CHAOXING_exporter.git
cd CHAOXING_exporter/py_exporter

# 方式 B：在 GitHub 点 Code → Download ZIP，解压后进入 py_exporter 目录
cd ~/Downloads/CHAOXING_exporter/py_exporter
```

**3. 创建虚拟环境并安装依赖**（只需做一次）

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

**4. 运行**

```bash
.venv/bin/python run.py
```

> 提示：每次运行都用 `.venv/bin/python run.py`（无需手动 `activate`）。如果想用 `python run.py` 简写，可先执行 `source .venv/bin/activate` 激活环境。

### macOS 使用须知

- 选择二维码登录时，程序会把二维码存为 `output/login_qr.png` 并**自动用「预览」打开**，同时在终端打印登录链接；用学习通 App 扫描图片即可。
- 首次打开图片若系统询问，允许「预览」打开即可；图片扫不动时，可复制终端里的登录链接到手机浏览器打开。
- 导出文件统一写入 `output/` 目录（在 `py_exporter/` 下）。

## Linux 安装

步骤与 macOS 相同（`python3 -m venv .venv` → `pip install -r requirements.txt` → `.venv/bin/python run.py`）。二维码图片会调用 `xdg-open` 打开。

## 交互流程

1. 选择登录方式（二维码 / 账号密码）
   - 二维码：自动弹出二维码图片并打印登录链接，用学习通 App 扫描确认
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

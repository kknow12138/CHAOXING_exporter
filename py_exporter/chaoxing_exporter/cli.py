"""交互式命令行：登录 → 选课程 → 选作业 → 选导出格式 → 写文件。"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import List

from .client import ChaoxingClient, Course, Work
from .exporters import export

OUTPUT_DIR = Path("output")
FORMAT_CHOICES = {"1": "word", "2": "json", "3": "markdown"}


def _ask(prompt: str) -> str:
    try:
        return input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        print("\n已取消。")
        sys.exit(0)


def _open_file(path: str) -> None:
    """用系统默认程序打开文件。"""
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", path], check=False)
        else:
            subprocess.run(["xdg-open", path], check=False)
    except Exception:
        pass


def _ascii_qr(url: str) -> None:
    try:
        import qrcode

        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception:
        pass


def show_qr(url: str) -> None:
    """生成二维码 PNG 并自动打开，同时打印登录链接（扫不了码时可手动打开/复制）。"""
    print("\n请用【学习通 App】扫描二维码登录（二维码限时，过期请重开）：")
    print(f"\n登录链接（手机扫不了码时，可复制到手机浏览器打开）：\n{url}\n")
    try:
        import qrcode

        img = qrcode.make(url)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        qr_path = OUTPUT_DIR / "login_qr.png"
        img.save(str(qr_path))
        print(f"二维码图片已保存并尝试自动打开：{qr_path.resolve()}")
        _open_file(str(qr_path))
    except Exception as e:
        print(f"(生成二维码图片失败：{e}；改用终端字符二维码)")
        _ascii_qr(url)


def do_login(client: ChaoxingClient) -> None:
    print("\n登录方式： 1) 二维码   2) 账号密码")
    choice = _ask("请选择 [1/2]: ")
    if choice == "2":
        phone = _ask("手机号: ")
        password = _ask("密码: ")
        client.login_password(phone, password)
        print("✓ 账号密码登录成功")
    else:
        url = client.qr_prepare()
        show_qr(url)
        print("等待扫码确认中...")
        client.login_qr()
        print("✓ 二维码登录成功")


def _choose_index(count: int, prompt: str) -> int:
    while True:
        raw = _ask(prompt)
        if raw.isdigit() and 1 <= int(raw) <= count:
            return int(raw) - 1
        print(f"请输入 1~{count} 之间的序号。")


def choose_course(courses: List[Course]) -> Course:
    print("\n课程列表：")
    for i, c in enumerate(courses, 1):
        print(f"  {i}. {c.name}  （{c.teacher}）")
    return courses[_choose_index(len(courses), "选择课程序号: ")]


def choose_works(works: List[Work]) -> List[Work]:
    print("\n作业列表：")
    for i, w in enumerate(works, 1):
        print(f"  {i}. {w.name}  [{w.status}]")
    print("  0. 全部导出")
    raw = _ask("选择作业序号（可逗号分隔多选，0=全部）: ")
    if raw.strip() == "0":
        return works
    picked: List[Work] = []
    for part in raw.split(","):
        part = part.strip()
        if part.isdigit() and 1 <= int(part) <= len(works):
            picked.append(works[int(part) - 1])
    return picked or works


def choose_formats() -> List[str]:
    print("\n导出格式： 1) Word  2) JSON  3) Markdown")
    raw = _ask("选择格式（可逗号分隔，默认 1）: ") or "1"
    fmts = []
    for part in raw.split(","):
        fmt = FORMAT_CHOICES.get(part.strip())
        if fmt and fmt not in fmts:
            fmts.append(fmt)
    return fmts or ["word"]


def run() -> None:
    print("=" * 48)
    print(" 学习通题目导出器（Python 版）— 仅导出，不提交")
    print("=" * 48)
    client = ChaoxingClient()
    do_login(client)

    courses = client.get_courses()
    if not courses:
        print("未获取到任何课程。")
        return
    course = choose_course(courses)

    works = client.get_works(course)
    if not works:
        print("该课程下未获取到作业。")
        return
    selected = choose_works(works)
    formats = choose_formats()

    for work in selected:
        print(f"\n正在抓取：{work.name} ...")
        try:
            questions = client.get_questions(work)
        except Exception as e:
            print(f"  抓取失败：{e}")
            continue
        if not questions:
            print("  未解析到题目（可能页面结构变化或作业未开放）。")
            continue
        base = f"{course.name}-{work.name}"
        files = export(questions, OUTPUT_DIR, base, formats, title=base)
        print(f"  ✓ 共 {len(questions)} 题，已导出：")
        for f in files:
            print(f"     {f}")

    print(f"\n完成。输出目录：{OUTPUT_DIR.resolve()}")

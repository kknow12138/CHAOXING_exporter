"""把学习通"已完成作业"页面的 HTML 解析成结构化题目。

页面 DOM 结构（与浏览器扩展 content/parser.js 处理的是同一套）：
- 每道题是一个 div.questionLi（通常 class 含 marBom60 questionLi singleQuesId），data 属性是题目 id
- 题型在题块第一个 <span> 里，形如 "(单选题, 2.0分)"
- 题干在 h3.mark_name
- 选择题选项在第一个 <ul> 的 <li>
- 选择/判断题答案：span.colorGreen("正确答案: X")，回退到 span.colorDeep("我的答案: X")
- 填空/编程题答案：dl.mark_fill.colorGreen 下的各 <dd>
- 简答/论述题答案：题块内的 <dd> 文本
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import List

from bs4 import BeautifulSoup

CHOICE_TYPES = {"单选题", "多选题"}
FILL_TYPES = {"填空题", "编程题"}
TEXT_TYPES = {"简答题", "论述题", "其他"}


@dataclass
class Question:
    number: int
    id: str
    type: str
    title: str
    options: List[str] = field(default_factory=list)
    answer: str = ""
    my_answer: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def _clean(text: str | None) -> str:
    if not text:
        return ""
    for ch in ("\xa0", "　"):
        text = text.replace(ch, " ")
    for ch in ("\n", "\t", "\r"):
        text = text.replace(ch, "")
    return " ".join(text.split()).strip()


def _detect_type(block) -> str:
    span = block.find("span")
    raw = span.get_text() if span else ""
    raw = raw.split(",")[0].split("，")[0]
    for ch in "()（）":
        raw = raw.replace(ch, "")
    raw = raw.strip()
    known = ("单选题", "多选题", "判断题", "填空题", "简答题", "论述题", "编程题")
    for t in known:
        if t in raw:
            return t
    return raw or "其他"


def _title(block) -> str:
    h3 = block.find("h3", class_="mark_name")
    return _clean(h3.get_text()) if h3 else ""


def _options(block) -> List[str]:
    ul = block.find("ul")
    if not ul:
        return []
    out = []
    for li in ul.find_all("li"):
        text = _clean(li.get_text())
        if text:
            out.append(text)
    return out


def _choice_answer(block) -> tuple[str, str]:
    """返回 (正确答案, 我的答案)。"""
    correct, mine = "", ""
    green = block.find("span", class_="colorGreen")
    if green:
        correct = (
            _clean(green.get_text())
            .replace("正确答案:", "")
            .replace("正确答案：", "")
            .strip()
        )
    deep = block.find("span", class_="colorDeep")
    # h3 题干也可能带 colorDeep，过滤掉
    if deep and deep.name == "span":
        mine = (
            _clean(deep.get_text())
            .replace("我的答案:", "")
            .replace("我的答案：", "")
            .strip()
        )
    return correct, mine


def _fill_answer(block) -> str:
    dl = block.find("dl", class_="mark_fill")
    if not dl:
        # 回退：题块里任意 dd
        dds = block.find_all("dd")
        return " | ".join(_clean(dd.get_text()) for dd in dds if _clean(dd.get_text()))
    parts = [_clean(dd.get_text()) for dd in dl.find_all("dd")]
    parts = [p for p in parts if p]
    return " | ".join(parts)


def _text_answer(block) -> str:
    dd = block.find("dd")
    return _clean(dd.get_text()) if dd else ""


def parse_questions(html: str) -> List[Question]:
    """解析一份作业页面 HTML，返回题目列表。"""
    soup = BeautifulSoup(html, "lxml")
    blocks = soup.select("div.questionLi")
    questions: List[Question] = []
    for idx, block in enumerate(blocks, start=1):
        qtype = _detect_type(block)
        q = Question(
            number=idx,
            id=str(block.get("data", "")),
            type=qtype,
            title=_title(block),
        )
        if qtype in CHOICE_TYPES:
            q.options = _options(block)
            q.answer, q.my_answer = _choice_answer(block)
        elif qtype == "判断题":
            q.answer, q.my_answer = _choice_answer(block)
        elif qtype in FILL_TYPES:
            q.answer = _fill_answer(block)
        else:  # 简答/论述/其他
            q.answer = _text_answer(block)
        questions.append(q)
    return questions

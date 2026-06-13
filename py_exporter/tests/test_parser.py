"""parser.py 的最小验证（不依赖网络）。运行：python -m pytest 或 python tests/test_parser.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chaoxing_exporter.parser import parse_questions

HTML = open(os.path.join(os.path.dirname(__file__), "sample_work.html"), encoding="utf-8").read()


def test_parse():
    qs = parse_questions(HTML)
    assert len(qs) == 5, f"应解析出 5 道题，实际 {len(qs)}"

    single = qs[0]
    assert single.type == "单选题", single.type
    assert single.id == "163657918"
    assert single.options == ["A.1/2", "B.1", "C.2", "D.4"], single.options
    assert single.answer == "C", single.answer

    multi = qs[1]
    assert multi.type == "多选题"
    assert multi.answer == "AB", multi.answer
    assert len(multi.options) == 4

    judge = qs[2]
    assert judge.type == "判断题"
    assert judge.answer == "错误", judge.answer
    assert judge.options == []

    fill = qs[3]
    assert fill.type == "填空题"
    assert fill.answer == "先进先出 | 后进先出", fill.answer

    short = qs[4]
    assert short.type == "简答题"
    assert "深度优先" in short.answer or "递归" in short.answer, short.answer

    print("test_parse 通过：5 道题，题型/选项/答案全部正确")


if __name__ == "__main__":
    test_parse()

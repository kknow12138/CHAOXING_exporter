"""学习通 API 客户端：登录（二维码/账号密码）+ 抓取课程、作业、题目。

仅做"读取/导出"，不包含任何作业提交逻辑。接口与加密方式参考自社区项目，
若学习通改版导致接口失效，需要据实更新下方常量。
"""
from __future__ import annotations

import base64
import time
from dataclasses import dataclass
from typing import List, Optional
from urllib.parse import parse_qs, urlparse

import requests
from bs4 import BeautifulSoup
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

from .parser import Question, parse_questions

# 账号密码登录使用的 AES 密钥（key 同时用作 IV，CBC 模式）
_AES_KEY = b"u2oh6Vu^HWe4_AES"

LOGIN_URL = "https://passport2.chaoxing.com/fanyalogin"
HOME_LOGIN = "https://passport2.chaoxing.com/login"
GET_LOGIN_QR = "https://passport2.chaoxing.com/createqr"
IS_QR_LOGIN = "https://passport2.chaoxing.com/getauthstatus"
COURSE_LIST = "https://mooc2-ans.chaoxing.com/mooc2-ans/visit/courses/list"
WORK_LIST = "https://mooc1.chaoxing.com/mooc2/work/list"

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63"
)


@dataclass
class Course:
    name: str
    url: str
    teacher: str = ""
    clazz: str = ""


@dataclass
class Work:
    name: str
    url: str
    status: str = ""
    course_name: str = ""


def _aes_encrypt(text: str) -> str:
    cipher = AES.new(_AES_KEY, AES.MODE_CBC, _AES_KEY)
    encrypted = cipher.encrypt(pad(text.encode(), 16))
    return base64.b64encode(encrypted).decode()


class ChaoxingClient:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": _UA})
        self._qr_uuid: Optional[str] = None
        self._qr_enc: Optional[str] = None

    # ---------- 登录 ----------
    def login_password(self, phone: str, password: str) -> bool:
        """账号密码登录，成功返回 True。"""
        resp = self.session.post(
            LOGIN_URL,
            data={
                "uname": _aes_encrypt(phone),
                "password": _aes_encrypt(password),
                "t": "true",
                "doubleFactorLogin": "0",
                "independentId": "0",
            },
            headers={"Origin": "https://passport2.chaoxing.com"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("status"):
            raise RuntimeError(f"登录失败：{data.get('msg2') or data.get('msg') or data}")
        return True

    def qr_prepare(self) -> str:
        """准备二维码登录，返回二维码内容 URL（用它生成二维码给用户扫）。"""
        self.session.cookies.clear()
        resp = self.session.get(HOME_LOGIN, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        self._qr_uuid = soup.find("input", id="uuid")["value"]
        self._qr_enc = soup.find("input", id="enc")["value"]
        # 激活二维码
        self.session.get(GET_LOGIN_QR, params={"uuid": self._qr_uuid, "fid": -1}, timeout=20)
        return (
            f"https://passport2.chaoxing.com/toauthlogin?uuid={self._qr_uuid}"
            f"&enc={self._qr_enc}&xxtrefer=&clientid=&type=0&mobiletip="
        )

    def qr_poll(self) -> dict:
        """轮询一次二维码扫码状态。返回 dict，含 status 字段。"""
        if not self._qr_uuid:
            raise RuntimeError("请先调用 qr_prepare()")
        resp = self.session.post(
            IS_QR_LOGIN, data={"enc": self._qr_enc, "uuid": self._qr_uuid}, timeout=20
        )
        resp.raise_for_status()
        return resp.json()

    def login_qr(self, timeout: int = 120, interval: float = 2.0) -> bool:
        """阻塞等待二维码扫码登录完成。需先调用 qr_prepare()。"""
        deadline = time.time() + timeout
        while time.time() < deadline:
            data = self.qr_poll()
            if data.get("status"):
                return True
            time.sleep(interval)
        raise TimeoutError("二维码登录超时")

    # ---------- 课程 / 作业 / 题目 ----------
    def get_courses(self) -> List[Course]:
        resp = self.session.get(
            COURSE_LIST,
            params={"v": time.time(), "start": 0, "size": 500, "catalogId": 0, "superstarClass": 0},
            timeout=20,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        courses: List[Course] = []
        for div in soup.find_all("div", class_="course-info"):
            try:
                name = div.span.get_text(strip=True)
                url = div.a["href"]
                teacher_p = div.find("p", class_="line2 color3")
                teacher = teacher_p.get("title", "") if teacher_p else ""
                clazz_p = div.find("p", class_="overHidden1")
                clazz = clazz_p.get_text(strip=True) if clazz_p else ""
                courses.append(Course(name=name, url=url, teacher=teacher, clazz=clazz))
            except Exception:
                continue
        return courses

    def get_works(self, course: Course) -> List[Work]:
        view = self.session.get(
            course.url,
            params={"v": time.time(), "start": 0, "size": 500, "catalogId": 0, "superstarClass": 0},
            timeout=20,
        )
        view.raise_for_status()
        qs = parse_qs(urlparse(view.url).query)
        soup = BeautifulSoup(view.text, "lxml")
        enc_input = soup.find("input", id="workEnc")
        if enc_input is None:
            return []
        params = {
            "courseId": qs.get("courseid", [""])[0],
            "classId": qs.get("clazzid", [""])[0],
            "cpi": qs.get("cpi", [""])[0],
            "ut": "s",
            "enc": enc_input["value"],
        }
        resp = self.session.get(
            WORK_LIST,
            params=params,
            headers={"Referer": "https://mooc2-ans.chaoxing.com/"},
            timeout=20,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        works: List[Work] = []
        for li in soup.find_all("li"):
            data_url = li.get("data")
            if not data_url:
                continue
            name_p = li.find("p")
            name = name_p.get_text(strip=True) if name_p else "未命名作业"
            status_p = name_p.find_next("p") if name_p else None
            status = status_p.get_text(strip=True) if status_p else ""
            works.append(Work(name=name, url=data_url, status=status, course_name=course.name))
        return works

    def get_questions(self, work: Work) -> List[Question]:
        """抓取一份作业页面并解析题目（含答案，若已完成）。"""
        resp = self.session.get(work.url, timeout=20)
        resp.raise_for_status()
        return parse_questions(resp.text)

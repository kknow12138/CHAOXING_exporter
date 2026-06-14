#!/usr/bin/env python3
"""Generate a Yuketang encrypted font decode map.

Dependencies:
  python3 -m pip install fonttools pillow ddddocr

Usage:
  python3 scripts/generate_yuketang_font_map.py \
    --font-url https://fe-static-yuketang.yuketang.cn/fe_font/product/exam_font_239fdcc493de4ef5a4d14835f3a0243c.ttf \
    --output lib/yuketang-font-map.json
"""

from __future__ import annotations

import argparse
import json
import tempfile
import urllib.request
from io import BytesIO
from pathlib import Path


DEFAULT_FONT_URL = (
    "https://fe-static-yuketang.yuketang.cn/fe_font/product/"
    "exam_font_239fdcc493de4ef5a4d14835f3a0243c.ttf"
)


def download_font(url: str, target: Path) -> None:
    with urllib.request.urlopen(url, timeout=30) as response:
        target.write_bytes(response.read())


def render_char(font, char: str) -> bytes:
    from PIL import Image, ImageDraw

    image = Image.new("RGB", (80, 80), "white")
    draw = ImageDraw.Draw(image)
    bbox = draw.textbbox((0, 0), char, font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x = max(0, (80 - width) // 2 - bbox[0])
    y = max(0, (80 - height) // 2 - bbox[1])
    draw.text((x, y), char, font=font, fill="black")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def normalize_ocr_result(text: str) -> str:
    text = (text or "").strip()
    return text[:1]


def build_map(font_path: Path) -> dict[str, str]:
    from fontTools.ttLib import TTFont
    from PIL import ImageFont
    import ddddocr

    ttfont = TTFont(str(font_path))
    cmap = ttfont.getBestCmap() or {}
    pil_font = ImageFont.truetype(str(font_path), 56)
    ocr = ddddocr.DdddOcr(det=False, ocr=True, show_ad=False)

    decode_map: dict[str, str] = {}
    for code in sorted(cmap):
      encrypted_char = chr(code)
      png = render_char(pil_font, encrypted_char)
      real_char = normalize_ocr_result(ocr.classification(png))
      if real_char:
          decode_map[encrypted_char] = real_char

    return decode_map


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--font", help="Path to an existing .ttf font file")
    parser.add_argument("--font-url", default=DEFAULT_FONT_URL)
    parser.add_argument("--output", default="lib/yuketang-font-map.json")
    args = parser.parse_args()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        font_path = Path(args.font) if args.font else Path(tmpdir) / "yuketang_exam_font.ttf"
        if not args.font:
            download_font(args.font_url, font_path)

        decode_map = build_map(font_path)

    payload = {
        "name": "yuketang-exam-font",
        "source": args.font or args.font_url,
        "count": len(decode_map),
        "map": decode_map,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(decode_map)} mappings to {output}")


if __name__ == "__main__":
    main()

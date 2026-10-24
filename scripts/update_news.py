#!/usr/bin/env python3
"""F1 Uzbekistan: RSS faktlari asosida original o'zbekcha yangiliklar."""
import html
import json
import os
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlsplit, urlunsplit, parse_qsl, urlencode
from urllib.request import Request, urlopen

from openai import OpenAI
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "news.json"
MAX_NEWS = 10
MAX_NEW_AI = int(os.getenv("MAX_NEW_AI", "5"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
FEEDS = [
    ("Autosport", "https://www.autosport.com/rss/f1/news/"),
    ("Motorsport.com", "https://www.motorsport.com/rss/f1/news/"),
    ("BBC Sport", "https://feeds.bbci.co.uk/sport/formula1/rss.xml"),
]
MEDIA = "{http://search.yahoo.com/mrss/}"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}"


class Article(BaseModel):
    title: str
    paragraphs: list[str]
    sufficient_facts: bool


class Extractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignore = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.ignore += 1
        elif not self.ignore and tag in ("p", "div", "br", "li"):
            self.parts.append("\n\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.ignore = max(0, self.ignore - 1)
        elif not self.ignore and tag in ("p", "div", "li"):
            self.parts.append("\n\n")

    def handle_data(self, data):
        if not self.ignore:
            self.parts.append(data)


def clean(value):
    parser = Extractor()
    parser.feed(html.unescape(value or ""))
    text = html.unescape("".join(parser.parts))
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    text = re.sub(
        r"(?i)\s*(?:\.{3}|…)?\s*(?:read more|continue reading|"
        r"o['‘’`]?qish(?:da|ni) davom et(?:ing|tiring)|"
        r"kirish so['‘’`]?zidan keyin)\s*[.→↗»…]*\s*$",
        "", text,
    )
    return text.strip(" .…\n")


def fetch(url, limit=2_000_000):
    req = Request(url, headers={
        "User-Agent": "F1UzbekistanNews/1.0 (RSS reader)",
        "Accept": "application/rss+xml,application/xml,text/xml,text/html",
    })
    with urlopen(req, timeout=20) as response:
        return response.read(limit)


def https_url(value):
    value = html.unescape(value or "").strip()
    if value.startswith("//"):
        value = "https:" + value
    parsed = urlparse(value)
    return value if parsed.scheme == "https" and parsed.hostname else ""


def canonical(url):
    parts = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query)
                       if not k.lower().startswith("utm_")])
    return urlunsplit((parts.scheme, parts.netloc.lower(), parts.path.rstrip("/"), query, ""))


def image_from_rss(entry, article_url):
    for tag in (MEDIA + "content", MEDIA + "thumbnail", "enclosure"):
        for el in entry.findall(tag):
            kind = el.get("type", "")
            if kind and not kind.startswith("image/"):
                continue
            image = https_url(urljoin(article_url, el.get("url", "")))
            if image:
                return image
    for tag in ("description", CONTENT + "encoded"):
        raw = html.unescape(entry.findtext(tag) or "")
        match = re.search(r'<img[^>]+src=["\']([^"\']+)', raw, re.I)
        if match:
            image = https_url(urljoin(article_url, match.group(1)))
            if image:
                return image
    return ""


def read_old():
    try:
        items = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return items if isinstance(items, list) else []
    except (OSError, ValueError):
        return []


def candidates():
    found = []
    for source, feed in FEEDS:
        try:
            root = ET.fromstring(fetch(feed))
            entries = root.findall("./channel/item")
            print(f"{source}: {len(entries)} ta RSS xabar")
            for entry in entries[:20]:
                title = clean(entry.findtext("title") or "")
                url = https_url(entry.findtext("link") or "")
                if not title or not url:
                    continue
                description = clean(entry.findtext("description") or "")
                if description.casefold() == title.casefold():
                    description = ""
                # content:encoded faqat ruxsatli to'liq matn uchun ishlatiladi.
                # Standart holda RSS tavsifidagi faktlardan foydalanamiz.
                try:
                    date = parsedate_to_datetime(entry.findtext("pubDate") or "")
                    if date.tzinfo is None:
                        date = date.replace(tzinfo=timezone.utc)
                    date = date.astimezone(timezone.utc)
                except (TypeError, ValueError, OverflowError):
                    date = datetime.now(timezone.utc)
                found.append({
                    "original_title": title, "url": url,
                    "source": source, "date": date.isoformat(),
                    "timestamp": date.timestamp(),
                    "description": description,
                    "image": image_from_rss(entry, url),
                })
        except Exception as exc:
            print(f"{source} RSS xatosi: {exc}", file=sys.stderr)
    found.sort(key=lambda x: x["timestamp"], reverse=True)
    return found


def write_article(client, item):
    payload = {
        "source": item["source"],
        "date": item["date"],
        "headline": item["original_title"],
        "rss_description": item["description"],
    }
    response = client.responses.parse(
        model=MODEL,
        instructions=(
            "Siz F1 Uzbekistan uchun o'zbek tilidagi yangiliklar muharririsiz. "
            "Faqat berilgan sarlavha va RSS tavsifida tasdiqlangan faktlardan "
            "foydalaning. Qo'shimcha natija, iqtibos, sana, sabab, reyting yoki "
            "raqamni o'ylab topmang. Manba matnini so'zma-so'z tarjima qilmang: "
            "original, mustaqil bayon yozing. Faktlar yetarli bo'lsa 5-8 "
            "qisqa xatboshi yozing; yetarli bo'lmasa 2-3 qisqa xatboshi "
            "va sufficient_facts=false qaytaring. Faqat bir xil fikrni "
            "takrorlash uchun matnni uzaytirmang. F1 atamalarini to'g'ri "
            "tarjima qiling: GP=Gran-pri, practice=amaliyot sessiyasi, "
            "qualifying=saralash, Circuit of the Americas=COTA trassasi. "
            "O'qishni davom ettiring, Read more kabi iboralarni yozmang. "
            "Boshqa sayt maqolasini qayta nashr qilmang. "
            "Matn faktlar bilan cheklanganini ochiq saqlang."
        ),
        input=json.dumps(payload, ensure_ascii=False),
        text_format=Article,
    )
    result = response.output_parsed
    if result is None:
        raise RuntimeError("AI maqola qaytarmadi")
    title = clean(result.title)
    paragraphs = [clean(p) for p in result.paragraphs if isinstance(p, str)]
    paragraphs = [p for p in paragraphs if len(p) >= 35]
    if not title or not paragraphs:
        raise RuntimeError("AI matni bo'sh")
    return title, paragraphs, bool(result.sufficient_facts)


def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY GitHub Secrets ichida mavjud emas")
    client = OpenAI(timeout=50.0, max_retries=2)
    old = read_old()
    cache = {canonical(x["url"]): x for x in old
             if isinstance(x, dict) and https_url(x.get("url", ""))
             and x.get("lang") == "uz"}
    result = []
    seen = set()
    created = 0
    for item in candidates():
        if len(result) >= MAX_NEWS:
            break
        key = canonical(item["url"])
        if key in seen:
            continue
        seen.add(key)
        prior = cache.get(key, {})
        # Oldingi AI maqolalarni qayta yozmaslik: vaqt va pulni tejaydi.
        if prior.get("generated_by") == "openai" and isinstance(prior.get("content"), list) and prior["content"]:
            article = dict(prior)
            article.update(date=item["date"], image=item["image"] or prior.get("image", ""))
            result.append(article)
            continue
        if created >= MAX_NEW_AI:
            continue
        if not item["description"] or len(item["description"]) < 90:
            print("Fakt yetarli emas, o'tkazildi:", item["original_title"])
            continue
        try:
            title, paragraphs, sufficient = write_article(client, item)
        except Exception as exc:
            print("AI xatosi:", item["original_title"], exc, file=sys.stderr)
            continue
        result.append({
            "title": title, "url": item["url"], "source": item["source"],
            "date": item["date"], "lang": "uz", "image": item["image"] or prior.get("image", ""),
            "content": paragraphs, "summary": "\n\n".join(paragraphs[:2]),
            "content_type": "original_article" if sufficient else "brief",
            "generated_by": "openai",
        })
        created += 1
        print("Yozildi:", title)
    # AI xatolari sababli mavjud kontent yo'qolib ketmasin.
    if not result:
        raise SystemExit("Hech qanday maqola olinmadi; oldingi news.json saqlandi")
    # Agar AI limiti tugasa, avvalgi original maqolalar bilan to'ldirish.
    for prior in old:
        if len(result) >= MAX_NEWS:
            break
        if not isinstance(prior, dict) or not https_url(prior.get("url", "")):
            continue
        key = canonical(prior["url"])
        if key not in {canonical(x["url"]) for x in result} and prior.get("generated_by") == "openai":
            result.append(prior)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=OUTPUT.parent, delete=False) as temp:
        json.dump(result, temp, ensure_ascii=False, indent=2)
        temp.write("\n")
        temp_path = Path(temp.name)
    temp_path.replace(OUTPUT)
    print(f"Jami {len(result)} maqola; yangi AI maqolalar: {created}")


if __name__ == "__main__":
    main()

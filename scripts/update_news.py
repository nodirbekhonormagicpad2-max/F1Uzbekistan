
#!/usr/bin/env python3
"""F1 yangiliklarini MyMemory orqali o'zbekchaga tarjima qilish."""

import html
import json
import time
import xml.etree.ElementTree as ET
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUTPUT = Path("news.json")
MAX_NEWS = 10

RSS_URL = (
    "https://news.google.com/rss/search?"
    + urlencode({
        "q": "Formula 1 F1 racing when:7d",
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en"
    })
)


def get_json(url):
    request = Request(
        url,
        headers={"User-Agent": "F1UzbekistanNews/1.0"}
    )
    with urlopen(request, timeout=25) as response:
        return json.load(response)


def translate(text):
    params = urlencode({
        "q": text,
        "langpair": "en|uz"
    })

    url = "https://api.mymemory.translated.net/get?" + params
    data = get_json(url)

    if data.get("responseStatus") != 200:
        raise RuntimeError(
            str(data.get("responseDetails", "Tarjima xatosi"))
        )

    if data.get("quotaFinished"):
        raise RuntimeError("Tarjima limiti tugagan")

    result = html.unescape(
        str(data.get("responseData", {}).get("translatedText", ""))
    ).strip()

    if not result or result.casefold() == text.casefold():
        return None

    return result


try:
    old = json.loads(OUTPUT.read_text(encoding="utf-8"))
    if not isinstance(old, list):
        old = []
except (OSError, ValueError):
    old = []

cache = {
    item["url"]: item
    for item in old
    if isinstance(item, dict)
    and item.get("url")
    and item.get("title")
    and item.get("lang") == "uz"
}

request = Request(
    RSS_URL,
    headers={"User-Agent": "Mozilla/5.0"}
)

with urlopen(request, timeout=30) as response:
    root = ET.fromstring(response.read())

items = []
seen = set()

for entry in root.findall("./channel/item"):
    if len(items) >= MAX_NEWS:
        break

    original = (entry.findtext("title") or "").strip()
    link = (entry.findtext("link") or "").strip()
    source = (entry.findtext("source") or "Google News").strip()

    if not original or not link.startswith("https://"):
        continue

    if link in seen:
        continue

    seen.add(link)

    try:
        date = parsedate_to_datetime(
            entry.findtext("pubDate") or ""
        ).astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError):
        date = ""

    if link in cache:
        translated = cache[link]["title"]
    else:
        try:
            translated = translate(original)
            time.sleep(1)
        except Exception as error:
            print("Tarjima xatosi:", error)
            continue

    if not translated:
        continue

    items.append({
        "title": translated,
        "url": link,
        "source": source,
        "date": date,
        "lang": "uz"
    })

if items:
    OUTPUT.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"Muvaffaqiyatli: {len(items)} ta o'zbekcha yangilik saqlandi.")
else:
    print("Tarjima topilmadi. Avvalgi news.json saqlanadi.")
    raise SystemExit(1)

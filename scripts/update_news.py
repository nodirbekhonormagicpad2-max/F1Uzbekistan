
#!/usr/bin/env python3
"""F1 yangiliklarini olish va o'zbekchaga tarjima qilish."""

import json
import time
import xml.etree.ElementTree as ET
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from deep_translator import GoogleTranslator

OUTPUT = Path("news.json")
QUERY = "Formula 1 F1 racing when:7d"

URL = (
    "https://news.google.com/rss/search?q="
    + quote(QUERY)
    + "&hl=en-US&gl=US&ceid=US:en"
)

MAX_NEWS = 10
MAX_TRANSLATIONS = 10

# Eski o'zbekcha tarjimalarni saqlash
try:
    old_news = json.loads(
        OUTPUT.read_text(encoding="utf-8")
    )
    if not isinstance(old_news, list):
        old_news = []
except (FileNotFoundError, ValueError, OSError):
    old_news = []

cache = {
    item["url"]: item
    for item in old_news
    if isinstance(item, dict)
    and item.get("url")
    and item.get("title")
    and item.get("lang") == "uz"
}

# Google News RSS
request = Request(
    URL,
    headers={"User-Agent": "Mozilla/5.0"}
)

with urlopen(request, timeout=20) as response:
    root = ET.fromstring(response.read())

translator = GoogleTranslator(
    source="en",
    target="uz"
)

items = []
seen = set()
translation_count = 0

for entry in root.findall("./channel/item"):

    if len(items) >= MAX_NEWS:
        break

    original = (
        entry.findtext("title") or ""
    ).strip()

    link = (
        entry.findtext("link") or ""
    ).strip()

    source = (
        entry.findtext("source") or "Google News"
    ).strip()

    if (
        not original
        or not link.startswith("https://")
        or link in seen
    ):
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
        if translation_count >= MAX_TRANSLATIONS:
            break

        translation_count += 1
        translated = None

        try:
            print(
                f"Tarjima qilinmoqda: "
                f"{translation_count}/{MAX_TRANSLATIONS}",
                flush=True
            )

            candidate = translator.translate(original)

            if (
                candidate
                and candidate.strip().casefold()
                != original.casefold()
            ):
                translated = candidate.strip()

            time.sleep(2)

        except Exception as error:
            print(
                f"Tarjima xatosi: {error}",
                flush=True
            )
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

# Yangi ma'lumot bo'lmasa eskisini saqlash
if not items:
    print(
        "Yangi o'zbekcha yangilik topilmadi. "
        "Eski news.json saqlanadi."
    )
    raise SystemExit(0)

OUTPUT.write_text(
    json.dumps(
        items,
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)

print(
    f"{len(items)} ta o'zbekcha yangilik saqlandi.",
    flush=True
)

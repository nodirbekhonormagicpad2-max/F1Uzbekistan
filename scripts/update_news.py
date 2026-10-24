
#!/usr/bin/env python3
"""F1 yangiliklari: o'zbekcha tarjima va avtomatik rasmlar."""

import html
import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlencode, urlparse
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


def request_url(url, timeout=15):
    req = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    return urlopen(req, timeout=timeout)


def translate(text):
    params = urlencode({
        "q": text,
        "langpair": "en|uz"
    })

    url = "https://api.mymemory.translated.net/get?" + params

    with request_url(url, 20) as response:
        data = json.load(response)

    if data.get("responseStatus") != 200:
        raise RuntimeError("Tarjima xizmati javob bermadi")

    if data.get("quotaFinished"):
        raise RuntimeError("Tarjima limiti tugadi")

    translated = html.unescape(
        str(data.get("responseData", {}).get("translatedText", ""))
    ).strip()

    if not translated or translated.casefold() == text.casefold():
        return None

    return translated


def safe_image(url):
    url = html.unescape(url or "").strip()
    parsed = urlparse(url)

    if parsed.scheme != "https" or not parsed.hostname:
        return ""

    return url


def rss_image(entry):
    """RSS ichidagi rasmni qidirish."""

    for tag in (
        "{http://search.yahoo.com/mrss/}content",
        "{http://search.yahoo.com/mrss/}thumbnail",
        "enclosure"
    ):
        for element in entry.findall(tag):
            url = safe_image(element.get("url", ""))
            media_type = element.get("type", "")

            if url and (
                not media_type
                or media_type.startswith("image/")
            ):
                return url

    description = html.unescape(
        entry.findtext("description") or ""
    )

    match = re.search(
        r'<img[^>]+src=["\']([^"\']+)',
        description,
        flags=re.IGNORECASE
    )

    if match:
        return safe_image(match.group(1))

    return ""


def article_image(url):
    """Maqola sahifasidan og:image ni qidirish."""

    try:
        with request_url(url, 10) as response:
            content_type = response.headers.get(
                "Content-Type", ""
            )

            if "text/html" not in content_type:
                return ""

            page = response.read(300000).decode(
                "utf-8", errors="ignore"
            )

        patterns = [
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)'
        ]

        for pattern in patterns:
            match = re.search(
                pattern, page, flags=re.IGNORECASE
            )

            if match:
                return safe_image(match.group(1))

    except Exception as error:
        print("Rasmni olish imkoni bo'lmadi:", error)

    return ""


try:
    old = json.loads(
        OUTPUT.read_text(encoding="utf-8")
    )

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

with request_url(RSS_URL, 25) as response:
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

    previous = cache.get(link, {})

    if previous:
        translated = previous["title"]
    else:
        try:
            translated = translate(original)
            time.sleep(1)
        except Exception as error:
            print("Tarjima xatosi:", error)
            continue

    if not translated:
        continue

    image = (
        previous.get("image", "")
        or rss_image(entry)
        or article_image(link)
    )

    items.append({
        "title": translated,
        "url": link,
        "source": source,
        "date": date,
        "lang": "uz",
        "image": image
    })

if not items:
    print("Yangi yangilik topilmadi. Eski fayl saqlanadi.")
    raise SystemExit(1)

OUTPUT.write_text(
    json.dumps(
        items,
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)

image_count = sum(bool(item["image"]) for item in items)

print(f"{len(items)} ta o'zbekcha yangilik saqlandi.")
print(f"{image_count} ta rasm manzili topildi.")

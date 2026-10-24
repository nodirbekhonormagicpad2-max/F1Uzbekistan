
#!/usr/bin/env python3
"""F1 yangiliklari: rasm, o'zbekcha sarlavha va qisqacha mazmun."""

import html
import json
import re
import time
import xml.etree.ElementTree as ET

from datetime import timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlencode
from urllib.request import Request, urlopen

OUTPUT = Path("news.json")
MAX_NEWS = 10

FEEDS = [
    (
        "Autosport",
        "https://www.autosport.com/rss/f1/news/"
    ),
    (
        "Motorsport.com",
        "https://www.motorsport.com/rss/f1/news/"
    ),
    (
        "BBC Sport",
        "https://feeds.bbci.co.uk/sport/formula1/rss.xml"
    ),
]

MEDIA = "{http://search.yahoo.com/mrss/}"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}"


def fetch(url, timeout=15):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html,application/rss+xml,application/xml"
        }
    )
    return urlopen(request, timeout=timeout)


def safe_url(url):
    url = html.unescape(url or "").strip()

    if url.startswith("//"):
        url = "https:" + url

    parsed = urlparse(url)

    if parsed.scheme != "https" or not parsed.hostname:
        return ""

    return url


class TextParser(HTMLParser):
    """HTML teglardan oddiy matnni ajratib olish."""

    def __init__(self):
        super().__init__()
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ("script", "style"):
            self.ignored += 1

    def handle_endtag(self, tag):
        if tag.lower() in ("script", "style"):
            self.ignored = max(0, self.ignored - 1)

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def clean_text(value):
    value = html.unescape(value or "")

    parser = TextParser()
    parser.feed(value)

    text = " ".join(parser.parts)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def translate(text):
    """Inglizchadan o'zbekchaga tarjima."""

    text = (text or "").strip()

    if not text:
        return ""

    # MyMemory API so'rov hajmini cheklash.
    text = text[:450]

    url = (
        "https://api.mymemory.translated.net/get?"
        + urlencode({
            "q": text,
            "langpair": "en|uz"
        })
    )

    with fetch(url, 20) as response:
        data = json.load(response)

    if data.get("responseStatus") != 200:
        raise RuntimeError("Tarjima xizmati xatosi")

    if data.get("quotaFinished"):
        raise RuntimeError("Tarjima limiti tugagan")

    result = html.unescape(
        str(
            data.get("responseData", {}).get(
                "translatedText", ""
            )
        )
    ).strip()

    if not result or result.casefold() == text.casefold():
        return ""

    return result


class MetaImageParser(HTMLParser):
    """Maqola sahifasidan rasm manzilini olish."""

    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "meta":
            return

        data = dict(attrs)

        name = (
            data.get("property")
            or data.get("name")
            or ""
        ).lower()

        if name in (
            "og:image",
            "og:image:secure_url",
            "twitter:image",
            "twitter:image:src"
        ):
            value = data.get("content", "")

            if value:
                self.images.append(value)


def article_image(url):
    """Asl maqolaning og:image rasmini topish."""

    try:
        with fetch(url, 12) as response:
            content_type = response.headers.get(
                "Content-Type", ""
            )

            if "text/html" not in content_type:
                return ""

            final_url = response.geturl()

            page = response.read(600000).decode(
                "utf-8",
                errors="ignore"
            )

        parser = MetaImageParser()
        parser.feed(page)

        for candidate in parser.images:
            image = safe_url(
                urljoin(final_url, candidate)
            )

            if image:
                return image

    except Exception as error:
        print("Maqola rasmi xatosi:", error)

    return ""


def rss_image(entry, article_url):
    """RSS'dan aynan shu maqolaga tegishli rasmni olish."""

    for tag in (
        MEDIA + "content",
        MEDIA + "thumbnail",
        "enclosure"
    ):
        for element in entry.findall(tag):
            media_type = element.get("type", "")

            if media_type and not media_type.startswith("image/"):
                continue

            image = safe_url(
                urljoin(
                    article_url,
                    element.get("url", "")
                )
            )

            if image:
                return image

    for field in (
        "description",
        CONTENT + "encoded"
    ):
        description = html.unescape(
            entry.findtext(field) or ""
        )

        match = re.search(
            r'<img[^>]+src=["\']([^"\']+)',
            description,
            flags=re.IGNORECASE
        )

        if match:
            image = safe_url(
                urljoin(article_url, match.group(1))
            )

            if image:
                return image

    return ""


def rss_summary(entry):
    """RSS tavsifidan qisqacha mazmun olish."""

    description = entry.findtext("description") or ""
    summary = clean_text(description)

    original_title = clean_text(
        entry.findtext("title") or ""
    )

    if not summary:
        return ""

    if summary.casefold() == original_title.casefold():
        return ""

    # Takrorlangan yoki juda uzun matnni cheklash.
    summary = summary[:450].strip()

    return summary


# Oldingi yangiliklarni o'qish.
try:
    previous_news = json.loads(
        OUTPUT.read_text(encoding="utf-8")
    )

    if not isinstance(previous_news, list):
        previous_news = []

except (OSError, ValueError):
    previous_news = []


# Oldingi o'zbekcha sarlavha, mazmun va rasmlarni saqlash.
cache = {
    item["url"]: item
    for item in previous_news
    if isinstance(item, dict)
    and item.get("url")
    and item.get("title")
    and item.get("lang") == "uz"
}


candidates = []

# RSS manbalardan yangiliklarni olish.
for source, feed_url in FEEDS:
    try:
        with fetch(feed_url, 20) as response:
            root = ET.fromstring(response.read())

        entries = root.findall("./channel/item")

        print(
            f"{source}: {len(entries)} ta maqola topildi."
        )

        for entry in entries[:20]:
            title = clean_text(
                entry.findtext("title") or ""
            )

            link = safe_url(
                (entry.findtext("link") or "").strip()
            )

            if not title or not link:
                continue

            try:
                published = parsedate_to_datetime(
                    entry.findtext("pubDate") or ""
                ).astimezone(timezone.utc)

                date = published.isoformat()
                timestamp = published.timestamp()

            except (ValueError, TypeError, OverflowError):
                date = ""
                timestamp = 0

            candidates.append({
                "original_title": title,
                "url": link,
                "source": source,
                "date": date,
                "timestamp": timestamp,
                "entry": entry
            })

    except Exception as error:
        print(f"{source} RSS xatosi: {error}")


# Eng yangi maqolalarni birinchi chiqarish.
candidates.sort(
    key=lambda item: item["timestamp"],
    reverse=True
)


items = []
seen = set()

for candidate in candidates:
    if len(items) >= MAX_NEWS:
        break

    link = candidate["url"]

    if link in seen:
        continue

    seen.add(link)

    previous = cache.get(link, {})

    # 1. O'zbekcha sarlavha
    translated_title = previous.get("title", "")

    if not translated_title:
        try:
            translated_title = translate(
                candidate["original_title"]
            )

            time.sleep(1)

        except Exception as error:
            print("Sarlavha tarjimasi xatosi:", error)
            continue

    if not translated_title:
        continue

    # 2. O'zbekcha qisqacha mazmun
    summary = previous.get("summary", "")

    if not summary:
        original_summary = rss_summary(
            candidate["entry"]
        )

        if original_summary:
            try:
                summary = translate(original_summary)

                time.sleep(1)

            except Exception as error:
                print("Mazmun tarjimasi xatosi:", error)
                summary = ""

    # 3. Asl maqola rasmi
    image = safe_url(
        previous.get("image", "")
    )

    if not image:
        image = rss_image(
            candidate["entry"],
            link
        )

    if not image:
        image = article_image(link)

    # 4. Yangilikni news.json ga qo'shish
    items.append({
        "title": translated_title,
        "url": link,
        "source": candidate["source"],
        "date": candidate["date"],
        "lang": "uz",
        "image": image,
        "summary": summary
    })

    print(
        candidate["source"],
        "| Rasm:", bool(image),
        "| Mazmun:", bool(summary)
    )


if not items:
    print(
        "Yangilik topilmadi. "
        "Avvalgi news.json saqlanadi."
    )
    raise SystemExit(1)


# Yangilangan yangiliklarni saqlash.
OUTPUT.write_text(
    json.dumps(
        items,
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)


image_count = sum(
    bool(item["image"])
    for item in items
)

summary_count = sum(
    bool(item["summary"])
    for item in items
)

print(f"{len(items)} ta o'zbekcha yangilik saqlandi.")
print(f"{image_count} ta maqola rasmi topildi.")
print(f"{summary_count} ta o'zbekcha mazmun saqlandi.")

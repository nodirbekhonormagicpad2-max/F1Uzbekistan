
#!/usr/bin/env python3
"""F1 yangiliklari: asl maqola rasmi va o'zbekcha sarlavha."""

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


def translate(text):
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
        return None

    return result


class MetaImageParser(HTMLParser):
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
    """RSS'da aynan shu maqolaga biriktirilgan rasm."""

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


try:
    previous_news = json.loads(
        OUTPUT.read_text(encoding="utf-8")
    )

    if not isinstance(previous_news, list):
        previous_news = []

except (OSError, ValueError):
    previous_news = []


cache = {
    item["url"]: item
    for item in previous_news
    if isinstance(item, dict)
    and item.get("url")
    and item.get("title")
    and item.get("lang") == "uz"
}


candidates = []

for source, feed_url in FEEDS:
    try:
        with fetch(feed_url, 20) as response:
            root = ET.fromstring(response.read())

        entries = root.findall("./channel/item")

        print(
            f"{source}: {len(entries)} ta maqola topildi."
        )

        for entry in entries[:20]:
            title = html.unescape(
                (entry.findtext("title") or "").strip()
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

    if previous:
        translated = previous["title"]

    else:
        try:
            translated = translate(
                candidate["original_title"]
            )
            time.sleep(1)

        except Exception as error:
            print("Tarjima xatosi:", error)
            continue

    if not translated:
        continue

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

    items.append({
        "title": translated,
        "url": link,
        "source": candidate["source"],
        "date": candidate["date"],
        "lang": "uz",
        "image": image
    })

    if image:
        print("Haqiqiy rasm topildi:", candidate["source"])
    else:
        print("Rasm topilmadi:", candidate["source"])


if not items:
    print(
        "Yangilik topilmadi. "
        "Avvalgi news.json saqlanadi."
    )
    raise SystemExit(1)


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

print(f"{len(items)} ta o'zbekcha yangilik saqlandi.")
print(f"{image_count} ta maqola rasmi topildi.")

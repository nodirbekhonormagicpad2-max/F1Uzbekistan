
#!/usr/bin/env python3
"""F1 yangiliklari: o'zbekcha tarjima va haqiqiy maqola rasmlari."""

import html
import json
import re
import time
import xml.etree.ElementTree as ET

from datetime import timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urlparse, urljoin
from urllib.request import Request, urlopen

from googlenewsdecoder import gnewsdecoder


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
        headers={
            "User-Agent": (
                "Mozilla/5.0 "
                "(Linux; Android 13) "
                "AppleWebKit/537.36 "
                "Chrome/120.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml",
        }
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
        str(
            data.get("responseData", {}).get(
                "translatedText", ""
            )
        )
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
    """RSS ichidagi haqiqiy maqola rasmini qidirish."""

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


def original_article_url(google_url):
    """Google News havolasini asl maqola havolasiga aylantirish."""

    if "news.google.com" not in urlparse(google_url).netloc:
        return google_url

    try:
        result = gnewsdecoder(
            google_url,
            interval=1
        )

        if (
            isinstance(result, dict)
            and result.get("status")
            and result.get("decoded_url")
        ):
            decoded = result["decoded_url"]

            if (
                decoded.startswith("https://")
                and "news.google.com" not in urlparse(decoded).netloc
            ):
                return decoded

    except Exception as error:
        print("Google News havolasini ochish xatosi:", error)

    return ""


class ImageMetaParser(HTMLParser):
    """Maqola HTML sahifasidagi og:image tegini topish."""

    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "meta":
            return

        attributes = dict(attrs)

        name = (
            attributes.get("property")
            or attributes.get("name")
            or ""
        ).lower()

        if name in (
            "og:image",
            "og:image:secure_url",
            "twitter:image",
            "twitter:image:src"
        ):
            image_url = attributes.get("content", "")

            if image_url:
                self.images.append(image_url)


def article_image(url):
    """Asl maqola sahifasidan haqiqiy rasmni olish."""

    if not url or not url.startswith("https://"):
        return ""

    try:
        with request_url(url, 15) as response:
            content_type = response.headers.get(
                "Content-Type", ""
            )

            if "text/html" not in content_type:
                return ""

            final_url = response.geturl()

            page = response.read(500000).decode(
                "utf-8",
                errors="ignore"
            )

        parser = ImageMetaParser()
        parser.feed(page)

        for image_url in parser.images:
            absolute_url = urljoin(final_url, image_url)
            image = safe_image(absolute_url)

            if image:
                return image

    except Exception as error:
        print("Maqola rasmi topilmadi:", error)

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

    # Avval eski rasmni tekshiramiz.
    image = safe_image(previous.get("image", ""))

    # Keyin RSS ichidagi rasmni qidiramiz.
    if not image:
        image = rss_image(entry)

    # Rasm topilmasa, asl maqola havolasini aniqlaymiz.
    article_url = previous.get("article_url", "")

    if not image:
        if not article_url:
            article_url = original_article_url(link)

        if article_url:
            image = article_image(article_url)

    # Asl maqola topilmasa, Google News havolasini saqlaymiz.
    final_url = article_url or link

    items.append({
        "title": translated,
        "url": final_url,
        "source": source,
        "date": date,
        "lang": "uz",
        "image": image,
        "article_url": article_url
    })

    if image:
        print("Rasm topildi:", source)
    else:
        print("Rasm topilmadi:", source)


if not items:
    print(
        "Yangi yangilik topilmadi. "
        "Eski news.json saqlanadi."
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

print(
    f"{len(items)} ta o'zbekcha yangilik saqlandi."
)

print(
    f"{image_count} ta haqiqiy maqola rasmi topildi."
)

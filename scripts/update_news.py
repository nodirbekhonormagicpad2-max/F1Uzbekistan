
#!/usr/bin/env python3
"""F1 yangiliklarini o'zbekchaga tarjima qilish va asl rasmlarini olish."""

import html
import json
import time
import xml.etree.ElementTree as ET

from datetime import timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse
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
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html,application/xml,application/json"
        }
    )
    return urlopen(request, timeout=timeout)


def translate(text):
    url = (
        "https://api.mymemory.translated.net/get?"
        + urlencode({
            "q": text,
            "langpair": "en|uz"
        })
    )

    with request_url(url, 20) as response:
        data = json.load(response)

    if data.get("responseStatus") != 200:
        raise RuntimeError("Tarjima xizmati xatosi")

    if data.get("quotaFinished"):
        raise RuntimeError("Tarjima limiti tugagan")

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


def safe_url(url):
    url = html.unescape(url or "").strip()
    parsed = urlparse(url)

    if parsed.scheme != "https" or not parsed.hostname:
        return ""

    return url


def original_article_url(google_url):
    """Google News havolasidan asl maqola manzilini olish."""

    if "news.google.com" not in urlparse(google_url).netloc:
        return safe_url(google_url)

    try:
        result = gnewsdecoder(
            google_url,
            interval=1
        )

        if (
            isinstance(result, dict)
            and result.get("status")
        ):
            decoded = safe_url(result.get("decoded_url", ""))

            if decoded and "news.google.com" not in urlparse(decoded).netloc:
                return decoded

    except Exception as error:
        print("Havolani ochish xatosi:", error)

    return ""


class ImageParser(HTMLParser):
    """Maqola sahifasidan og:image tegini o'qish."""

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
            image = attributes.get("content", "")

            if image:
                self.images.append(image)


def article_image(url):
    """Faqat asl maqolaning rasmini qidirish."""

    if not safe_url(url):
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

        parser = ImageParser()
        parser.feed(page)

        for image in parser.images:
            image_url = safe_url(
                urljoin(final_url, image)
            )

            if image_url:
                return image_url

    except Exception as error:
        print("Rasmni olish xatosi:", error)

    return ""


def rss_image(entry):
    """RSS orqali maqolaga biriktirilgan rasmni olish."""

    tags = (
        "{http://search.yahoo.com/mrss/}content",
        "{http://search.yahoo.com/mrss/}thumbnail",
        "enclosure"
    )

    for tag in tags:
        for element in entry.findall(tag):
            image = safe_url(element.get("url", ""))
            media_type = element.get("type", "")

            if image and (
                not media_type
                or media_type.startswith("image/")
            ):
                return image

    return ""


try:
    old_news = json.loads(
        OUTPUT.read_text(encoding="utf-8")
    )

    if not isinstance(old_news, list):
        old_news = []

except (OSError, ValueError):
    old_news = []


cache = {
    item["url"]: item
    for item in old_news
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

    original_title = (
        entry.findtext("title") or ""
    ).strip()

    google_link = (
        entry.findtext("link") or ""
    ).strip()

    source = (
        entry.findtext("source") or "Google News"
    ).strip()

    if not original_title or not safe_url(google_link):
        continue

    if google_link in seen:
        continue

    seen.add(google_link)

    try:
        date = parsedate_to_datetime(
            entry.findtext("pubDate") or ""
        ).astimezone(timezone.utc).isoformat()

    except (ValueError, TypeError, OverflowError):
        date = ""

    previous = cache.get(google_link, {})

    if previous:
        translated_title = previous["title"]

    else:
        try:
            translated_title = translate(original_title)
            time.sleep(1)

        except Exception as error:
            print("Tarjima xatosi:", error)
            continue

    if not translated_title:
        continue

    article_url = previous.get("article_url", "")
    image = safe_url(previous.get("image", ""))

    if not image:
        image = rss_image(entry)

    if not image:
        if not article_url:
            article_url = original_article_url(google_link)

        if article_url:
            image = article_image(article_url)

    items.append({
        "title": translated_title,
        "url": article_url or google_link,
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
    print("Yangilik topilmadi. Eski fayl saqlanadi.")
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
    1 for item in items if item["image"]
)

print(f"{len(items)} ta o'zbekcha yangilik saqlandi.")
print(f"{image_count} ta haqiqiy maqola rasmi topildi.")

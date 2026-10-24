
#!/usr/bin/env python3
"""F1 Uzbekistan: RSS yangiliklarini o'zbekchaga tayyorlash."""

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
    ("Autosport", "https://www.autosport.com/rss/f1/news/"),
    ("Motorsport.com", "https://www.motorsport.com/rss/f1/news/"),
    ("BBC Sport", "https://feeds.bbci.co.uk/sport/formula1/rss.xml"),
]

MEDIA = "{http://search.yahoo.com/mrss/}"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}"

# Faqat qayta nashr qilish huquqi tekshirilgan
# manbalarni shu ro'yxatga qo'shing.
FULL_TEXT_ALLOWED = set()

TRANSLATE_CHUNK = 400


def fetch(url, timeout=20):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (F1Uzbekistan News)",
            "Accept": "application/rss+xml,application/xml,text/html,application/json",
        },
    )
    return urlopen(request, timeout=timeout)


def safe_url(value):
    value = html.unescape(str(value or "")).strip()

    if value.startswith("//"):
        value = "https:" + value

    parsed = urlparse(value)

    if parsed.scheme != "https" or not parsed.hostname:
        return ""

    return value


class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()

        if tag in ("script", "style"):
            self.ignored += 1

        if not self.ignored and tag in (
            "p", "div", "br", "li", "h2", "h3"
        ):
            self.parts.append("\n\n")

    def handle_endtag(self, tag):
        tag = tag.lower()

        if tag in ("script", "style"):
            self.ignored = max(0, self.ignored - 1)

        if not self.ignored and tag in (
            "p", "div", "li", "h2", "h3"
        ):
            self.parts.append("\n\n")

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def clean_text(value):
    parser = TextParser()
    parser.feed(html.unescape(value or ""))

    text = html.unescape("".join(parser.parts))
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)

    return text.strip()


def clean_ending(text):
    text = re.sub(
        r"\s*(?:Read more|Continue reading|"
        r"O['‘’]qishni davom eting)"
        r"(?:\s*[.→↗»…]*)$",
        "",
        text,
        flags=re.IGNORECASE,
    )
    return text.strip()


def split_chunks(text, limit=TRANSLATE_CHUNK):
    """Matnni so'zlarni kesmasdan bo'laklash."""
    words = text.split()
    chunks = []
    current = []

    for word in words:
        candidate = " ".join(current + [word])

        if len(candidate) > limit and current:
            chunks.append(" ".join(current))
            current = [word]
        else:
            current.append(word)

    if current:
        chunks.append(" ".join(current))

    return chunks


def translate_chunk(text):
    url = (
        "https://api.mymemory.translated.net/get?"
        + urlencode({
            "q": text,
            "langpair": "en|uz",
        })
    )

    with fetch(url, 25) as response:
        data = json.load(response)

    if str(data.get("responseStatus")) != "200":
        raise RuntimeError(
            "Tarjima API xatosi: "
            + str(data.get("responseStatus"))
        )

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
        raise RuntimeError("Tarjima qaytmadi")

    return result


def translate(text):
    """Matnni qisqartirmasdan bo'laklab tarjima qilish."""
    text = (text or "").strip()

    if not text:
        return ""

    paragraphs = [
        p.strip()
        for p in text.split("\n\n")
        if p.strip()
    ]

    translated = []

    for paragraph in paragraphs:
        chunks = split_chunks(paragraph)
        results = []

        for chunk in chunks:
            result = translate_chunk(chunk)
            results.append(result)
            time.sleep(1)

        translated.append(" ".join(results))

    return "\n\n".join(translated)


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
            "twitter:image:src",
        ):
            if data.get("content"):
                self.images.append(data["content"])


def article_image(url):
    try:
        with fetch(url, 12) as response:
            content_type = response.headers.get(
                "Content-Type", ""
            )

            if "text/html" not in content_type:
                return ""

            final_url = response.geturl()

            page = response.read(600000).decode(
                "utf-8", errors="ignore"
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
        print("Rasm xatosi:", error)

    return ""


def rss_image(entry, article_url):
    for tag in (
        MEDIA + "content",
        MEDIA + "thumbnail",
        "enclosure",
    ):
        for element in entry.findall(tag):
            media_type = element.get("type", "")

            if media_type and not media_type.startswith("image/"):
                continue

            image = safe_url(
                urljoin(
                    article_url,
                    element.get("url", ""),
                )
            )

            if image:
                return image

    for field in ("description", CONTENT + "encoded"):
        raw = entry.findtext(field) or ""

        match = re.search(
            r'<img[^>]+src=["\']([^"\']+)',
            html.unescape(raw),
            flags=re.IGNORECASE,
        )

        if match:
            image = safe_url(
                urljoin(article_url, match.group(1))
            )
            if image:
                return image

    return ""


def rss_text(entry, source):
    """RSS tavsifi yoki ruxsat etilgan to'liq matn."""
    description = clean_text(
        entry.findtext("description") or ""
    )

    encoded = clean_text(
        entry.findtext(CONTENT + "encoded") or ""
    )

    title = clean_text(
        entry.findtext("title") or ""
    )

    if source in FULL_TEXT_ALLOWED and encoded:
        text = encoded
        kind = "full"
    else:
        text = description
        kind = "summary"

    text = clean_ending(text)

    if not text or text.casefold() == title.casefold():
        return "", kind

    return text, kind


def read_previous():
    try:
        data = json.loads(
            OUTPUT.read_text(encoding="utf-8")
        )
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []


def main():
    previous_news = read_previous()

    cache = {
        item["url"]: item
        for item in previous_news
        if isinstance(item, dict)
        and item.get("url")
        and item.get("lang") == "uz"
    }

    candidates = []

    for source, feed_url in FEEDS:
        try:
            with fetch(feed_url) as response:
                root = ET.fromstring(response.read())

            entries = root.findall("./channel/item")

            print(
                f"{source}: {len(entries)} ta maqola."
            )

            for entry in entries[:20]:
                title = clean_text(
                    entry.findtext("title") or ""
                )

                link = safe_url(
                    entry.findtext("link") or ""
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
                    "entry": entry,
                })

        except Exception as error:
            print(source, "RSS xatosi:", error)

    candidates.sort(
        key=lambda x: x["timestamp"],
        reverse=True,
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

        title = previous.get("title", "")

        if not title:
            try:
                title = translate(
                    candidate["original_title"]
                )
            except Exception as error:
                print("Sarlavha xatosi:", error)
                continue

        if not title:
            continue

        original_text, content_type = rss_text(
            candidate["entry"],
            candidate["source"],
        )

        old_content = previous.get("content")
        old_summary = previous.get("summary", "")

        content = []
        summary = ""

        # Eski, ishonchli to'liq matnni saqlash.
        if (
            previous.get("content_type") == "full"
            and isinstance(old_content, list)
            and old_content
        ):
            content = old_content
            content_type = "full"

        elif original_text:
            try:
                translated = translate(original_text)

                if translated:
                    content = [
                        p.strip()
                        for p in translated.split("\n\n")
                        if p.strip()
                    ]

                    if content_type == "summary":
                        summary = "\n\n".join(content)

            except Exception as error:
                print("Matn tarjimasi xatosi:", error)

        # Tarjima ishlamasa eski mazmunni saqlash.
        if not content:
            if isinstance(old_content, list) and old_content:
                content = old_content
                content_type = previous.get(
                    "content_type", "summary"
                )
            elif isinstance(old_content, str) and old_content.strip():
                content = [old_content.strip()]
                content_type = "summary"
            elif isinstance(old_summary, str) and old_summary.strip():
                content = [old_summary.strip()]
                content_type = "summary"

        if not summary and content_type == "summary":
            summary = "\n\n".join(content)

        image = safe_url(
            previous.get("image", "")
        )

        if not image:
            image = rss_image(
                candidate["entry"], link
            )

        if not image:
            image = article_image(link)

        item = {
            "title": title,
            "url": link,
            "source": candidate["source"],
            "date": candidate["date"],
            "lang": "uz",
            "image": image,
            "content": content,
            "summary": summary,
            "content_type": content_type,
        }

        items.append(item)

        print(
            candidate["source"],
            "| Rasm:", bool(image),
            "| Matn:", bool(content),
            "| Turi:", content_type,
        )

    if not items:
        print(
            "Yangi yangilik topilmadi. "
            "Avvalgi news.json saqlanadi."
        )
        raise SystemExit(1)

    OUTPUT.write_text(
        json.dumps(
            items,
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )

    print(
        f"{len(items)} ta o'zbekcha yangilik saqlandi."
    )


if __name__ == "__main__":
    main()

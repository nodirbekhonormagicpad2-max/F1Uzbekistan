#!/usr/bin/env python3
"""Update F1 Uzbekistan's news.json from RSS using free, best-effort translation."""
import html
import json
import re
import tempfile
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "news.json"
MAX_NEWS = 10
MAX_NEW_TRANSLATIONS = 5
FEEDS = [
    ("Autosport", "https://www.autosport.com/rss/f1/news/"),
    ("Motorsport.com", "https://www.motorsport.com/rss/f1/news/"),
    ("BBC Sport", "https://feeds.bbci.co.uk/sport/formula1/rss.xml"),
]
MEDIA = "{http://search.yahoo.com/mrss/}"


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1
        elif not self.hidden and tag in ("p", "br", "li", "div"):
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def clean(value):
    parser = PlainText()
    parser.feed(html.unescape(value or ""))
    return re.sub(r"\s+", " ", html.unescape("".join(parser.parts))).strip()


def fetch(url):
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; F1Uzbekistan/1.0)"})
    with urlopen(request, timeout=15) as response:
        return response.read(2_000_000)


def valid_url(value):
    value = (value or "").strip()
    parsed = urlparse(value)
    return value if parsed.scheme == "https" and parsed.hostname else ""


def canonical(url):
    """Remove tracking parameters for duplicate detection, preserving the original URL in JSON."""
    parsed = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
                       if not k.lower().startswith("utm_")])
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(),
                       parsed.path.rstrip("/"), query, ""))


def fix_terms(text):
    # MyMemory sometimes interprets GP as 'general practitioner'.
    text = re.sub(r"\bumumiy amaliyot shifokori\b", "Gran-pri", text, flags=re.I)
    text = re.sub(r"\bAlp tog['‘’]?lari (haydovchisi|jamoasi)\b", r"Alpine \1", text, flags=re.I)
    return text


def translate(text):
    """Translate in small chunks; failure skips the new article rather than publishing English."""
    text = clean(text)
    if not text:
        return ""
    translated = []
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        words = sentence.split()
        chunks = []
        chunk = ""
        for word in words:
            if len(word) > 400:
                print("Tarjima: juda uzun so‘z; matn o‘tkazildi")
                return ""
            if len(chunk) + len(word) + 1 > 400 and chunk:
                chunks.append(chunk)
                chunk = word
            else:
                chunk = (chunk + " " + word).strip()
        if chunk:
            chunks.append(chunk)
        for part in chunks:
            try:
                url = "https://api.mymemory.translated.net/get?" + urlencode({
                    "q": part, "langpair": "en|uz"
                })
                data = json.loads(fetch(url).decode("utf-8"))
                status = int(data.get("responseStatus", 0))
                result = clean(data.get("responseData", {}).get("translatedText", ""))
                if status != 200 or not result or "MYMEMORY WARNING" in result.upper():
                    print(f"Tarjima rad etildi: status={status}, xabar={str(data.get('responseDetails', ''))[:120]}")
                    return ""
                translated.append(fix_terms(result))
                time.sleep(0.2)
            except Exception as exc:
                print(f"Tarjima xatosi: {type(exc).__name__}: {exc}")
                return ""
    return " ".join(translated)


def image_url(entry, link):
    for tag in (MEDIA + "content", MEDIA + "thumbnail", "enclosure"):
        for node in entry.findall(tag):
            kind = node.get("type", "")
            if kind and not kind.startswith("image/"):
                continue
            image = valid_url(urljoin(link, node.get("url", "")))
            if image:
                return image
    return ""


def old_items():
    try:
        data = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, ValueError) as exc:
        print("Eski news.json o‘qilmadi:", exc)
        return []


def date_timestamp(value):
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except (TypeError, ValueError, OverflowError):
        return 0


def feed_items():
    items = []
    successes = 0
    for source, feed in FEEDS:
        try:
            root = ET.fromstring(fetch(feed))
            count = 0
            for entry in root.findall("./channel/item")[:20]:
                title = clean(entry.findtext("title"))
                link = valid_url(clean(entry.findtext("link")))
                desc = clean(entry.findtext("description"))
                if not title or not link:
                    continue
                try:
                    dt = parsedate_to_datetime(entry.findtext("pubDate") or "")
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    dt = dt.astimezone(timezone.utc)
                except (ValueError, TypeError, OverflowError):
                    # Missing dates go to the bottom instead of looking artificially new.
                    dt = datetime(1970, 1, 1, tzinfo=timezone.utc)
                items.append({"title": title, "url": link, "description": desc,
                              "source": source, "date": dt.isoformat(),
                              "timestamp": dt.timestamp(), "image": image_url(entry, link)})
                count += 1
            successes += 1
            print(f"{source} RSS yuklandi: {count} ta xabar")
        except Exception as exc:
            print(f"{source} RSS xatosi: {type(exc).__name__}: {exc}")
    print(f"RSS manbalar: {successes}/{len(FEEDS)}; jami nomzod: {len(items)}")
    return sorted(items, key=lambda x: x["timestamp"], reverse=True)


def main():
    old = old_items()
    cached = {canonical(x["url"]): x for x in old
              if isinstance(x, dict) and x.get("lang") == "uz"
              and isinstance(x.get("url"), str) and valid_url(x["url"])}
    feeds = feed_items()
    if not feeds:
        print("RSS bo‘sh yoki ishlamadi; mavjud news.json saqlanadi")
        return

    results = []
    seen = set()
    new_count = 0
    skipped = 0
    for item in feeds:
        key = canonical(item["url"])
        if key in seen:
            continue
        seen.add(key)
        if key in cached:
            existing = dict(cached[key])
            if item["image"] and not existing.get("image"):
                existing["image"] = item["image"]
            results.append(existing)
            continue
        if new_count >= MAX_NEW_TRANSLATIONS:
            continue
        if len(item["description"]) < 50:
            skipped += 1
            print("Qisqa tavsif, o‘tkazildi:", item["title"][:100])
            continue
        title = translate(item["title"])
        summary = translate(item["description"]) if title else ""
        if not title or not summary:
            skipped += 1
            print("Tarjima bajarilmadi, o‘tkazildi:", item["title"][:100])
            continue
        results.append({
            "title": title, "url": item["url"], "source": item["source"],
            "date": item["date"], "lang": "uz", "image": item["image"],
            "summary": summary, "content": [summary],
            "content_type": "summary", "generated_by": "free_translation"
        })
        new_count += 1
        print("Yangi tarjima:", title[:100])

    # Keep older translated articles as fallback when feeds or translation are incomplete.
    for item in old:
        if not isinstance(item, dict) or item.get("lang") != "uz":
            continue
        url = item.get("url")
        if not isinstance(url, str) or not valid_url(url):
            continue
        key = canonical(url)
        if key not in {canonical(x["url"]) for x in results}:
            results.append(item)

    results.sort(key=lambda x: date_timestamp(x.get("date")), reverse=True)
    unique = []
    unique_keys = set()
    for item in results:
        key = canonical(item["url"])
        if key not in unique_keys:
            unique_keys.add(key)
            unique.append(item)
        if len(unique) == MAX_NEWS:
            break

    if not unique:
        print("Saqlash uchun yangilik yo‘q; eski fayl saqlanadi")
        return
    # Avoid unnecessary commits when data is unchanged.
    if unique == old:
        print(f"Jami {len(unique)} yangilik; yangi tarjima: {new_count}; o‘zgarish yo‘q")
        return
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=ROOT, delete=False) as tmp:
        json.dump(unique, tmp, ensure_ascii=False, indent=2)
        tmp.write("\n")
        tmp_path = Path(tmp.name)
    tmp_path.replace(OUTPUT)
    print(f"Jami {len(unique)} yangilik; yangi tarjima: {new_count}; o‘tkazildi: {skipped}; news.json yangilandi")


if __name__ == "__main__":
    main()

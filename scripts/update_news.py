#!/usr/bin/env python3
"""F1 Uzbekistan: RSS yangiliklari va o'zbekcha qisqa mazmunlar."""
import html
import json
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlencode, urlunparse, parse_qsl
from urllib.request import Request, urlopen

OUTPUT = Path('news.json')
MAX_NEWS = 10
FEEDS = [
    ('Autosport', 'https://www.autosport.com/rss/f1/news/'),
    ('Motorsport.com', 'https://www.motorsport.com/rss/f1/news/'),
    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/formula1/rss.xml'),
]
MEDIA = '{http://search.yahoo.com/mrss/}'
CONTENT = '{http://purl.org/rss/1.0/modules/content/}'
# Faqat nashr etishga ruxsat berilgan to'liq matn manbalari.
FULL_TEXT_ALLOWED = set()
TRANSLATE_CHUNK = 400
ENDING = re.compile(
    r'(?:\s|\.{3}|…)*(?:read\s+more|continue\s+reading|'
    r'o[\'‘’`ʻ]qishni\s+davom\s+et(?:ing|tiring)|'
    r'batafsil\s+o[\'‘’`ʻ]qing)\s*[.!…»↗→]*\s*$', re.I
)

def fetch(url, timeout=20):
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; F1UzbekistanNews/1.0)',
        'Accept': 'application/rss+xml,application/xml,text/html,application/json',
    })
    return urlopen(req, timeout=timeout)

def safe_url(value):
    value = html.unescape(str(value or '')).strip()
    if value.startswith('//'):
        value = 'https:' + value
    parsed = urlparse(value)
    return value if parsed.scheme == 'https' and parsed.hostname else ''

def canonical_url(value):
    parsed = urlparse(value)
    params = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
              if not k.lower().startswith('utm_')]
    return urlunparse(parsed._replace(query=urlencode(params), fragment=''))

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignore_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ('script', 'style'):
            self.ignore_depth += 1
        elif not self.ignore_depth and tag in ('p', 'div', 'br', 'li', 'h2', 'h3'):
            self.parts.append('\n\n')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ('script', 'style'):
            self.ignore_depth = max(0, self.ignore_depth - 1)
        elif not self.ignore_depth and tag in ('p', 'div', 'li', 'h2', 'h3'):
            self.parts.append('\n\n')

    def handle_data(self, data):
        if not self.ignore_depth:
            self.parts.append(data)

def clean_text(value):
    parser = TextParser()
    parser.feed(html.unescape(str(value or '')))
    text = html.unescape(''.join(parser.parts))
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    return text.strip()

def clean_ending(text):
    text = (text or '').strip()
    previous = None
    while previous != text:
        previous = text
        text = ENDING.sub('', text).rstrip()
    return text

def split_chunks(text, limit=TRANSLATE_CHUNK):
    chunks, current = [], ''
    for word in text.split():
        candidate = (current + ' ' + word).strip()
        if len(candidate) > limit and current:
            chunks.append(current)
            current = word
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks

def translate_chunk(text):
    url = 'https://api.mymemory.translated.net/get?' + urlencode({
        'q': text, 'langpair': 'en|uz'
    })
    with fetch(url, 25) as response:
        data = json.load(response)
    if str(data.get('responseStatus')) != '200' or data.get('quotaFinished'):
        raise RuntimeError('Tarjima API limiti yoki xatosi')
    result = clean_text(data.get('responseData', {}).get('translatedText', ''))
    if not result or result.casefold() == text.casefold():
        raise RuntimeError('Tarjima qaytmadi')
    return clean_ending(result)

def translate(text):
    translated = []
    for paragraph in (p.strip() for p in text.split('\n\n')):
        if not paragraph:
            continue
        pieces = []
        for chunk in split_chunks(paragraph):
            pieces.append(translate_chunk(chunk))
            time.sleep(0.5)
        translated.append(clean_ending(' '.join(pieces)))
    return '\n\n'.join(p for p in translated if p)

class ImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != 'meta':
            return
        data = dict(attrs)
        name = (data.get('property') or data.get('name') or '').lower()
        if name in ('og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'):
            if data.get('content'):
                self.images.append(data['content'])

def article_image(url):
    try:
        with fetch(url, 12) as response:
            if 'text/html' not in response.headers.get('Content-Type', ''):
                return ''
            final_url = response.geturl()
            page = response.read(600000).decode('utf-8', errors='replace')
        parser = ImageParser()
        parser.feed(page)
        for candidate in parser.images:
            image = safe_url(urljoin(final_url, candidate))
            if image:
                return image
    except Exception as exc:
        print('Rasm xatosi:', exc)
    return ''

def rss_image(entry, article_url):
    for tag in (MEDIA + 'content', MEDIA + 'thumbnail', 'enclosure'):
        for element in entry.findall(tag):
            kind = element.get('type', '')
            if kind and not kind.startswith('image/'):
                continue
            image = safe_url(urljoin(article_url, element.get('url', '')))
            if image:
                return image
    for field in ('description', CONTENT + 'encoded'):
        raw = html.unescape(entry.findtext(field) or '')
        match = re.search(r'<img[^>]+src=["\']([^"\']+)', raw, re.I)
        if match:
            image = safe_url(urljoin(article_url, match.group(1)))
            if image:
                return image
    return ''

def rss_text(entry, source):
    description = clean_text(entry.findtext('description') or '')
    encoded = clean_text(entry.findtext(CONTENT + 'encoded') or '')
    title = clean_text(entry.findtext('title') or '')
    kind = 'full' if source in FULL_TEXT_ALLOWED and encoded else 'summary'
    text = clean_ending(encoded if kind == 'full' else description)
    if not text or text.casefold() == title.casefold():
        return '', kind
    return text, kind

def read_previous():
    try:
        data = json.loads(OUTPUT.read_text(encoding='utf-8'))
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []

def paragraphs(value):
    if isinstance(value, list):
        return [clean_ending(str(x)) for x in value if isinstance(x, str) and clean_ending(x)]
    if isinstance(value, str):
        return [clean_ending(x) for x in value.split('\n\n') if clean_ending(x)]
    return []

def main():
    previous = read_previous()
    cache = {canonical_url(x['url']): x for x in previous
             if isinstance(x, dict) and safe_url(x.get('url')) and x.get('lang') == 'uz'}
    candidates = []
    for source, feed_url in FEEDS:
        try:
            with fetch(feed_url) as response:
                root = ET.fromstring(response.read())
            entries = root.findall('./channel/item')
            print(f'{source}: {len(entries)} ta maqola')
            for entry in entries[:20]:
                title = clean_text(entry.findtext('title') or '')
                link = safe_url(entry.findtext('link') or '')
                if not title or not link:
                    continue
                try:
                    dt = parsedate_to_datetime(entry.findtext('pubDate') or '')
                    dt = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
                    dt = dt.astimezone(timezone.utc)
                    date, timestamp = dt.isoformat(), dt.timestamp()
                except (ValueError, TypeError, OverflowError):
                    date, timestamp = '', 0
                candidates.append(dict(title=title, url=link, source=source,
                                       date=date, timestamp=timestamp, entry=entry))
        except Exception as exc:
            print(f'{source} RSS xatosi: {exc}')
    candidates.sort(key=lambda x: x['timestamp'], reverse=True)
    items, seen = [], set()
    for candidate in candidates:
        if len(items) >= MAX_NEWS:
            break
        link = candidate['url']
        key = canonical_url(link)
        if key in seen:
            continue
        seen.add(key)
        old = cache.get(key, {})
        title = old.get('title') if isinstance(old.get('title'), str) else ''
        if not title:
            try:
                title = translate(candidate['title'])
            except Exception as exc:
                print('Sarlavha tarjimasi xatosi:', exc)
                continue
        source_text, kind = rss_text(candidate['entry'], candidate['source'])
        old_content = paragraphs(old.get('content'))
        old_kind = old.get('content_type', 'summary')
        content = old_content if old_content else paragraphs(old.get('summary'))
        if old_kind == 'full' and content:
            kind = 'full'
        elif not content and source_text:
            try:
                content = paragraphs(translate(source_text))
            except Exception as exc:
                print('Matn tarjimasi xatosi:', exc)
        elif content:
            kind = 'summary' if old_kind != 'full' else 'full'
        image = safe_url(old.get('image')) or rss_image(candidate['entry'], link)
        if not image:
            image = article_image(link)
        items.append({
            'title': clean_ending(title), 'url': link, 'source': candidate['source'],
            'date': candidate['date'], 'lang': 'uz', 'image': image,
            'content': content, 'summary': '\n\n'.join(content) if kind == 'summary' else '',
            'content_type': kind,
        })
        print(candidate['source'], '| Rasm:', bool(image), '| Matn:', bool(content), '| Turi:', kind)
    if not items:
        print('Yangilik olinmadi. Eski news.json saqlanadi.')
        raise SystemExit(1)
    tmp = OUTPUT.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, OUTPUT)
    print(f'{len(items)} ta yangilik saqlandi.')

if __name__ == '__main__':
    main()

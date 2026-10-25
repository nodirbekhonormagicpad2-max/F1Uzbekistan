#!/usr/bin/env python3
"""F1 Uzbekistan: RSS/Atom -> Uzbek news.json (best-effort free translation)."""
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
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlparse, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'news.json'
MAX_NEWS = 10
MAX_NEW_TRANSLATIONS = 5
FEEDS = [
    ('Autosport', 'https://www.autosport.com/rss/f1/news/'),
    ('Motorsport.com', 'https://www.motorsport.com/rss/f1/news/'),
    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/formula1/rss.xml'),
]

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        elif not self.hidden and tag in ('p', 'br', 'li', 'div'):
            self.parts.append(' ')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

def clean(value):
    p = PlainText()
    p.feed(html.unescape(value or ''))
    return re.sub(r'\s+', ' ', html.unescape(''.join(p.parts))).strip()

def fetch(url):
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    })
    with urlopen(req, timeout=20) as resp:
        content_type = resp.headers.get('Content-Type', '')
        data = resp.read(2_000_001)
        if len(data) > 2_000_000:
            raise ValueError('Javob hajmi 2 MB dan katta')
        return data, content_type

def valid_url(value):
    value = (value or '').strip()
    p = urlparse(value)
    return value if p.scheme == 'https' and p.hostname else ''

def canonical(url):
    p = urlsplit(url)
    q = urlencode([(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
                   if not k.lower().startswith('utm_')])
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip('/'), q, ''))

def local(tag):
    return tag.rsplit('}', 1)[-1].split(':')[-1].lower()

def child_text(node, names):
    for name in names:
        for child in node:
            if local(child.tag) == name:
                return clean(''.join(child.itertext()))
    return ''

def item_link(node):
    for child in node:
        if local(child.tag) != 'link':
            continue
        href = child.get('href') or (child.text or '')
        rel = child.get('rel', 'alternate')
        if rel in ('alternate', '') and valid_url(href):
            return href.strip()
    return ''

def image_url(node, link):
    for el in node.iter():
        name = local(el.tag)
        if name not in ('content', 'thumbnail', 'enclosure'):
            continue
        kind = el.get('type', '')
        if kind and not kind.startswith('image/'):
            continue
        url = valid_url(urljoin(link, el.get('url') or el.get('href') or ''))
        if url:
            return url
    return ''

def parse_date(value):
    if not value:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    try:
        dt = parsedate_to_datetime(value)
    except (ValueError, TypeError, IndexError):
        try:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return datetime(1970, 1, 1, tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def date_timestamp(value):
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except (TypeError, ValueError, OverflowError):
        return 0

def feed_items():
    items = []
    for source, url in FEEDS:
        try:
            raw, content_type = fetch(url)
            root = ET.fromstring(raw)
            entries = [n for n in root.iter() if local(n.tag) in ('item', 'entry')]
            print(f'{source}: XML={local(root.tag)}, content-type={content_type}, elementlar={len(entries)}')
            count = 0
            for entry in entries[:30]:
                title = child_text(entry, ('title',))
                link = item_link(entry)
                desc = child_text(entry, ('description', 'summary', 'content', 'encoded'))
                if not title or not link:
                    continue
                dt = parse_date(child_text(entry, ('pubdate', 'published', 'updated', 'date')))
                items.append({'title': title, 'url': link, 'description': desc,
                              'source': source, 'date': dt.isoformat(),
                              'timestamp': dt.timestamp(), 'image': image_url(entry, link)})
                count += 1
            print(f'{source}: {count} ta yaroqli xabar')
            if not count:
                print(f'{source}: DIAGNOSTIKA: javob boshi={raw[:160]!r}')
        except (ET.ParseError, HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
            print(f'{source}: RSS xatosi: {type(exc).__name__}: {exc}')
        except Exception as exc:
            print(f'{source}: kutilmagan xato: {type(exc).__name__}: {exc}')
    items.sort(key=lambda x: x['timestamp'], reverse=True)
    print(f'Jami RSS nomzodlari: {len(items)}')
    return items

def fix_terms(value):
    value = re.sub(r'umumiy amaliyot shifokori', 'Gran-pri', value, flags=re.I)
    value = re.sub(r"Alp tog['‘’]?lari (haydovchisi|jamoasi)", r'Alpine \1', value, flags=re.I)
    return value

def translate(text):
    text = clean(text)
    if not text:
        return ''
    parts = []
    chunk = ''
    for word in text.split():
        if len(word) > 400:
            return ''
        if chunk and len(chunk) + len(word) + 1 > 400:
            parts.append(chunk)
            chunk = word
        else:
            chunk = (chunk + ' ' + word).strip()
    if chunk:
        parts.append(chunk)
    translated = []
    for part in parts:
        try:
            endpoint = 'https://api.mymemory.translated.net/get?' + urlencode({'q': part, 'langpair': 'en|uz'})
            raw, _ = fetch(endpoint)
            response = json.loads(raw.decode('utf-8'))
            status = int(response.get('responseStatus', 0))
            value = clean(response.get('responseData', {}).get('translatedText', ''))
            if status != 200 or not value or 'MYMEMORY WARNING' in value.upper():
                print(f'Tarjima rad etildi: {status}; {str(response.get("responseDetails", ""))[:120]}')
                return ''
            translated.append(fix_terms(value))
            time.sleep(0.2)
        except Exception as exc:
            print(f'Tarjima xatosi: {type(exc).__name__}: {exc}')
            return ''
    return ' '.join(translated)

def old_items():
    try:
        data = json.loads(OUTPUT.read_text(encoding='utf-8'))
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []

def main():
    old = old_items()
    old_valid = [x for x in old if isinstance(x, dict) and x.get('lang') == 'uz'
                 and isinstance(x.get('url'), str) and valid_url(x['url'])]
    cached = {canonical(x['url']): x for x in old_valid}
    feed = feed_items()
    if not feed:
        print('RSS dan xabar olinmadi; mavjud news.json saqlanadi')
        return
    results = []
    seen = set()
    new_count = 0
    skipped = 0
    for item in feed:
        key = canonical(item['url'])
        if key in seen:
            continue
        seen.add(key)
        if key in cached:
            existing = dict(cached[key])
            if item['image'] and not existing.get('image'):
                existing['image'] = item['image']
            results.append(existing)
            continue
        if new_count >= MAX_NEW_TRANSLATIONS:
            continue
        if len(item['description']) < 50:
            skipped += 1
            continue
        title = translate(item['title'])
        summary = translate(item['description']) if title else ''
        if not title or not summary:
            skipped += 1
            print('Tarjima amalga oshmadi:', item['title'][:100])
            continue
        results.append({'title': title, 'url': item['url'], 'source': item['source'],
                        'date': item['date'], 'lang': 'uz', 'image': item['image'],
                        'summary': summary, 'content': [summary],
                        'content_type': 'summary', 'generated_by': 'free_translation'})
        new_count += 1
    results.extend(old_valid)
    results.sort(key=lambda x: date_timestamp(x.get('date')), reverse=True)
    unique = []
    unique_keys = set()
    for item in results:
        key = canonical(item['url'])
        if key in unique_keys:
            continue
        unique_keys.add(key)
        unique.append(item)
        if len(unique) >= MAX_NEWS:
            break
    if not unique or unique == old:
        print(f'Jami {len(unique)}; yangi tarjima: {new_count}; o‘tkazildi: {skipped}; o‘zgarish yo‘q')
        return
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=ROOT, delete=False) as tmp:
        json.dump(unique, tmp, ensure_ascii=False, indent=2)
        tmp.write('\n')
        tmp_path = Path(tmp.name)
    tmp_path.replace(OUTPUT)
    print(f'Jami {len(unique)}; yangi tarjima: {new_count}; o‘tkazildi: {skipped}; news.json yangilandi')

if __name__ == '__main__':
    main()

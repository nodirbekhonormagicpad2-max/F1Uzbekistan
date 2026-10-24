#!/usr/bin/env python3
"""F1 Uzbekistan: free RSS news translated into Uzbek; no OpenAI API."""
import html
import json
import os
import re
import tempfile
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urlparse, urljoin, quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'news.json'
MAX_NEWS = 10
FEEDS = [
    ('Autosport', 'https://www.autosport.com/rss/f1/news/'),
    ('Motorsport.com', 'https://www.motorsport.com/rss/f1/news/'),
    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/formula1/rss.xml'),
]
MEDIA = '{http://search.yahoo.com/mrss/}'

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        elif not self.hidden and tag in ('p', 'br', 'li'):
            self.parts.append(' ')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

def clean(value):
    parser = PlainText()
    parser.feed(html.unescape(value or ''))
    return re.sub(r'\s+', ' ', html.unescape(''.join(parser.parts))).strip(' .…')

def fetch(url):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; F1Uzbekistan/1.0)'})
    with urlopen(req, timeout=15) as response:
        return response.read(2_000_000)

def valid_url(value):
    return value if value.startswith('https://') and urlparse(value).hostname else ''

def translate(text):
    """Public MyMemory endpoint: best-effort, subject to rate limits."""
    if not text:
        return ''
    chunks = []
    # Keep requests under public endpoint's size restrictions.
    sentences = re.split(r'(?<=[.!?])\s+', text)
    for sentence in sentences:
        if len(sentence) > 420:
            sentence = sentence[:420].rsplit(' ', 1)[0]
        if not sentence:
            continue
        try:
            url = 'https://api.mymemory.translated.net/get?' + urlencode({
                'q': sentence, 'langpair': 'en|uz'
            })
            data = json.loads(fetch(url).decode('utf-8'))
            if int(data.get('responseStatus', 0)) != 200:
                return ''
            result = clean(data.get('responseData', {}).get('translatedText', ''))
            if not result or 'MYMEMORY WARNING' in result.upper():
                return ''
            chunks.append(result)
            time.sleep(0.15)
        except Exception as exc:
            print('Tarjima xatosi:', exc)
            return ''
    return ' '.join(chunks)

def image_url(entry, link):
    for tag in (MEDIA + 'content', MEDIA + 'thumbnail', 'enclosure'):
        for node in entry.findall(tag):
            kind = node.get('type', '')
            if kind and not kind.startswith('image/'):
                continue
            image = valid_url(urljoin(link, node.get('url', '')))
            if image:
                return image
    return ''

def old_items():
    try:
        data = json.loads(OUTPUT.read_text(encoding='utf-8'))
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []

def feed_items():
    items = []
    for source, feed in FEEDS:
        try:
            root = ET.fromstring(fetch(feed))
            for entry in root.findall('./channel/item')[:15]:
                title = clean(entry.findtext('title'))
                link = valid_url(clean(entry.findtext('link')))
                desc = clean(entry.findtext('description'))
                if not title or not link:
                    continue
                try:
                    date = parsedate_to_datetime(entry.findtext('pubDate') or '')
                    if date.tzinfo is None:
                        date = date.replace(tzinfo=timezone.utc)
                    date = date.astimezone(timezone.utc)
                except (ValueError, TypeError, OverflowError):
                    date = datetime.now(timezone.utc)
                items.append(dict(title=title, url=link, description=desc,
                                  source=source, date=date.isoformat(),
                                  timestamp=date.timestamp(), image=image_url(entry, link)))
            print(source, 'RSS yuklandi')
        except Exception as exc:
            print(source, 'RSS xatosi:', exc)
    return sorted(items, key=lambda x: x['timestamp'], reverse=True)

def main():
    old = old_items()
    cached = {x.get('url'): x for x in old if isinstance(x, dict) and x.get('lang') == 'uz'}
    results = []
    seen = set()
    new_count = 0
    for item in feed_items():
        if len(results) >= MAX_NEWS:
            break
        link = item['url']
        if link in seen:
            continue
        seen.add(link)
        if link in cached:
            existing = dict(cached[link])
            if item['image'] and not existing.get('image'):
                existing['image'] = item['image']
            results.append(existing)
            continue
        if new_count >= 5 or len(item['description']) < 50:
            continue
        title = translate(item['title'])
        summary = translate(item['description'])
        if not title or not summary:
            print('Tarjima amalga oshmadi; yangilik o‘tkazildi:', item['title'])
            continue
        results.append({
            'title': title, 'url': link, 'source': item['source'],
            'date': item['date'], 'lang': 'uz', 'image': item['image'],
            'summary': summary, 'content': [summary],
            'content_type': 'summary', 'generated_by': 'free_translation',
        })
        new_count += 1
        print('Yangi xabar:', title)
    for item in old:
        if len(results) >= MAX_NEWS:
            break
        if isinstance(item, dict) and item.get('lang') == 'uz' and item.get('url') not in seen:
            results.append(item)
            seen.add(item.get('url'))
    if not results:
        print('Yangi kontent yo‘q; eski news.json saqlanadi')
        return
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=ROOT, delete=False) as tmp:
        json.dump(results, tmp, ensure_ascii=False, indent=2)
        tmp.write('\n')
        tmp_path = Path(tmp.name)
    tmp_path.replace(OUTPUT)
    print(f'Jami {len(results)} yangilik, yangi tarjima: {new_count}')

if __name__ == '__main__':
    main()

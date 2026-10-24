#!/usr/bin/env python3
"""Fetch F1 headlines, retaining only Uzbek translations."""
import json
import random
import time
import xml.etree.ElementTree as ET
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from deep_translator import GoogleTranslator

OUTPUT = Path('news.json')
QUERY = 'Formula 1 F1 racing when:7d'
URL = ('https://news.google.com/rss/search?q=' + quote(QUERY)
       + '&hl=en-US&gl=US&ceid=US:en')

# Preserve previously translated headlines to avoid repeated requests.
try:
    old = json.loads(OUTPUT.read_text(encoding='utf-8'))
    if not isinstance(old, list):
        old = []
except (FileNotFoundError, ValueError, OSError):
    old = []
cache = {x['url']: x for x in old if isinstance(x, dict)
         and x.get('url') and x.get('lang') == 'uz' and x.get('title')}

with urlopen(Request(URL, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
    root = ET.fromstring(response.read())

translator = GoogleTranslator(source='en', target='uz')
items, seen = [], set()
for entry in root.findall('./channel/item'):
    original = (entry.findtext('title') or '').strip()
    link = (entry.findtext('link') or '').strip()
    source = (entry.findtext('source') or 'Google News').strip()
    if not original or not link.startswith('https://') or link in seen:
        continue
    seen.add(link)
    try:
        date = parsedate_to_datetime(entry.findtext('pubDate') or '').astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError):
        date = ''

    if link in cache:
        translated = cache[link]['title']
    else:
        translated = None
        for attempt in range(3):
            try:
                # Respect the service's rate limit, including across attempts.
                time.sleep(2.5 + random.uniform(0, 0.5))
                candidate = translator.translate(original)
                if candidate and candidate.strip().casefold() != original.casefold():
                    translated = candidate.strip()
                break
            except Exception as exc:
                print(f'Tarjima urinishi {attempt + 1}/3 muvaffaqiyatsiz: {exc}')
                if attempt < 2:
                    time.sleep(10 * (2 ** attempt))
        if translated is None:
            continue  # Never publish English as Uzbek.

    items.append({'title': translated, 'url': link, 'source': source,
                  'date': date, 'lang': 'uz'})
    if len(items) >= 10:
        break

if not items:
    raise SystemExit('Yangi o‘zbekcha yangilik topilmadi; oldingi news.json saqlanadi.')

OUTPUT.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(items)} ta o‘zbekcha yangilik saqlandi.')

#!/usr/bin/env python3
"""F1 headlines from Google News RSS; translate titles to Uzbek only."""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from datetime import timezone
from email.utils import parsedate_to_datetime
from deep_translator import GoogleTranslator

url = 'https://news.google.com/rss/search?q=' + quote('Formula 1 F1 racing when:7d') + '&hl=en-US&gl=US&ceid=US:en'
with urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=30) as r:
    root = ET.fromstring(r.read())

translator = GoogleTranslator(source='en', target='uz')
items, seen = [], set()
for item in root.findall('./channel/item'):
    title = (item.findtext('title') or '').strip()
    link = (item.findtext('link') or '').strip()
    source = (item.findtext('source') or 'Google News').strip()
    if not title or not link.startswith('https://') or link in seen:
        continue
    seen.add(link)
    try:
        translated = translator.translate(title)
    except Exception as exc:
        print(f'Tarjima xatosi: {exc}')
        continue
    if not translated or translated.strip().casefold() == title.casefold():
        continue  # Do not show untranslated headlines
    try:
        date = parsedate_to_datetime(item.findtext('pubDate') or '').astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        date = ''
    items.append({'title': translated.strip(), 'url': link, 'source': source, 'date': date, 'lang':'uz'})
    if len(items) >= 10:
        break
if not items:
    raise SystemExit('Tarjima qilingan yangilik topilmadi; avvalgi news.json saqlanadi.')
Path('news.json').write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(items)} ta o‘zbekcha sarlavha saqlandi.')

import json, os, urllib.request, urllib.parse, datetime, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'videos.json'
KEY = os.getenv('YOUTUBE_API_KEY','').strip()
QUERIES = ['Formula 1 crash incident highlights', 'Formula 1 qualifying highlights', 'Formula 1 race highlights overtake']
NOW = datetime.datetime.now(datetime.timezone.utc)
CUTOFF = (NOW - datetime.timedelta(days=7)).isoformat().replace('+00:00','Z')

def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'F1UzbekistanVideoBot/1.0'})
    with urllib.request.urlopen(req,timeout=25) as r: return json.load(r)

def run():
    if not KEY: raise RuntimeError('YOUTUBE_API_KEY GitHub Actions secret sozlanmagan')
    seen={}
    for query in QUERIES:
        params={'part':'snippet','q':query,'type':'video','order':'date','maxResults':'20','publishedAfter':CUTOFF,'videoEmbeddable':'true','key':KEY}
        data=get('https://www.googleapis.com/youtube/v3/search?'+urllib.parse.urlencode(params))
        for it in data.get('items',[]):
            vid=it.get('id',{}).get('videoId')
            s=it.get('snippet',{})
            if not vid or not re.fullmatch(r'[\w-]{11}',vid): continue
            title=s.get('title','')
            hay=(title+' '+s.get('description','')).lower()
            if not any(w in hay for w in ('formula 1','formula one','f1','grand prix')): continue
            if not any(w in hay for w in ('crash','incident','fire','flame','qualifying','highlight','overtak','collision','spin','accident','race','alonso')): continue
            thumb=s.get('thumbnails',{}).get('high',{}).get('url','')
            seen[vid]={'id':vid,'title':title,'channel':s.get('channelTitle',''),'published':s.get('publishedAt',''),'thumbnail':thumb,'url':'https://www.youtube.com/watch?v='+vid}
    # Video statusini tekshirish: ommaviy va embed ruxsatini tasdiqlash
    ids=list(seen)
    allowed=set()
    for i in range(0,len(ids),50):
        p={'part':'status','id':','.join(ids[i:i+50]),'key':KEY}
        result=get('https://www.googleapis.com/youtube/v3/videos?'+urllib.parse.urlencode(p))
        for v in result.get('items',[]):
            status=v.get('status',{})
            if status.get('privacyStatus')=='public' and status.get('embeddable') is True:
                allowed.add(v['id'])
    items=sorted((v for k,v in seen.items() if k in allowed),key=lambda x:x['published'],reverse=True)[:24]
    if not items:
        print('Mos video topilmadi, eski videos.json saqlanadi')
        return
    payload={'updated_at':NOW.isoformat(),'videos':items}
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(items)} ta video saqlandi')
if __name__=='__main__':run()

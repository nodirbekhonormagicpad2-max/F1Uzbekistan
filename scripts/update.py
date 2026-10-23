import json, urllib.request, datetime, pathlib, time
BASE='https://api.openf1.org/v1/'
ROOT=pathlib.Path(__file__).resolve().parents[1]
def get(path):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'F1UzbekistanTV/1.0'})
    with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
def parse(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def run():
    now=datetime.datetime.now(datetime.timezone.utc)
    sessions=get('sessions?year='+str(now.year))
    ended=sorted((s for s in sessions if s.get('date_end') and parse(s['date_end'])<now),key=lambda s:s['date_end'],reverse=True)
    for s in ended[:8]:
        try:
            results=get('session_result?session_key='+str(s['session_key']))
            drivers=get('drivers?session_key='+str(s['session_key']))
            bynum={d['driver_number']:d for d in drivers}
            rows=[]
            for r in results:
                pos=r.get('position')
                if not isinstance(pos,int) or pos<1:continue
                d=bynum.get(r.get('driver_number'),{})
                gap=r.get('gap_to_leader')
                duration=r.get('duration')
                rows.append({'position':pos,'name':d.get('broadcast_name') or d.get('full_name') or '#'+str(r.get('driver_number')),'team':d.get('team_name',''),'time':str(duration) if duration is not None else ('+'+str(gap) if isinstance(gap,(int,float)) else str(gap or '—'))})
            rows.sort(key=lambda x:x['position'])
            if len(rows)<3:continue
            data={'session':s.get('session_name','Sessiya'),'meeting':s.get('country_name',''),'date':s['date_end'],'updated':now.isoformat(),'results':rows}
            (ROOT/'latest-session.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            print('Updated',data['session']);return
        except Exception as e:print('Skipping session',s.get('session_key'),str(e))
    print('No new usable results; preserving previous data')
if __name__=='__main__':run()

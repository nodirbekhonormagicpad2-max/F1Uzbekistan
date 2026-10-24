(()=>{
 const style=document.createElement('style');
 style.textContent=`.f1-news{margin-top:20px;border:1px solid #353535;border-top:3px solid #e10600;border-radius:14px;background:#151517;padding:22px}.f1-news-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.f1-news-head h2{margin:0;font-size:clamp(18px,3vw,24px)}.f1-news-tag{color:#ff625d;font-size:10px;font-weight:900}.f1-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.f1-news-card{background:#0b0b0d;border:1px solid #303036;border-radius:11px;padding:17px}.f1-news-source{color:#ff625d;font-size:11px;font-weight:800}.f1-news-card h3{font-size:16px;line-height:1.45;margin:10px 0}.f1-news-card a{color:white;text-decoration:none}.f1-news-card a:hover{color:#ff625d}.f1-news-date{color:#999;font-size:11px}.f1-news-state{color:#aaa;font-size:13px}@media(max-width:600px){.f1-news{padding:15px}.f1-news-grid{grid-template-columns:1fr}}`;
 document.head.append(style);
 const section=document.createElement('section');section.className='f1-news';section.id='news';section.setAttribute('aria-label','F1 yangiliklari');
 section.innerHTML='<div class="f1-news-head"><h2>🏎️ F1 SO‘NGGI YANGILIKLAR</h2><span class="f1-news-tag">AVTOMATIK</span></div><div class="f1-news-grid" id="f1NewsGrid" aria-live="polite"><p class="f1-news-state">Yangiliklar yuklanmoqda...</p></div>';
 const calendar=document.querySelector('.calendar-section');if(calendar)calendar.before(section);else document.querySelector('main')?.append(section);
 const grid=section.querySelector('#f1NewsGrid');
 async function load(){try{
 const response=await fetch('./news.json?t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
 const items=await response.json();if(!Array.isArray(items)||!items.length)throw Error('Bo‘sh yangiliklar');
 const fragment=document.createDocumentFragment();
 for(const item of items.slice(0,10)){
  if(!item.title||!/^https:\/\//.test(item.url||''))continue;
  const card=document.createElement('article');card.className='f1-news-card';
  const source=document.createElement('div');source.className='f1-news-source';source.textContent=item.source||'F1 yangiliklari';
  const heading=document.createElement('h3');const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title;heading.append(link);
  const date=document.createElement('div');date.className='f1-news-date';const d=new Date(item.date);if(item.date&&!Number.isNaN(d.getTime()))date.textContent=d.toLocaleDateString('uz-UZ',{day:'numeric',month:'long',year:'numeric'});
  card.append(source,heading,date);fragment.append(card);
 }
 if(!fragment.childNodes.length)throw Error('Yaroqli yangilik yo‘q');grid.replaceChildren(fragment);
 }catch(error){console.warn('F1 News:',error);if(!grid.querySelector('.f1-news-card'))grid.textContent='Yangiliklar hali mavjud emas. GitHub Actions ishga tushirilishini kuting.';}}
 load();setInterval(load,300000);
})();


(()=>{
'use strict';

if(document.getElementById('f1-cinema-premium'))return;

const style=document.createElement('style');

style.textContent=`
#f1-cinema-premium{
  --cp-red:#e10600;
  color:#fff;
  margin:28px 0;
  font-family:Arial,Helvetica,sans-serif;
}
#f1-cinema-premium *{box-sizing:border-box}
#f1-cinema-premium .cp-shell{
  background:linear-gradient(140deg,#1b1b22,#0d0d11 70%);
  border:1px solid #34343c;
  border-radius:19px;
  padding:clamp(13px,3vw,25px);
  overflow:hidden;
}
#f1-cinema-premium .cp-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  margin-bottom:18px;
}
#f1-cinema-premium .cp-logo{
  font-size:clamp(24px,4vw,35px);
  font-weight:900;
  letter-spacing:-1px;
  margin:0;
}
#f1-cinema-premium .cp-logo span{color:#ff3838}
#f1-cinema-premium .cp-sub{
  font-size:12px;
  color:#a5a5b0;
  margin-top:5px;
}
#f1-cinema-premium .cp-all{
  display:inline-block;
  background:var(--cp-red);
  color:#fff;
  text-decoration:none;
  border-radius:9px;
  padding:11px 14px;
  font-weight:800;
  font-size:12px;
}
#f1-cinema-premium .cp-hero{
  display:grid;
  grid-template-columns:1.4fr 1fr;
  min-height:290px;
  border:1px solid #3b3b43;
  border-radius:15px;
  overflow:hidden;
  background:#101015;
}
#f1-cinema-premium .cp-hero-image{
  position:relative;
  min-height:270px;
  overflow:hidden;
  background:#202026;
}
#f1-cinema-premium .cp-hero-image img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  position:absolute;
  inset:0;
}
#f1-cinema-premium .cp-hero-image:after{
  content:'';
  position:absolute;
  inset:0;
  background:linear-gradient(90deg,transparent 70%,#101015);
}
#f1-cinema-premium .cp-label{
  position:absolute;
  z-index:1;
  top:15px;
  left:15px;
  background:#e10600;
  border-radius:5px;
  padding:7px 10px;
  font-size:10px;
  font-weight:900;
  letter-spacing:1px;
}
#f1-cinema-premium .cp-hero-body{
  padding:clamp(16px,3vw,29px);
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:13px;
}
#f1-cinema-premium .cp-eyebrow{
  color:#ff5555;
  font-size:11px;
  font-weight:900;
  letter-spacing:1.4px;
}
#f1-cinema-premium .cp-hero-title{
  font-size:clamp(21px,3vw,31px);
  line-height:1.18;
  font-weight:900;
  margin:0;
  overflow-wrap:anywhere;
}
#f1-cinema-premium .cp-meta{
  color:#aaaab4;
  font-size:12px;
  line-height:1.4;
}
#f1-cinema-premium .cp-watch{
  align-self:flex-start;
  border:0;
  background:var(--cp-red);
  color:#fff;
  padding:13px 18px;
  border-radius:9px;
  font-weight:900;
  font-size:12px;
  cursor:pointer;
}
#f1-cinema-premium .cp-watch:hover,
#f1-cinema-premium .cp-all:hover{
  background:#b90500;
}
#f1-cinema-premium .cp-row{margin-top:26px}
#f1-cinema-premium .cp-rowhead{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  margin-bottom:12px;
}
#f1-cinema-premium .cp-rowtitle{
  font-size:clamp(17px,2.7vw,21px);
  font-weight:900;
  margin:0;
}
#f1-cinema-premium .cp-arrows{
  display:flex;
  gap:6px;
}
#f1-cinema-premium .cp-arrow{
  border:1px solid #454550;
  background:#262630;
  color:#fff;
  width:34px;
  height:34px;
  border-radius:8px;
  cursor:pointer;
  font-size:20px;
}
#f1-cinema-premium .cp-track{
  display:flex;
  gap:12px;
  overflow-x:auto;
  scroll-snap-type:x mandatory;
  scrollbar-width:thin;
  scrollbar-color:#555 #151519;
  padding:2px 0 12px;
}
#f1-cinema-premium .cp-card{
  flex:0 0 clamp(210px,30%,280px);
  min-width:0;
  background:#1c1c24;
  border:1px solid #363641;
  border-radius:12px;
  overflow:hidden;
  scroll-snap-align:start;
}
#f1-cinema-premium .cp-thumb{
  position:relative;
  display:block;
  width:100%;
  aspect-ratio:16/9;
  padding:0;
  border:0;
  cursor:pointer;
  background:#222;
}
#f1-cinema-premium .cp-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
#f1-cinema-premium .cp-play{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  width:49px;
  height:49px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:#e10600;
  color:white;
  font-size:19px;
  box-shadow:0 4px 20px #0009;
}
#f1-cinema-premium .cp-cardbody{padding:12px}
#f1-cinema-premium .cp-cardtitle{
  font-size:13px;
  font-weight:800;
  line-height:1.4;
  min-height:37px;
  margin:0;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
#f1-cinema-premium .cp-cardmeta{
  font-size:11px;
  color:#a2a2ad;
  margin-top:9px;
}
#f1-cinema-premium .cp-status{
  font-size:13px;
  color:#aaa;
  padding:14px 0;
}
#f1-cinema-premium .cp-empty{
  font-size:12px;
  color:#aaa;
  padding:12px;
  border:1px dashed #3a3a43;
  border-radius:9px;
}

#f1-cinema-modal{
  position:fixed;
  inset:0;
  z-index:999999;
  background:rgba(0,0,0,.96);
  display:none;
  overflow-y:auto;
  padding:16px;
  align-items:flex-start;
  justify-content:center;
}
#f1-cinema-modal.cp-open{display:flex}
#f1-cinema-modal .cp-dialog{
  width:min(960px,100%);
  margin:auto;
  background:#111116;
  border:1px solid #33343d;
  border-radius:15px;
  padding:13px;
}
#f1-cinema-modal .cp-modalhead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:10px;
}
#f1-cinema-modal .cp-modaltitle{
  font-size:15px;
  font-weight:900;
  line-height:1.4;
  margin:0;
}
#f1-cinema-modal .cp-close{
  background:#e10600;
  color:#fff;
  border:0;
  border-radius:8px;
  padding:10px 13px;
  font-weight:900;
  cursor:pointer;
  flex-shrink:0;
}
#f1-cinema-modal .cp-frame{
  width:100%;
  aspect-ratio:16/9;
  background:#000;
  border-radius:9px;
  overflow:hidden;
}
#f1-cinema-modal iframe{
  width:100%;
  height:100%;
  border:0;
}
#f1-cinema-modal .cp-nexttitle{
  font-size:14px;
  font-weight:900;
  margin:17px 0 9px;
}
#f1-cinema-modal .cp-nextlist{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:9px;
}
#f1-cinema-modal .cp-next{
  display:flex;
  gap:8px;
  align-items:center;
  min-width:0;
  background:#22222a;
  color:#fff;
  border:1px solid #393944;
  border-radius:9px;
  padding:7px;
  text-align:left;
  cursor:pointer;
}
#f1-cinema-modal .cp-next img{
  width:90px;
  aspect-ratio:16/9;
  object-fit:cover;
  border-radius:5px;
  flex-shrink:0;
}
#f1-cinema-modal .cp-next span{
  font-size:11px;
  line-height:1.35;
  font-weight:800;
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

@media(max-width:700px){
  #f1-cinema-premium .cp-hero{
    grid-template-columns:1fr;
  }
  #f1-cinema-premium .cp-hero-image{
    min-height:0;
    aspect-ratio:16/9;
  }
  #f1-cinema-premium .cp-hero-image img{
    position:static;
    object-fit:contain;
  }
  #f1-cinema-premium .cp-hero-image:after{
    display:none;
  }
  #f1-cinema-premium .cp-hero-body{
    padding:16px;
    gap:10px;
  }
  #f1-cinema-premium .cp-hero-title{
    font-size:21px;
  }
  #f1-cinema-premium .cp-card{
    flex-basis:77%;
  }
  #f1-cinema-modal .cp-nextlist{
    grid-template-columns:1fr;
  }
  #f1-cinema-modal .cp-next img{
    width:100px;
  }
}

@media(prefers-reduced-motion:reduce){
  #f1-cinema-premium .cp-track{
    scroll-behavior:auto;
  }
}
`;

document.head.appendChild(style);

const root=document.createElement('section');
root.id='f1-cinema-premium';
root.setAttribute('aria-label','F1 Cinema video markazi');

root.innerHTML=`
  <div class="cp-shell">
    <div class="cp-top">
      <div>
        <h2 class="cp-logo">🎬 F1 <span>CINEMA</span></h2>
        <div class="cp-sub">
          F1 Uzbekistan TV · Premium video markazi
        </div>
      </div>
      <a class="cp-all" href="./videos.html">
        Barcha videolar →
      </a>
    </div>

    <div class="cp-hero-holder"></div>
    <div class="cp-rows"></div>

    <div class="cp-status" role="status">
      Videolar yuklanmoqda…
    </div>
  </div>
`;

const target=document.querySelector('.calendar-section');

if(target){
  target.before(root);
}else{
  (document.querySelector('main')||document.body).append(root);
}

const modal=document.createElement('div');
modal.id='f1-cinema-modal';
modal.setAttribute('role','dialog');
modal.setAttribute('aria-modal','true');
modal.setAttribute('aria-label','F1 videopleyer');

modal.innerHTML=`
  <div class="cp-dialog">
    <div class="cp-modalhead">
      <h3 class="cp-modaltitle"></h3>
      <button type="button" class="cp-close">
        ✕ Yopish
      </button>
    </div>

    <div class="cp-frame"></div>

    <h4 class="cp-nexttitle">▶ Keyingi videolar</h4>
    <div class="cp-nextlist"></div>
  </div>
`;

document.body.append(modal);

const close=modal.querySelector('.cp-close');
const frame=modal.querySelector('.cp-frame');

let allVideos=[];
let lastFocus=null;

const validId=id=>
  /^[A-Za-z0-9_-]{11}$/.test(String(id||''));

function title(v){
  if(v.title_uz)return String(v.title_uz);

  const raw=String(v.title||'F1 videosi')
    .replace(/&amp;/gi,'&');

  const s=raw.toLowerCase();
  let gp='';

  const races=[
    [/united states|usa gp|austin/,'AQSH'],
    [/mexico/,'Meksika'],
    [/brazil|sao paulo|são paulo/,'Braziliya'],
    [/las vegas/,'Las-Vegas'],
    [/qatar/,'Qatar'],
    [/abu dhabi/,'Abu-Dabi']
  ];

  for(const [pattern,name] of races){
    if(pattern.test(s)){
      gp=name+' Gran-prisi — ';
      break;
    }
  }

  if(/crash|collision|accident/.test(s)){
    return gp+'💥 Poygadagi avariya lavhalari';
  }

  if(/fire|flames/.test(s)){
    return gp+'🔥 Boliddagi yong‘in';
  }

  if(/qualifying/.test(s)&&/highlight/.test(s)){
    return gp+'🏁 Saralashning eng qiziqarli lahzalari';
  }

  if(/race/.test(s)&&/highlight/.test(s)){
    return gp+'🏎️ Poyganing eng qiziqarli lahzalari';
  }

  if(/interview|drivers react|driver reactions/.test(s)){
    return gp+'🎤 Pilotlar intervyusi';
  }

  if(/overtak/.test(s)){
    return gp+'⚡ Eng yaxshi quvib o‘tishlar';
  }

  return raw;
}

function image(v){
  const u=v.thumbnail||v.thumbnail_url||v.thumbnailUrl;

  if(typeof u==='string'&&/^https:\/\//i.test(u)){
    return u;
  }

  return 'https://i.ytimg.com/vi/'
    +encodeURIComponent(v.id)
    +'/hqdefault.jpg';
}

function meta(v){
  let d='';

  if(v.published||v.publishedAt){
    const date=new Date(v.published||v.publishedAt);

    if(!Number.isNaN(date.getTime())){
      d=date.toLocaleDateString('uz-UZ');
    }
  }

  return [v.channel||'',d].filter(Boolean).join(' · ');
}

function closeModal(){
  modal.classList.remove('cp-open');
  frame.replaceChildren();
  document.body.style.overflow='';

  if(lastFocus&&lastFocus.isConnected){
    lastFocus.focus();
  }
}

close.addEventListener('click',closeModal);

modal.addEventListener('click',e=>{
  if(e.target===modal)closeModal();
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&modal.classList.contains('cp-open')){
    closeModal();
  }
});

function play(v){
  if(!validId(v.id))return;

  if(!modal.classList.contains('cp-open')){
    lastFocus=document.activeElement;
  }

  modal.querySelector('.cp-modaltitle').textContent=title(v);

  const iframe=document.createElement('iframe');
  iframe.title=title(v);

  iframe.src=
    'https://www.youtube-nocookie.com/embed/'
    +encodeURIComponent(v.id)
    +'?autoplay=1&rel=0&playsinline=1';

  iframe.allow=
    'autoplay; encrypted-media; picture-in-picture; fullscreen';

  iframe.allowFullscreen=true;
  frame.replaceChildren(iframe);

  const next=modal.querySelector('.cp-nextlist');
  next.replaceChildren();

  const others=allVideos
    .filter(x=>x.id!==v.id)
    .slice(0,6);

  for(const item of others){
    const b=document.createElement('button');
    b.type='button';
    b.className='cp-next';

    const img=document.createElement('img');
    img.src=image(item);
    img.alt='';
    img.loading='lazy';

    const label=document.createElement('span');
    label.textContent=title(item);

    b.append(img,label);
    b.addEventListener('click',()=>play(item));

    next.append(b);
  }

  modal.classList.add('cp-open');
  document.body.style.overflow='hidden';
  close.focus();
}

function hero(v){
  const h=document.createElement('div');
  h.className='cp-hero';

  const visual=document.createElement('div');
  visual.className='cp-hero-image';

  const img=document.createElement('img');
  img.src=image(v);
  img.alt='';
  img.loading='eager';

  const badge=document.createElement('span');
  badge.className='cp-label';
  badge.textContent='▶ YANGI VIDEO';

  visual.append(img,badge);

  const body=document.createElement('div');
  body.className='cp-hero-body';

  const eyebrow=document.createElement('div');
  eyebrow.className='cp-eyebrow';
  eyebrow.textContent='F1 UZBEKISTAN · VIDEO';

  const heading=document.createElement('h3');
  heading.className='cp-hero-title';
  heading.textContent=title(v);

  const info=document.createElement('div');
  info.className='cp-meta';
  info.textContent=meta(v)||'Eng yangi video lavha';

  const button=document.createElement('button');
  button.className='cp-watch';
  button.type='button';
  button.textContent='▶ HOZIR TOMOSHA QILISH';
  button.addEventListener('click',()=>play(v));

  body.append(eyebrow,heading,info,button);
  h.append(visual,body);

  return h;
}

function card(v){
  const el=document.createElement('article');
  el.className='cp-card';

  const thumb=document.createElement('button');
  thumb.className='cp-thumb';
  thumb.type='button';
  thumb.setAttribute(
    'aria-label',
    title(v)+' — tomosha qilish'
  );

  const img=document.createElement('img');
  img.src=image(v);
  img.alt='';
  img.loading='lazy';

  const icon=document.createElement('span');
  icon.className='cp-play';
  icon.textContent='▶';

  thumb.append(img,icon);
  thumb.addEventListener('click',()=>play(v));

  const body=document.createElement('div');
  body.className='cp-cardbody';

  const heading=document.createElement('p');
  heading.className='cp-cardtitle';
  heading.textContent=title(v);

  const small=document.createElement('div');
  small.className='cp-cardmeta';
  small.textContent=meta(v)||'F1 Uzbekistan TV';

  body.append(heading,small);
  el.append(thumb,body);

  return el;
}

function category(v){
  const t=String(
    (v.title||'')+' '+(v.title_uz||'')
  ).toLowerCase();

  if(/crash|collision|accident|fire|flames|avariya|yong.in/.test(t)){
    return 'crash';
  }

  if(/qualifying|pole|saralash|kvalifik/.test(t)){
    return 'qualifying';
  }

  if(/interview|react|press conference|intervyu|fikri/.test(t)){
    return 'interview';
  }

  if(/race|grand prix|gp|poyga|highlight|overtak/.test(t)){
    return 'race';
  }

  return 'other';
}

function row(name,items){
  if(!items.length)return null;

  const wrap=document.createElement('section');
  wrap.className='cp-row';

  const head=document.createElement('div');
  head.className='cp-rowhead';

  const heading=document.createElement('h3');
  heading.className='cp-rowtitle';
  heading.textContent=name;

  const arrows=document.createElement('div');
  arrows.className='cp-arrows';

  const prev=document.createElement('button');
  const next=document.createElement('button');

  for(const [b,label,txt] of [
    [prev,'Oldingi videolar','‹'],
    [next,'Keyingi videolar','›']
  ]){
    b.type='button';
    b.className='cp-arrow';
    b.setAttribute('aria-label',label);
    b.textContent=txt;
    arrows.append(b);
  }

  head.append(heading,arrows);

  const track=document.createElement('div');
  track.className='cp-track';

  for(const v of items){
    track.append(card(v));
  }

  prev.addEventListener('click',()=>{
    track.scrollBy({
      left:-track.clientWidth*.85,
      behavior:'smooth'
    });
  });

  next.addEventListener('click',()=>{
    track.scrollBy({
      left:track.clientWidth*.85,
      behavior:'smooth'
    });
  });

  wrap.append(head,track);
  return wrap;
}

function render(items){
  allVideos=items.filter(v=>v&&validId(v.id));

  const holder=root.querySelector('.cp-hero-holder');
  const rows=root.querySelector('.cp-rows');
  const status=root.querySelector('.cp-status');

  holder.replaceChildren();
  rows.replaceChildren();

  if(!allVideos.length){
    status.textContent='Hozircha videolar mavjud emas.';
    return;
  }

  status.textContent='';
  holder.append(hero(allVideos[0]));

  const configs=[
    ['🔥 So‘nggi videolar',allVideos.slice(1,13)],
    [
      '🏁 Saralash',
      allVideos.filter(v=>category(v)==='qualifying')
    ],
    [
      '🏎️ Poyga lavhalari',
      allVideos.filter(v=>category(v)==='race')
    ],
    [
      '💥 Avariyalar',
      allVideos.filter(v=>category(v)==='crash')
    ],
    [
      '🎤 Intervyular',
      allVideos.filter(v=>category(v)==='interview')
    ]
  ];

  for(const [name,vs] of configs){
    const r=row(name,vs);
    if(r)rows.append(r);
  }

  if(!rows.children.length){
    const note=document.createElement('div');
    note.className='cp-empty';
    note.textContent=
      'Yangi videolar qo‘shilganda bu yerda paydo bo‘ladi.';
    rows.append(note);
  }
}

async function load(){
  try{
    const res=await fetch(
      './videos.json?t='+Date.now(),
      {cache:'no-store'}
    );

    if(!res.ok){
      throw Error('HTTP '+res.status);
    }

    const data=await res.json();

    const items=Array.isArray(data)
      ?data
      :Array.isArray(data.videos)
        ?data.videos
        :[];

    render(items);

  }catch(err){
    root.querySelector('.cp-status').textContent=
      'Videolarni yuklashda xatolik: '+err.message;
  }
}

load();
setInterval(load,300000);

})();

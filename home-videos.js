(()=>{
'use strict';

if(document.getElementById('f1-cinema-premium'))return;

const ROTATE_MS=15*60*1000;
const REFRESH_MS=5*60*1000;
const PAGE_SIZE=4;

const style=document.createElement('style');

style.textContent=`
#f1-cinema-premium{
  --cp-red:#e10600;
  color:#fff;
  margin:22px 0;
  font-family:Arial,Helvetica,sans-serif;
}
#f1-cinema-premium *,
#f1-cinema-modal *{
  box-sizing:border-box;
}
#f1-cinema-premium .cp-shell{
  background:linear-gradient(140deg,#1b1b22,#0d0d11 70%);
  border:1px solid #34343c;
  border-radius:17px;
  padding:clamp(12px,2.5vw,22px);
  overflow:hidden;
}
#f1-cinema-premium .cp-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:20px;
}
#f1-cinema-premium .cp-logo{
  font-size:clamp(22px,3.6vw,32px);
  font-weight:900;
  letter-spacing:-1px;
  margin:0;
}
#f1-cinema-premium .cp-logo span{
  color:#ff3838;
}
#f1-cinema-premium .cp-sub{
  font-size:11px;
  color:#a5a5b0;
  margin-top:5px;
  line-height:1.5;
}
#f1-cinema-premium .cp-all{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:var(--cp-red);
  color:#fff;
  text-decoration:none;
  border-radius:9px;
  padding:10px 13px;
  font-weight:800;
  font-size:12px;
  white-space:nowrap;
  flex-shrink:0;
}
#f1-cinema-premium .cp-all:hover{
  background:#b90500;
}
#f1-cinema-premium .cp-sectionhead{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  margin-bottom:14px;
}
#f1-cinema-premium .cp-rowtitle{
  font-size:clamp(15px,2.5vw,19px);
  font-weight:900;
  margin:0;
}
#f1-cinema-premium .cp-timer{
  font-size:11px;
  color:#a8a8b2;
  text-align:right;
}
#f1-cinema-premium .cp-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
}
#f1-cinema-premium .cp-card{
  min-width:0;
  background:#111116;
  border:1px solid #363641;
  border-radius:14px;
  overflow:hidden;
  transition:border-color .2s,transform .2s;
}
#f1-cinema-premium .cp-card:hover{
  border-color:#e10600;
  transform:translateY(-2px);
}
#f1-cinema-premium .cp-thumb{
  position:relative;
  display:block;
  width:100%;
  aspect-ratio:16/9;
  padding:0;
  border:0;
  cursor:pointer;
  background:#151515;
  overflow:hidden;
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
  width:50px;
  height:50px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:#e10600;
  color:#fff;
  font-size:20px;
  box-shadow:0 4px 20px #0009;
}
#f1-cinema-premium .cp-cardbody{
  padding:13px;
}
#f1-cinema-premium .cp-platform{
  display:flex;
  align-items:center;
  gap:6px;
  color:#b7b7c0;
  font-size:11px;
  font-weight:700;
  margin-bottom:8px;
}
#f1-cinema-premium .cp-platformdot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#e10600;
  flex-shrink:0;
}
#f1-cinema-premium .cp-cardtitle{
  font-size:15px;
  font-weight:800;
  line-height:1.45;
  min-height:43px;
  margin:0;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
#f1-cinema-premium .cp-cardmeta{
  font-size:11px;
  color:#a2a2ad;
  margin-top:10px;
}
#f1-cinema-premium .cp-status{
  font-size:12px;
  color:#aaa;
  padding:12px 0;
}
#f1-cinema-premium .cp-status:empty{
  display:none;
}
#f1-cinema-premium .cp-video-cover{
  width:100%;
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  background:radial-gradient(
    circle at 50% 40%,
    #393942,
    #101014 75%
  );
  color:#fff;
}
#f1-cinema-premium .cp-video-logo{
  font-size:44px;
  font-weight:900;
  line-height:1;
}
#f1-cinema-premium .cp-video-label{
  font-size:12px;
  font-weight:900;
  letter-spacing:2px;
  color:#ff4a4a;
}
#f1-cinema-modal{
  position:fixed;
  inset:0;
  z-index:999999;
  background:rgba(0,0,0,.96);
  display:none;
  overflow-y:auto;
  padding:12px;
  align-items:flex-start;
  justify-content:center;
}
#f1-cinema-modal.cp-open{
  display:flex;
}
#f1-cinema-modal .cp-dialog{
  width:min(960px,100%);
  margin:auto;
  background:#111116;
  border:1px solid #33343d;
  border-radius:13px;
  padding:12px;
}
#f1-cinema-modal .cp-modalhead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:10px;
}
#f1-cinema-modal .cp-modaltitle{
  font-size:14px;
  font-weight:900;
  line-height:1.4;
  margin:0;
}
#f1-cinema-modal .cp-close{
  background:#e10600;
  color:#fff;
  border:0;
  border-radius:8px;
  padding:9px 12px;
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
#f1-cinema-modal .cp-frame.cp-vertical{
  width:min(420px,100%);
  aspect-ratio:9/16;
  max-height:75vh;
  margin:0 auto;
}
#f1-cinema-modal iframe,
#f1-cinema-modal video{
  width:100%;
  height:100%;
  border:0;
  display:block;
}
#f1-cinema-modal .cp-nexttitle{
  font-size:13px;
  font-weight:900;
  margin:15px 0 9px;
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
#f1-cinema-modal .cp-next-icon{
  width:90px;
  aspect-ratio:16/9;
  flex-shrink:0;
  display:grid;
  place-items:center;
  border-radius:5px;
  background:#111;
  font-size:25px;
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
  #f1-cinema-premium{
    margin:18px 0;
  }
  #f1-cinema-premium .cp-shell{
    padding:11px;
    border-radius:13px;
  }
  #f1-cinema-premium .cp-logo{
    font-size:22px;
  }
  #f1-cinema-premium .cp-sub{
    font-size:10px;
  }
  #f1-cinema-premium .cp-all{
    padding:9px 10px;
    font-size:10px;
  }
  #f1-cinema-premium .cp-grid{
    gap:10px;
  }
  #f1-cinema-premium .cp-card{
    border-radius:11px;
  }
  #f1-cinema-premium .cp-cardbody{
    padding:9px;
  }
  #f1-cinema-premium .cp-cardtitle{
    font-size:12px;
    min-height:35px;
  }
  #f1-cinema-premium .cp-platform{
    font-size:10px;
    margin-bottom:6px;
  }
  #f1-cinema-premium .cp-cardmeta{
    font-size:10px;
  }
  #f1-cinema-premium .cp-play{
    width:39px;
    height:39px;
    font-size:16px;
  }
  #f1-cinema-premium .cp-rowtitle{
    font-size:14px;
  }
  #f1-cinema-premium .cp-timer{
    font-size:10px;
  }
  #f1-cinema-premium .cp-video-logo{
    font-size:32px;
  }
  #f1-cinema-modal{
    padding:8px;
  }
  #f1-cinema-modal .cp-dialog{
    padding:9px;
  }
  #f1-cinema-modal .cp-nextlist{
    grid-template-columns:1fr;
  }
  #f1-cinema-modal .cp-next img,
  #f1-cinema-modal .cp-next-icon{
    width:100px;
  }
}
@media(max-width:380px){
  #f1-cinema-premium .cp-logo{
    font-size:19px;
  }
  #f1-cinema-premium .cp-all{
    font-size:9px;
    padding:8px;
  }
  #f1-cinema-premium .cp-cardtitle{
    font-size:11px;
  }
}
@media(prefers-reduced-motion:reduce){
  #f1-cinema-premium .cp-card{
    transition:none;
  }
}
`;

document.head.appendChild(style);

const root=document.createElement('section');
root.id='f1-cinema-premium';
root.setAttribute(
  'aria-label',
  'F1 Cinema video markazi'
);

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

    <div class="cp-sectionhead">
      <h3 class="cp-rowtitle">
        🔥 Eng qiziqarli videolar
      </h3>
      <div class="cp-timer">
        Har 15 daqiqada almashadi
      </div>
    </div>

    <div class="cp-grid"></div>

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
const grid=root.querySelector('.cp-grid');
const status=root.querySelector('.cp-status');

let allVideos=[];
let lastFocus=null;
let previousOverflow='';
let pageIndex=0;
let lastRotation=Date.now();

function decodeHTML(text){
  const el=document.createElement('textarea');
  el.innerHTML=String(text||'');
  return el.value;
}

function validId(id){
  return /^[A-Za-z0-9_-]{11}$/.test(String(id||''));
}

function platform(v){
  const p=String(
    v.platform||v.source||'youtube'
  ).toLowerCase();

  if(p==='facebook'||p==='fb')return 'facebook';
  if(p==='upload'||p==='local')return 'upload';
  if(p==='x'||p==='twitter')return 'x';

  return 'youtube';
}

function title(v){
  if(v.title_uz)return decodeHTML(v.title_uz);

  const raw=decodeHTML(v.title||'F1 videosi');
  const s=raw.toLowerCase();
  let gp='';

  const races=[
    [/united states|usa gp|austin/,'AQSH'],
    [/mexico/,'Meksika'],
    [/brazil|sao paulo|são paulo/,'Braziliya'],
    [/las vegas/,'Las-Vegas'],
    [/qatar/,'Qatar'],
    [/abu dhabi/,'Abu-Dabi'],
    [/monaco/,'Monako'],
    [/singapore/,'Singapur'],
    [/japan|suzuka/,'Yaponiya'],
    [/italy|monza/,'Italiya'],
    [/azerbaijan|baku/,'Ozarbayjon']
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
  if(/spin|spins/.test(s)){
    return gp+'🔄 Pilotning trassada aylanib ketishi';
  }
  if(/qualifying/.test(s)&&/highlight|best/.test(s)){
    return gp+'🏁 Saralashning eng qiziqarli lahzalari';
  }
  if(/qualifying/.test(s)){
    return gp+'⏱ Saralash natijalari va asosiy lahzalar';
  }
  if(/sprint/.test(s)&&/highlight/.test(s)){
    return gp+'⚡ Sprint poygasining eng yaxshi lahzalari';
  }
  if(/race/.test(s)&&/highlight/.test(s)){
    return gp+'🏎️ Poyganing eng qiziqarli lahzalari';
  }
  if(/interview|drivers react|driver reactions/.test(s)){
    return gp+'🎤 Pilotlar intervyusi';
  }
  if(/team radio|radio messages/.test(s)){
    return gp+'🎧 Pilotlarning radio suhbatlari';
  }
  if(/overtak/.test(s)){
    return gp+'⚡ Eng yaxshi quvib o‘tishlar';
  }

  return raw;
}

function image(v){
  const u=v.thumbnail||v.thumbnail_url||v.thumbnailUrl;

  if(
    typeof u==='string'&&
    (/^https:\/\//i.test(u)||/^\.\//.test(u))
  ){
    return u;
  }

  if(platform(v)==='youtube'&&validId(v.id)){
    return 'https://i.ytimg.com/vi/'
      +encodeURIComponent(v.id)
      +'/hqdefault.jpg';
  }

  return '';
}

function meta(v){
  let dateText='';
  const value=v.published||v.publishedAt;

  if(value){
    const d=new Date(value);
    if(!Number.isNaN(d.getTime())){
      dateText=d.toLocaleDateString('uz-UZ');
    }
  }

  return [v.channel||v.author||'',dateText]
    .filter(Boolean)
    .join(' · ');
}

function videoKey(v){
  return platform(v)+':'+String(v.id||v.url||'');
}

function embedURL(v){
  const p=platform(v);

  if(p==='youtube'){
    if(!validId(v.id))return '';

    return 'https://www.youtube-nocookie.com/embed/'
      +encodeURIComponent(v.id)
      +'?autoplay=1&playsinline=1&rel=0';
  }

  if(p==='facebook'){
    try{
      const u=new URL(String(v.url||''));

      if(![
        'facebook.com',
        'www.facebook.com',
        'm.facebook.com',
        'web.facebook.com'
      ].includes(u.hostname)){
        return '';
      }

      return 'https://www.facebook.com/plugins/video.php?href='
        +encodeURIComponent(u.href)
        +'&show_text=false&autoplay=true';
    }catch(e){
      return '';
    }
  }

  return '';
}

function validUploadURL(v){
  const url=String(
    v.video_url||v.videoUrl||v.url||''
  );

  try{
    const parsed=new URL(url);

    return (
      parsed.protocol==='https:' &&
      /\.(mp4|webm)(?:$|\?)/i.test(parsed.href)
    );
  }catch(e){
    return false;
  }
}

function closeModal(){
  if(!modal.classList.contains('cp-open'))return;

  modal.classList.remove('cp-open');
  frame.replaceChildren();
  frame.classList.remove('cp-vertical');
  document.body.style.overflow=previousOverflow;

  if(lastFocus&&lastFocus.isConnected){
    lastFocus.focus();
  }
}

close.addEventListener('click',closeModal);

modal.addEventListener('click',e=>{
  if(e.target===modal)closeModal();
});

document.addEventListener('keydown',e=>{
  if(
    e.key==='Escape'&&
    modal.classList.contains('cp-open')
  ){
    closeModal();
  }
});

function play(v){
  if(!modal.classList.contains('cp-open')){
    lastFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
  }

  modal.querySelector('.cp-modaltitle').textContent=title(v);

  frame.replaceChildren();

  const p=platform(v);

  frame.classList.toggle(
    'cp-vertical',
    p==='facebook'||(
      p==='upload'&&v.aspect_ratio==='9:16'
    )
  );

  modal.classList.add('cp-open');
  document.body.style.overflow='hidden';

  if(p==='upload'&&validUploadURL(v)){
    const video=document.createElement('video');

    video.src=v.video_url||v.videoUrl||v.url;
    video.controls=true;
    video.playsInline=true;
    video.preload='metadata';
    video.autoplay=true;

    frame.append(video);

    video.play().catch(()=>{});
  }else{
    const url=embedURL(v);

    if(url){
      const iframe=document.createElement('iframe');

      iframe.title=title(v);
      iframe.src=url;
      iframe.allow=
        'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe

(()=>{
  "use strict";
  const INTERVAL=10000;
  const css=`
  #f1-photo-gallery{width:100%;margin:24px 0;color:white;font-family:Arial,Helvetica,sans-serif}
  #f1-photo-gallery *{box-sizing:border-box}
  #f1-photo-gallery .fpg-heading{display:flex;align-items:center;gap:12px;margin:0 0 14px;font-size:clamp(19px,3vw,28px);font-weight:900;letter-spacing:.045em}
  #f1-photo-gallery .fpg-heading:before{content:"";display:block;width:5px;height:28px;background:#e10600;border-radius:4px}
  #f1-photo-gallery .fpg-stage{position:relative;aspect-ratio:16/9;overflow:hidden;background:#101014;border-radius:14px;cursor:zoom-in;box-shadow:0 12px 35px #0007}
  #f1-photo-gallery .fpg-image{display:block;width:100%;height:100%;object-fit:contain;opacity:1;transition:opacity .4s ease}
  #f1-photo-gallery .fpg-image.fpg-fade{opacity:.15}
  #f1-photo-gallery .fpg-shade{pointer-events:none;position:absolute;inset:30% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.28) 35%,rgba(0,0,0,.91))}
  #f1-photo-gallery .fpg-caption{position:absolute;left:clamp(15px,4%,45px);bottom:clamp(15px,5%,45px);right:15px;pointer-events:none;font-size:clamp(17px,3.5vw,42px);font-weight:900;line-height:1.14;letter-spacing:.025em;text-shadow:0 3px 15px #000,0 0 22px #0008;overflow-wrap:anywhere}
  #f1-photo-gallery .fpg-caption:after{content:"";display:block;width:clamp(55px,12vw,115px);height:4px;background:#e10600;margin-top:12px;border-radius:4px;box-shadow:0 0 14px #e1060099}
  #fpg-viewer{position:fixed;inset:0;z-index:2147483647;background:#000e;display:none;align-items:center;justify-content:center;padding:20px}
  #fpg-viewer.open{display:flex}#fpg-viewer img{max-width:100%;max-height:92vh;object-fit:contain}
  #fpg-viewer button{position:absolute;top:15px;right:15px;background:#e10600;border:0;color:white;font-size:30px;width:46px;height:46px;border-radius:50%;cursor:pointer}
  `;
  document.head.insertAdjacentHTML("beforeend",`<style>${css}</style>`);
  const root=document.getElementById("f1-photo-gallery");if(!root)return;
  root.innerHTML='<h2 class="fpg-heading">F1 FOTO GALEREYA</h2><div class="fpg-stage" role="button" tabindex="0" aria-label="Suratni kattalashtirish"><img class="fpg-image" alt="F1 galereya surati"><div class="fpg-shade"></div><div class="fpg-caption"></div></div>';
  const stage=root.querySelector(".fpg-stage"),img=root.querySelector(".fpg-image"),caption=root.querySelector(".fpg-caption");
  const viewer=document.createElement("div");viewer.id="fpg-viewer";viewer.innerHTML='<button type="button" aria-label="Yopish">×</button><img alt="Kattalashtirilgan surat">';document.body.appendChild(viewer);
  let photos=[],index=0,timer=null;
  function show(i){if(!photos.length)return;index=(i+photos.length)%photos.length;const p=photos[index];img.classList.add("fpg-fade");const preload=new Image();preload.onload=()=>{img.src=p.url;img.alt=p.title_uz;caption.textContent=p.title_uz;requestAnimationFrame(()=>img.classList.remove("fpg-fade"));};preload.onerror=()=>img.classList.remove("fpg-fade");preload.src=p.url;}
  function open(){if(!photos.length)return;viewer.querySelector("img").src=photos[index].url;viewer.querySelector("img").alt=photos[index].title_uz;viewer.classList.add("open");document.body.style.overflow="hidden";}
  function close(){viewer.classList.remove("open");document.body.style.overflow="";}
  stage.addEventListener("click",open);stage.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
  viewer.querySelector("button").addEventListener("click",close);viewer.addEventListener("click",e=>{if(e.target===viewer)close();});document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  fetch("/gallery-photos.json?v="+Date.now(),{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Gallery not found");return r.json();}).then(data=>{photos=Array.isArray(data)?data.filter(p=>p&&typeof p.url==="string"&&typeof p.title_uz==="string"):[];if(!photos.length){root.style.display="none";return;}show(0);if(photos.length>1)timer=setInterval(()=>{if(!viewer.classList.contains("open"))show(index+1);},INTERVAL);}).catch(()=>{root.style.display="none";});
})();

(() => {
  "use strict";

  const INTERVAL = 15000;
  const root = document.getElementById("f1-photo-gallery");
  if (!root) return;

  const css = `
    #f1-photo-gallery{width:100%;margin:24px 0;color:#fff;font-family:Arial,Helvetica,sans-serif}
    #f1-photo-gallery * ,#fpg-viewer *{box-sizing:border-box}
    #f1-photo-gallery .fpg-heading{display:flex;align-items:center;gap:12px;margin:0 0 14px;font-size:clamp(19px,3vw,28px);font-weight:900;letter-spacing:.045em}
    #f1-photo-gallery .fpg-heading::before{content:"";display:block;width:5px;height:28px;background:#e10600;border-radius:4px}
    #f1-photo-gallery .fpg-stage{position:relative;width:100%;overflow:hidden;background:#101014;border-radius:14px;cursor:pointer;box-shadow:0 12px 35px #0007}
    #f1-photo-gallery .fpg-stage:focus-visible{outline:3px solid #e10600;outline-offset:4px}
    #f1-photo-gallery .fpg-image{display:block;width:100%;height:auto;object-fit:contain;opacity:1;transition:opacity .45s ease}
    #f1-photo-gallery .fpg-image.fpg-fade{opacity:.15}
    #f1-photo-gallery .fpg-shade{position:absolute;inset:30% 0 0;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.25) 35%,rgba(0,0,0,.9))}
    #f1-photo-gallery .fpg-caption{position:absolute;left:clamp(15px,4%,45px);bottom:clamp(15px,5%,45px);right:15px;pointer-events:none;font-size:clamp(17px,3.5vw,42px);font-weight:900;line-height:1.14;letter-spacing:.025em;text-shadow:0 3px 15px #000,0 0 22px #0008;overflow-wrap:anywhere}
    #f1-photo-gallery .fpg-caption::after{content:"";display:block;width:clamp(55px,12vw,115px);height:4px;margin-top:12px;background:#e10600;border-radius:4px;box-shadow:0 0 14px #e1060099}
    #fpg-viewer{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.95);font-family:Arial,Helvetica,sans-serif;color:#fff}
    #fpg-viewer.open{display:flex}
    #fpg-viewer .fpg-panel{width:min(860px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;border:1px solid #353535;border-radius:15px;background:#111;box-shadow:0 20px 70px #000b;scrollbar-color:#e10600 #171717}
    #fpg-viewer .fpg-hero{display:block;width:100%;height:auto;max-height:60vh;object-fit:contain;background:#050505}
    #fpg-viewer .fpg-article{padding:clamp(18px,4vw,38px)}
    #fpg-viewer .fpg-tag{display:inline-block;color:#ff5752;font-size:12px;font-weight:900;letter-spacing:2px;margin-bottom:12px}
    #fpg-viewer .fpg-title{margin:0 0 16px;font-size:clamp(23px,4vw,37px);font-weight:900;line-height:1.2;overflow-wrap:anywhere}
    #fpg-viewer .fpg-title::after{content:"";display:block;width:85px;height:4px;margin-top:16px;background:#e10600;border-radius:3px}
    #fpg-viewer .fpg-meta{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0 0 22px;color:#aaa;font-size:12px}
    #fpg-viewer .fpg-body{color:#e5e5e5;font-size:clamp(15px,2vw,17px);line-height:1.85;overflow-wrap:anywhere;white-space:pre-line}
    #fpg-viewer .fpg-body p{margin:0 0 17px}
    #fpg-viewer .fpg-empty{padding:18px;border-left:3px solid #e10600;background:#1b1b1b;color:#bbb}
    #fpg-viewer .fpg-close{position:fixed;top:22px;right:22px;z-index:3;width:48px;height:48px;border:0;border-radius:50%;background:#e10600;color:#fff;font-size:31px;line-height:1;cursor:pointer;box-shadow:0 4px 20px #000a}
    #fpg-viewer .fpg-close:hover{background:#b90500}
    #fpg-viewer .fpg-close:focus-visible{outline:3px solid white;outline-offset:3px}
    @media(max-width:700px){
      #f1-photo-gallery .fpg-stage{border-radius:12px}
      #f1-photo-gallery .fpg-caption{left:17px;right:17px;bottom:17px;font-size:clamp(16px,4.5vw,26px)}
      #fpg-viewer{padding:0;align-items:stretch}
      #fpg-viewer .fpg-panel{width:100%;max-height:100dvh;border:0;border-radius:0}
      #fpg-viewer .fpg-hero{max-height:48vh}
      #fpg-viewer .fpg-close{top:12px;right:12px}
    }
    @media(prefers-reduced-motion:reduce){#f1-photo-gallery .fpg-image{transition:none}}
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  root.innerHTML = `
    <h2 class="fpg-heading">F1 STORIES</h2>
    <div class="fpg-stage" role="button" tabindex="0" aria-label="F1 Stories maqolasini o‘qish">
      <img class="fpg-image" alt="F1 Stories surati">
      <div class="fpg-shade"></div>
      <div class="fpg-caption"></div>
    </div>`;

  const stage = root.querySelector(".fpg-stage");
  const img = root.querySelector(".fpg-image");
  const caption = root.querySelector(".fpg-caption");

  const viewer = document.createElement("div");
  viewer.id = "fpg-viewer";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-labelledby", "fpg-article-title");
  viewer.innerHTML = `
    <button class="fpg-close" type="button" aria-label="Yopish">×</button>
    <div class="fpg-panel" tabindex="-1">
      <img class="fpg-hero" alt="">
      <article class="fpg-article">
        <span class="fpg-tag">F1 STORIES</span>
        <h2 class="fpg-title" id="fpg-article-title"></h2>
        <div class="fpg-meta"></div>
        <div class="fpg-body"></div>
      </article>
    </div>`;
  document.body.appendChild(viewer);

  const panel = viewer.querySelector(".fpg-panel");
  const viewerImg = viewer.querySelector(".fpg-hero");
  const viewerTitle = viewer.querySelector(".fpg-title");
  const viewerMeta = viewer.querySelector(".fpg-meta");
  const viewerBody = viewer.querySelector(".fpg-body");
  const closeButton = viewer.querySelector(".fpg-close");

  let photos = [];
  let index = 0;
  let displayedIndex = -1;
  let loadingId = 0;
  let previousOverflow = "";
  let previousFocus = null;

  function show(i) {
    if (!photos.length) return;
    const nextIndex = (i + photos.length) % photos.length;
    const photo = photos[nextIndex];
    const requestId = ++loadingId;
    img.classList.add("fpg-fade");
    const preload = new Image();
    preload.onload = () => {
      if (requestId !== loadingId) return;
      img.src = photo.url;
      img.alt = photo.title_uz;
      caption.textContent = photo.title_uz;
      index = nextIndex;
      displayedIndex = nextIndex;
      requestAnimationFrame(() => img.classList.remove("fpg-fade"));
    };
    preload.onerror = () => {
      if (requestId !== loadingId) return;
      console.warn("F1 Stories: surat yuklanmadi", photo.url);
      img.classList.remove("fpg-fade");
    };
    preload.src = photo.url;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("uz-UZ", {day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Tashkent"});
  }

  function open() {
    if (displayedIndex < 0) return;
    const photo = photos[displayedIndex];
    viewerImg.src = photo.url;
    viewerImg.alt = photo.title_uz;
    viewerTitle.textContent = photo.title_uz;
    viewerMeta.replaceChildren();
    const date = formatDate(photo.published);
    if (date) {
      const dateEl = document.createElement("span");
      dateEl.textContent = "📅 " + date;
      viewerMeta.append(dateEl);
    }
    if (typeof photo.source === "string" && photo.source.trim()) {
      const sourceEl = document.createElement("span");
      sourceEl.textContent = "Manba: " + photo.source.trim();
      viewerMeta.append(sourceEl);
    }
    viewerBody.replaceChildren();
    const article = typeof photo.article_uz === "string" ? photo.article_uz.trim() : "";
    if (article) {
      article.split(/\n\s*\n/).filter(Boolean).forEach(part => {
        const p = document.createElement("p");
        p.textContent = part.trim();
        viewerBody.append(p);
      });
    } else {
      const notice = document.createElement("div");
      notice.className = "fpg-empty";
      notice.textContent = "Ushbu hikoyaning to‘liq maqolasi hali kiritilmagan.";
      viewerBody.append(notice);
    }
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.scrollTop = 0;
    viewer.classList.add("open");
    closeButton.focus();
  }

  function close() {
    if (!viewer.classList.contains("open")) return;
    viewer.classList.remove("open");
    document.body.style.overflow = previousOverflow;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    else stage.focus();
  }

  stage.addEventListener("click", open);
  stage.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  closeButton.addEventListener("click", close);
  viewer.addEventListener("click", event => {
    if (event.target === viewer) close();
  });
  document.addEventListener("keydown", event => {
    if (!viewer.classList.contains("open")) return;
    if (event.key === "Escape") { close(); return; }
    if (event.key === "Tab") {
      // Modal oynadan tashqariga klaviatura fokusini chiqarmaslik.
      event.preventDefault();
      closeButton.focus();
    }
  });

  fetch("/gallery-photos.json?v=" + Date.now(), {cache:"no-store"})
    .then(response => {
      if (!response.ok) throw new Error("F1 Stories ma'lumotlari topilmadi: HTTP " + response.status);
      return response.json();
    })
    .then(data => {
      photos = Array.isArray(data) ? data.filter(photo =>
        photo && typeof photo.url === "string" && photo.url.trim() &&
        typeof photo.title_uz === "string" && photo.title_uz.trim()
      ) : [];
      if (!photos.length) { root.style.display = "none"; return; }
      show(0);
      if (photos.length > 1) {
        setInterval(() => {
          if (!viewer.classList.contains("open") && !document.hidden) show(index + 1);
        }, INTERVAL);
      }
    })
    .catch(error => {
      console.error("F1 Stories:", error);
      root.style.display = "none";
    });
})();

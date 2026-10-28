(() => {
  "use strict";

  const INTERVAL = 15000;
  const root = document.getElementById("f1-photo-gallery");
  if (!root) return;

  const css = `
    #f1-photo-gallery {
      width: 100%;
      margin: 24px 0;
      color: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }

    #f1-photo-gallery *,
    #fpg-viewer * {
      box-sizing: border-box;
    }

    #f1-photo-gallery .fpg-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 14px;
      font-size: clamp(19px, 3vw, 28px);
      font-weight: 900;
      letter-spacing: .045em;
    }

    #f1-photo-gallery .fpg-heading::before {
      content: "";
      width: 5px;
      height: 28px;
      background: #e10600;
      border-radius: 4px;
    }

    #f1-photo-gallery .fpg-stage {
      position: relative;
      width: 100%;
      overflow: hidden;
      background: #101014;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 12px 35px #0007;
    }

    #f1-photo-gallery .fpg-stage:focus-visible {
      outline: 3px solid #e10600;
      outline-offset: 4px;
    }

    #f1-photo-gallery .fpg-image {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
      transition: opacity .45s ease;
    }

    #f1-photo-gallery .fpg-image.fpg-fade {
      opacity: .15;
    }

    #f1-photo-gallery .fpg-shade {
      position: absolute;
      inset: 30% 0 0;
      pointer-events: none;
      background: linear-gradient(
        transparent,
        rgba(0, 0, 0, .25) 35%,
        rgba(0, 0, 0, .9)
      );
    }

    #f1-photo-gallery .fpg-caption {
      position: absolute;
      left: clamp(15px, 4%, 45px);
      bottom: clamp(15px, 5%, 45px);
      right: 15px;
      pointer-events: none;
      font-size: clamp(17px, 3.5vw, 42px);
      font-weight: 900;
      line-height: 1.14;
      text-shadow: 0 3px 15px #000, 0 0 22px #0008;
      overflow-wrap: anywhere;
    }

    #f1-photo-gallery .fpg-caption::after {
      content: "";
      display: block;
      width: clamp(55px, 12vw, 115px);
      height: 4px;
      margin-top: 12px;
      background: #e10600;
      border-radius: 4px;
    }

    #fpg-viewer {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0, 0, 0, .96);
      font-family: Arial, Helvetica, sans-serif;
      color: #fff;
    }

    #fpg-viewer.open {
      display: flex;
    }

    #fpg-viewer .fpg-panel {
      width: min(940px, 100%);
      max-height: calc(100dvh - 36px);
      overflow-y: auto;
      overscroll-behavior: contain;
      border: 1px solid #34343a;
      border-radius: 20px;
      background: #0e0e11;
      box-shadow: 0 24px 100px #000e;
      scrollbar-color: #e10600 #171717;
    }

    #fpg-viewer .fpg-hero-wrap {
      position: relative;
      background: #030303;
    }

    #fpg-viewer .fpg-hero {
      display: block;
      width: 100%;
      max-height: 64vh;
      object-fit: contain;
    }

    #fpg-viewer .fpg-hero-wrap::after {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: 7px;
      background: linear-gradient(
        90deg,
        #e10600,
        #9c100e 45%,
        transparent
      );
    }

    #fpg-viewer .fpg-article {
      padding: clamp(24px, 5vw, 58px)
               clamp(20px, 6vw, 70px) 28px;
      background:
        radial-gradient(
          ellipse at 100% 0%,
          #32100e55,
          transparent 55%
        ),
        #101013;
    }

    #fpg-viewer .fpg-eyebrow {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 22px;
      color: #ff5550;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 2.8px;
    }

    #fpg-viewer .fpg-eyebrow::before {
      content: "";
      width: 27px;
      height: 3px;
      background: #e10600;
    }

    #fpg-viewer .fpg-title {
      margin: 0 0 22px;
      font-size: clamp(27px, 5.4vw, 48px);
      font-weight: 900;
      line-height: 1.12;
      letter-spacing: -.035em;
      overflow-wrap: anywhere;
    }

    #fpg-viewer .fpg-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 20px;
      margin: 0 0 28px;
      padding: 17px 0;
      border-top: 1px solid #33333a;
      border-bottom: 1px solid #33333a;
      color: #b5b5be;
      font-size: 13px;
    }

    #fpg-viewer .fpg-meta span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    #fpg-viewer .fpg-body {
      max-width: 720px;
      margin: 0 auto;
      color: #ededf0;
      font-size: clamp(17px, 2.3vw, 19px);
      line-height: 1.95;
      overflow-wrap: anywhere;
    }

    #fpg-viewer .fpg-body p {
      margin: 0 0 25px;
      white-space: pre-line;
    }

    #fpg-viewer .fpg-body p:first-child:not(.fpg-empty) {
      font-size: clamp(19px, 2.6vw, 22px);
      font-weight: 600;
      line-height: 1.8;
      color: #fff;
      border-left: 4px solid #e10600;
      padding: 6px 0 6px 20px;
    }

    #fpg-viewer .fpg-empty {
      padding: 22px;
      border-left: 4px solid #e10600;
      border-radius: 0 10px 10px 0;
      background: #1b1b20;
      color: #bbb;
      font-size: 16px;
    }

    #fpg-viewer .fpg-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 30px;
      padding-top: 24px;
      border-top: 1px solid #34343a;
    }

    #fpg-viewer .fpg-sign {
      color: #fff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1.8px;
    }

    #fpg-viewer .fpg-sign b {
      color: #ff514b;
    }

    #fpg-viewer .fpg-share {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 12px 16px;
      border: 1px solid #e10600;
      border-radius: 9px;
      background: #e10600;
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }

    #fpg-viewer .fpg-share:hover {
      background: #b90500;
    }

    #fpg-viewer .fpg-close {
      position: fixed;
      top: 22px;
      right: 22px;
      z-index: 3;
      width: 50px;
      height: 50px;
      border: 0;
      border-radius: 50%;
      background: #e10600;
      color: #fff;
      font-size: 32px;
      cursor: pointer;
      box-shadow: 0 4px 20px #000a;
    }

    #fpg-viewer .fpg-close:focus-visible,
    #fpg-viewer .fpg-share:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 3px;
    }

    @media (max-width: 700px) {
      #f1-photo-gallery .fpg-stage {
        border-radius: 12px;
      }

      #f1-photo-gallery .fpg-caption {
        left: 17px;
        right: 17px;
        bottom: 17px;
        font-size: clamp(16px, 4.5vw, 26px);
      }

      #fpg-viewer {
        padding: 0;
        align-items: stretch;
      }

      #fpg-viewer .fpg-panel {
        width: 100%;
        max-height: 100dvh;
        border: 0;
        border-radius: 0;
      }

      #fpg-viewer .fpg-hero {
        max-height: 52vh;
      }

      #fpg-viewer .fpg-close {
        top: 12px;
        right: 12px;
        width: 48px;
        height: 48px;
      }

      #fpg-viewer .fpg-article {
        padding: 30px 22px 26px;
      }

      #fpg-viewer .fpg-meta {
        gap: 9px 15px;
      }

      #fpg-viewer .fpg-body {
        line-height: 1.85;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #f1-photo-gallery .fpg-image {
        transition: none;
      }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  root.innerHTML = `
    <h2 class="fpg-heading">F1 STORIES</h2>
    <div
      class="fpg-stage"
      role="button"
      tabindex="0"
      aria-label="F1 Stories maqolasini o‘qish"
    >
      <img class="fpg-image" alt="F1 Stories surati">
      <div class="fpg-shade"></div>
      <div class="fpg-caption"></div>
    </div>
  `;

  const stage = root.querySelector(".fpg-stage");
  const img = root.querySelector(".fpg-image");
  const caption = root.querySelector(".fpg-caption");

  const viewer = document.createElement("div");

  viewer.id = "fpg-viewer";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-labelledby", "fpg-article-title");

  viewer.innerHTML = `
    <button
      class="fpg-close"
      type="button"
      aria-label="Yopish"
    >×</button>

    <div class="fpg-panel" tabindex="-1">
      <div class="fpg-hero-wrap">
        <img class="fpg-hero" alt="">
      </div>

      <article class="fpg-article">
        <div class="fpg-eyebrow">
          F1 STORIES · MAXSUS MAQOLA
        </div>

        <h2
          class="fpg-title"
          id="fpg-article-title"
        ></h2>

        <div class="fpg-meta"></div>

        <div class="fpg-body"></div>

        <div class="fpg-bottom">
          <span class="fpg-sign">
            <b>F1</b> UZBEKISTAN TV · STORIES
          </span>

          <button
            type="button"
            class="fpg-share"
          >
            ↗ Ulashish
          </button>
        </div>
      </article>
    </div>
  `;

  document.body.appendChild(viewer);

  const panel = viewer.querySelector(".fpg-panel");
  const viewerImg = viewer.querySelector(".fpg-hero");
  const viewerTitle = viewer.querySelector(".fpg-title");
  const viewerMeta = viewer.querySelector(".fpg-meta");
  const viewerBody = viewer.querySelector(".fpg-body");
  const closeButton = viewer.querySelector(".fpg-close");
  const shareButton = viewer.querySelector(".fpg-share");

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

      requestAnimationFrame(() => {
        img.classList.remove("fpg-fade");
      });
    };

    preload.onerror = () => {
      if (requestId !== loadingId) return;

      console.warn(
        "F1 Stories: surat yuklanmadi",
        photo.url
      );

      img.classList.remove("fpg-fade");
    };

    preload.src = photo.url;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Tashkent"
    });
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

    const articleWords =
      typeof photo.article_uz === "string"
        ? photo.article_uz
            .trim()
            .split(/\s+/)
            .filter(Boolean).length
        : 0;

    if (articleWords) {
      const readEl = document.createElement("span");

      readEl.textContent =
        "◷ " +
        Math.max(1, Math.ceil(articleWords / 180)) +
        " daqiqa o‘qish";

      viewerMeta.append(readEl);
    }

    if (
      typeof photo.source === "string" &&
      photo.source.trim()
    ) {
      const sourceEl = document.createElement("span");

      sourceEl.textContent =
        "Manba: " + photo.source.trim();

      viewerMeta.append(sourceEl);
    }

    viewerBody.replaceChildren();

    const article =
      typeof photo.article_uz === "string"
        ? photo.article_uz.trim()
        : "";

    if (article) {
      article
        .split(/\n\s*\n/)
        .filter(Boolean)
        .forEach(part => {
          const p = document.createElement("p");
          p.textContent = part.trim();
          viewerBody.append(p);
        });
    } else {
      const notice = document.createElement("div");

      notice.className = "fpg-empty";

      notice.textContent =
        "Ushbu hikoyaning to‘liq maqolasi hali kiritilmagan.";

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

    if (
      previousFocus &&
      previousFocus.isConnected
    ) {
      previousFocus.focus();
    } else {
      stage.focus();
    }
  }

  stage.addEventListener("click", open);

  stage.addEventListener("keydown", event => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      open();
    }
  });

  closeButton.addEventListener("click", close);

  shareButton.addEventListener("click", async () => {
    const photo = photos[displayedIndex];

    if (!photo) return;

    const shareData = {
      title: photo.title_uz,
      text: photo.title_uz,
      url: location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          location.href
        );

        shareButton.textContent =
          "✓ Havola nusxalandi";

        setTimeout(() => {
          shareButton.textContent = "↗ Ulashish";
        }, 2000);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Ulashish:", error);
      }
    }
  });

  viewer.addEventListener("click", event => {
    if (event.target === viewer) close();
  });

  document.addEventListener("keydown", event => {
    if (!viewer.classList.contains("open")) return;

    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      closeButton.focus();
    }
  });

  fetch(
    "/gallery-photos.json?v=" + Date.now(),
    { cache: "no-store" }
  )
    .then(response => {
      if (!response.ok) {
        throw new Error(
          "F1 Stories ma'lumotlari topilmadi: HTTP " +
          response.status
        );
      }

      return response.json();
    })
    .then(data => {
      photos = Array.isArray(data)
        ? data.filter(photo =>
            photo &&
            typeof photo.url === "string" &&
            photo.url.trim() &&
            typeof photo.title_uz === "string" &&
            photo.title_uz.trim()
          )
        : [];

      if (!photos.length) {
        root.style.display = "none";
        return;
      }

      show(0);

      if (photos.length > 1) {
        setInterval(() => {
          if (
            !viewer.classList.contains("open") &&
            !document.hidden
          ) {
            show(index + 1);
          }
        }, INTERVAL);
      }
    })
    .catch(error => {
      console.error("F1 Stories:", error);
      root.style.display = "none";
    });
})();

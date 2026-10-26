(() => {
  "use strict";

  const INTERVAL = 15000;

  const css = `
    #f1-photo-gallery {
      width: 100%;
      margin: 24px 0;
      color: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }

    #f1-photo-gallery * {
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
      display: block;
      width: 5px;
      height: 28px;
      background: #e10600;
      border-radius: 4px;
    }

    /* SURAT O'LCHAMIGA AVTOMATIK MOSLASHADI */

    #f1-photo-gallery .fpg-stage {
      position: relative;
      width: 100%;
      height: auto;
      overflow: hidden;
      background: #101014;
      border-radius: 14px;
      cursor: zoom-in;
      box-shadow: 0 12px 35px #0007;
    }

    #f1-photo-gallery .fpg-image {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
      opacity: 1;
      transition: opacity .45s ease;
    }

    #f1-photo-gallery .fpg-image.fpg-fade {
      opacity: .15;
    }

    /* SARLAVHA ORQASIDAGI GRADIENT */

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

    /* SURAT SARLAVHASI */

    #f1-photo-gallery .fpg-caption {
      position: absolute;
      left: clamp(15px, 4%, 45px);
      bottom: clamp(15px, 5%, 45px);
      right: 15px;
      pointer-events: none;
      font-size: clamp(17px, 3.5vw, 42px);
      font-weight: 900;
      line-height: 1.14;
      letter-spacing: .025em;
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
      box-shadow: 0 0 14px #e1060099;
    }

    /* KATTALASHTIRILGAN SURAT */

    #fpg-viewer {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, .94);
    }

    #fpg-viewer.open {
      display: flex;
    }

    #fpg-viewer img {
      display: block;
      max-width: 100%;
      max-height: 92vh;
      object-fit: contain;
    }

    /* KATTALASHTIRILGAN SURAT SARLAVHASI */

    #fpg-viewer .fpg-viewer-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 65px 25px 30px;
      background: linear-gradient(
        transparent,
        rgba(0, 0, 0, .9)
      );
      color: #fff;
      font-size: clamp(18px, 4vw, 36px);
      font-weight: 900;
      line-height: 1.2;
      text-shadow: 0 3px 12px #000;
      pointer-events: none;
      overflow-wrap: anywhere;
      text-align: left;
    }

    #fpg-viewer .fpg-viewer-caption::after {
      content: "";
      display: block;
      width: 85px;
      height: 4px;
      margin-top: 12px;
      background: #e10600;
      border-radius: 3px;
      box-shadow: 0 0 14px #e1060099;
    }

    /* YOPISH TUGMASI */

    #fpg-viewer button {
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 2;
      width: 46px;
      height: 46px;
      border: 0;
      border-radius: 50%;
      background: #e10600;
      color: #fff;
      font-size: 30px;
      cursor: pointer;
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

      #fpg-viewer .fpg-viewer-caption {
        padding: 60px 20px 28px;
        font-size: clamp(18px, 5vw, 26px);
      }
    }
  `;

  const root = document.getElementById("f1-photo-gallery");

  if (!root) return;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  root.innerHTML = `
    <h2 class="fpg-heading">F1 FOTO GALEREYA</h2>

    <div
      class="fpg-stage"
      role="button"
      tabindex="0"
      aria-label="Suratni kattalashtirish"
    >
      <img
        class="fpg-image"
        alt="F1 galereya surati"
      >

      <div class="fpg-shade"></div>
      <div class="fpg-caption"></div>
    </div>
  `;

  const stage = root.querySelector(".fpg-stage");
  const img = root.querySelector(".fpg-image");
  const caption = root.querySelector(".fpg-caption");

  const viewer = document.createElement("div");
  viewer.id = "fpg-viewer";

  viewer.innerHTML = `
    <button type="button" aria-label="Yopish">×</button>
    <img alt="Kattalashtirilgan surat">
    <div class="fpg-viewer-caption"></div>
  `;

  document.body.appendChild(viewer);

  const viewerImg = viewer.querySelector("img");
  const viewerCaption = viewer.querySelector(".fpg-viewer-caption");
  const closeButton = viewer.querySelector("button");

  let photos = [];
  let index = 0;
  let displayedIndex = -1;
  let loadingId = 0;
  let timer = null;
  let previousOverflow = "";

  /* SURATNI KO'RSATISH */

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

      console.warn("F1 galereya: surat yuklanmadi", photo.url);
      img.classList.remove("fpg-fade");
    };

    preload.src = photo.url;
  }

  /* SURATNI KATTALASHTIRISH */

  function open() {
    if (displayedIndex < 0) return;

    const photo = photos[displayedIndex];

    viewerImg.src = photo.url;
    viewerImg.alt = photo.title_uz;
    viewerCaption.textContent = photo.title_uz;

    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    viewer.classList.add("open");
    closeButton.focus();
  }

  /* KATTALASHTIRILGAN OYNANI YOPISH */

  function close() {
    if (!viewer.classList.contains("open")) return;

    viewer.classList.remove("open");
    document.body.style.overflow = previousOverflow;
    stage.focus();
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
    if (event.target === viewer) {
      close();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      close();
    }
  });

  /* GALEREYA MA'LUMOTLARINI YUKLASH */

  fetch("/gallery-photos.json?v=" + Date.now(), {
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Galereya ma'lumotlari topilmadi");
      }

      return response.json();
    })
    .then(data => {
      photos = Array.isArray(data)
        ? data.filter(photo =>
            photo &&
            typeof photo.url === "string" &&
            photo.url.trim() !== "" &&
            typeof photo.title_uz === "string"
          )
        : [];

      if (!photos.length) {
        root.style.display = "none";
        return;
      }

      show(0);

      /* HAR 15 SONIYADA AVTOMATIK ALMASHISH */

      if (photos.length > 1) {
        timer = setInterval(() => {
          if (!viewer.classList.contains("open")) {
            show(index + 1);
          }
        }, INTERVAL);
      }
    })
    .catch(error => {
      console.error("F1 foto galereya:", error);
      root.style.display = "none";
    });
})();

(() => {
  "use strict";

  if (document.getElementById("f1-cinema-premium")) return;

  const ROTATE_MS = 15000;
  const REFRESH_MS = 5 * 60 * 1000;

  const thumbnails = new Map();
  const thumbnailJobs = new Map();

  let videos = [];
  let currentIndex = 0;
  let activeVideo = null;
  let previousOverflow = "";
  let lastFocus = null;
  let renderToken = 0;
  let modalIndex = 0;
  let loading = false;

  // ==========================================
  // DIZAYN
  // ==========================================

  const style = document.createElement("style");

  style.textContent = `
    #f1-cinema-premium,
    #f1-cinema-modal {
      font-family: Arial, Helvetica, sans-serif;
      color: #fff;
    }

    #f1-cinema-premium *,
    #f1-cinema-modal * {
      box-sizing: border-box;
    }

    #f1-cinema-premium {
      width: 100%;
      margin: 24px 0;
    }

    #f1-cinema-premium .cp-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px;
      font-size: clamp(21px, 4vw, 30px);
      font-weight: 900;
    }

    #f1-cinema-premium .cp-heading::before {
      content: "";
      display: block;
      width: 6px;
      height: 34px;
      background: #e10600;
      border-radius: 4px;
    }

    /* GALEREYA OYNASI */

    #f1-cinema-premium .cp-gallery {
      position: relative;
      width: 100%;
      overflow: hidden;
      border: 1px solid #34343c;
      border-radius: 16px;
      background: #101014;
      box-shadow: 0 12px 35px #0007;
    }

    #f1-cinema-premium .cp-stage {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 250px;
      max-height: 75vh;
      padding: 0;
      border: 0;
      background: #101014;
      cursor: pointer;
      overflow: hidden;
    }

    /*
      MUHIM:
      object-fit: contain videoni kesmaydi.
      Oyna vertikal yoki gorizontal formatga
      qarab avtomatik moslashadi.
    */

    #f1-cinema-premium .cp-stage.cp-landscape {
      aspect-ratio: 16 / 9;
    }

    #f1-cinema-premium .cp-stage.cp-portrait {
      aspect-ratio: 9 / 16;
      width: min(100%, 430px);
      max-height: 75vh;
      margin: 0 auto;
    }

    #f1-cinema-premium .cp-stage.cp-square {
      aspect-ratio: 1 / 1;
      width: min(100%, 650px);
      margin: 0 auto;
    }

    #f1-cinema-premium .cp-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #101014;
      transition: opacity .35s ease;
    }

    #f1-cinema-premium .cp-image.cp-fade {
      opacity: 0;
    }

    #f1-cinema-premium .cp-placeholder {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: radial-gradient(
        circle,
        #33333c,
        #101014
      );
      color: #ccc;
      font-size: 15px;
      font-weight: 800;
      text-align: center;
    }

    #f1-cinema-premium .cp-shade {
      position: absolute;
      inset: 45% 0 0;
      background: linear-gradient(
        transparent,
        rgba(0, 0, 0, .35),
        rgba(0, 0, 0, .9)
      );
      pointer-events: none;
    }

    #f1-cinema-premium .cp-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #e10600;
      color: #fff;
      font-size: 28px;
      box-shadow: 0 5px 25px #0009;
      pointer-events: none;
    }

    #f1-cinema-premium .cp-counter {
      position: absolute;
      top: 14px;
      right: 14px;
      padding: 8px 13px;
      border-radius: 25px;
      background: #000b;
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      pointer-events: none;
    }

    #f1-cinema-premium .cp-caption {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      color: #fff;
      font-size: clamp(17px, 3vw, 29px);
      font-weight: 900;
      line-height: 1.25;
      text-align: left;
      text-shadow: 0 3px 12px #000;
      pointer-events: none;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #f1-cinema-premium .cp-caption::after {
      content: "";
      display: block;
      width: 85px;
      height: 4px;
      margin-top: 10px;
      border-radius: 4px;
      background: #e10600;
    }

    /* GALEREYA BOSHQARUVI */

    #f1-cinema-premium .cp-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      background: #17171d;
    }

    #f1-cinema-premium .cp-arrows {
      display: flex;
      gap: 9px;
    }

    #f1-cinema-premium .cp-arrow {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 1px solid #45454f;
      border-radius: 9px;
      background: #24242c;
      color: #fff;
      font-size: 23px;
      font-weight: 900;
      cursor: pointer;
    }

    #f1-cinema-premium .cp-arrow:hover {
      border-color: #e10600;
      background: #e10600;
    }

    #f1-cinema-premium .cp-dots {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }

    #f1-cinema-premium .cp-dot {
      width: 8px;
      height: 8px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: #666;
      cursor: pointer;
    }

    #f1-cinema-premium .cp-dot.cp-active {
      width: 21px;
      border-radius: 6px;
      background: #e10600;
    }

    #f1-cinema-premium .cp-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 14px;
    }

    #f1-cinema-premium .cp-info {
      color: #aaa;
      font-size: 12px;
    }

    #f1-cinema-premium .cp-all {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 11px 14px;
      border-radius: 9px;
      background: #e10600;
      color: #fff;
      text-decoration: none;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    #f1-cinema-premium .cp-status {
      padding: 10px 0;
      color: #aaa;
      font-size: 12px;
    }

    #f1-cinema-premium .cp-status:empty {
      display: none;
    }

    /* VIDEO OCHILADIGAN OYNA */

    #f1-cinema-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 12px;
      overflow-y: auto;
      background: rgba(0, 0, 0, .97);
    }

    #f1-cinema-modal.cp-open {
      display: flex;
    }

    #f1-cinema-modal .cp-dialog {
      width: min(1000px, 100%);
      margin: auto;
      padding: 13px;
      border: 1px solid #33343d;
      border-radius: 14px;
      background: #111116;
    }

    #f1-cinema-modal .cp-modalhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    #f1-cinema-modal .cp-modaltitle {
      margin: 0;
      font-size: clamp(14px, 2.5vw, 19px);
      font-weight: 900;
      line-height: 1.4;
    }

    #f1-cinema-modal .cp-close {
      flex-shrink: 0;
      padding: 10px 13px;
      border: 0;
      border-radius: 8px;
      background: #e10600;
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
    }

    #f1-cinema-modal .cp-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border-radius: 9px;
      background: #000;
    }

    #f1-cinema-modal .cp-frame.cp-vertical {
      width: min(420px, 100%);
      aspect-ratio: 9 / 16;
      max-height: 75vh;
      margin: 0 auto;
    }

    #f1-cinema-modal .cp-frame.cp-square {
      width: min(650px, 100%);
      aspect-ratio: 1 / 1;
      margin: 0 auto;
    }

    #f1-cinema-modal video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }

    #f1-cinema-modal .cp-navigation {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }

    #f1-cinema-modal .cp-nav {
      flex: 1;
      padding: 12px;
      border: 1px solid #393944;
      border-radius: 8px;
      background: #22222a;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    #f1-cinema-modal .cp-nav:hover {
      border-color: #e10600;
    }

    @media (max-width: 700px) {
      #f1-cinema-premium .cp-gallery {
        border-radius: 12px;
      }

      #f1-cinema-premium .cp-stage {
        min-height: 200px;
      }

      #f1-cinema-premium .cp-stage.cp-portrait {
        width: min(100%, 340px);
        max-height: 70vh;
      }

      #f1-cinema-premium .cp-caption {
        left: 15px;
        right: 15px;
        bottom: 15px;
        font-size: 17px;
      }

      #f1-cinema-premium .cp-play {
        width: 56px;
        height: 56px;
        font-size: 23px;
      }

      #f1-cinema-premium .cp-info {
        font-size: 10px;
      }

      #f1-cinema-premium .cp-all {
        padding: 10px;
        font-size: 11px;
      }

      #f1-cinema-premium .cp-arrow {
        width: 35px;
        height: 35px;
      }

      #f1-cinema-premium .cp-controls {
        padding: 9px;
      }

      #f1-cinema-modal {
        padding: 7px;
      }

      #f1-cinema-modal .cp-dialog {
        padding: 9px;
      }
    }
  `;

  document.head.appendChild(style);

  // ==========================================
  // ASOSIY BLOK
  // ==========================================

  const root = document.createElement("section");

  root.id = "f1-cinema-premium";
  root.setAttribute(
    "aria-label",
    "F1 Cinema video galereyasi"
  );

  root.innerHTML = `
    <h2 class="cp-heading">
      🎬 F1 CINEMA
    </h2>

    <div class="cp-gallery">

      <button
        type="button"
        class="cp-stage cp-landscape"
        aria-label="Videoni tomosha qilish"
      >
        <div class="cp-placeholder">
          Videolar yuklanmoqda...
        </div>

        <img
          class="cp-image"
          alt=""
          style="display:none"
        >

        <div class="cp-shade"></div>

        <div class="cp-play">▶</div>

        <div class="cp-counter"></div>

        <div class="cp-caption"></div>
      </button>

      <div class="cp-controls">
        <div class="cp-arrows">
          <button
            type="button"
            class="cp-arrow cp-prev"
            aria-label="Oldingi video"
          >‹</button>

          <button
            type="button"
            class="cp-arrow cp-next"
            aria-label="Keyingi video"
          >›</button>
        </div>

        <div class="cp-dots"></div>
      </div>
    </div>

    <div class="cp-footer">
      <span class="cp-info">
        Videolar har 15 soniyada almashadi
      </span>

      <a class="cp-all" href="./videos.html">
        Barcha videolar →
      </a>
    </div>

    <div class="cp-status" role="status"></div>
  `;

  const target = document.querySelector(
    ".calendar-section"
  );

  if (target) {
    target.before(root);
  } else {
    (
      document.querySelector("main") ||
      document.body
    ).appendChild(root);
  }

  const stage = root.querySelector(".cp-stage");
  const imageElement = root.querySelector(".cp-image");
  const placeholder = root.querySelector(".cp-placeholder");
  const caption = root.querySelector(".cp-caption");
  const counter = root.querySelector(".cp-counter");
  const dots = root.querySelector(".cp-dots");
  const status = root.querySelector(".cp-status");

  const previousButton = root.querySelector(".cp-prev");
  const nextButton = root.querySelector(".cp-next");

  // ==========================================
  // VIDEO MODAL
  // ==========================================

  const modal = document.createElement("div");

  modal.id = "f1-cinema-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  modal.innerHTML = `
    <div class="cp-dialog">
      <div class="cp-modalhead">
        <h3 class="cp-modaltitle"></h3>

        <button
          type="button"
          class="cp-close"
        >
          ✕ Yopish
        </button>
      </div>

      <div class="cp-frame"></div>

      <div class="cp-navigation">
        <button
          type="button"
          class="cp-nav cp-modal-prev"
        >
          ← Oldingi video
        </button>

        <button
          type="button"
          class="cp-nav cp-modal-next"
        >
          Keyingi video →
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const frame = modal.querySelector(".cp-frame");
  const modalTitle = modal.querySelector(".cp-modaltitle");
  const closeButton = modal.querySelector(".cp-close");

  const modalPrevious = modal.querySelector(".cp-modal-prev");
  const modalNext = modal.querySelector(".cp-modal-next");

  // ==========================================
  // VIDEO MA'LUMOTLARI
  // ==========================================

  function title(video) {
    return String(
      video.title_uz ||
      video.title ||
      "F1 videosi"
    );
  }

  function videoURL(video) {
    return String(
      video.video_url ||
      video.videoUrl ||
      video.url ||
      ""
    );
  }

  function videoKey(video) {
    return String(
      video.id ||
      video.video_url ||
      video.videoUrl ||
      video.url ||
      ""
    );
  }

  function validUploadURL(video) {
    try {
      const raw = videoURL(video);

      if (!raw) return false;

      if (
        /^\/api\/media\/videos\/[a-f0-9-]{36}\.(mp4|webm)$/i.test(raw)
      ) {
        return true;
      }

      const url = new URL(
        raw,
        window.location.origin
      );

      return (
        url.protocol === "https:" &&
        /\.(mp4|webm)$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function normalize(items) {
    if (!Array.isArray(items)) return [];

    const seen = new Set();

    return items.filter(video => {
      if (
        !video ||
        typeof video !== "object" ||
        !validUploadURL(video)
      ) {
        return false;
      }

      const key = videoKey(video);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  function thumbnailURL(video) {
    const value =
      video.thumbnail ||
      video.thumbnail_url ||
      video.thumbnailUrl ||
      "";

    if (typeof value !== "string") return "";

    if (
      /^https:\/\//i.test(value) ||
      value.startsWith("./") ||
      value.startsWith("/")
    ) {
      return value;
    }

    return "";
  }

  // ==========================================
  // VIDEO FORMATINI ANIQLASH
  // ==========================================

  function declaredFormat(video) {
    const ratio = String(
      video.aspect_ratio ||
      video.aspectRatio ||
      ""
    ).trim();

    if (ratio === "9:16") return "portrait";
    if (ratio === "16:9") return "landscape";
    if (ratio === "1:1") return "square";

    const width = Number(
      video.width ||
      video.video_width ||
      video.videoWidth
    );

    const height = Number(
      video.height ||
      video.video_height ||
      video.videoHeight
    );

    if (width > 0 && height > 0) {
      return formatFromDimensions(width, height);
    }

    return "";
  }

  function formatFromDimensions(width, height) {
    if (!width || !height) return "landscape";

    const ratio = width / height;

    if (ratio < 0.85) return "portrait";
    if (ratio > 1.15) return "landscape";

    return "square";
  }

  function setFormat(format) {
    stage.classList.remove(
      "cp-landscape",
      "cp-portrait",
      "cp-square"
    );

    stage.classList.add(
      "cp-" + (
        ["landscape", "portrait", "square"].includes(format)
          ? format
          : "landscape"
      )
    );
  }

  // ==========================================
  // VIDEODAN MUQOVA VA FORMAT OLISH
  // ==========================================

  function inspectVideo(video) {
    const url = videoURL(video);

    if (thumbnails.has(url)) {
      return Promise.resolve(thumbnails.get(url));
    }

    if (thumbnailJobs.has(url)) {
      return thumbnailJobs.get(url);
    }

    const job = new Promise(resolve => {
      const media = document.createElement("video");

      let finished = false;

      const result = {
        thumbnail: "",
        format: declaredFormat(video) || "landscape"
      };

      const timeout = setTimeout(() => {
        finish();
      }, 12000);

      function finish() {
        if (finished) return;

        finished = true;
        clearTimeout(timeout);

        media.pause();
        media.removeAttribute("src");
        media.load();

        thumbnails.set(url, result);
        resolve(result);
      }

      function capture() {
        try {
          if (
            !media.videoWidth ||
            !media.videoHeight
          ) {
            finish();
            return;
          }

          result.format = formatFromDimensions(
            media.videoWidth,
            media.videoHeight
          );

          const canvas = document.createElement("canvas");

          const scale = Math.min(
            1,
            640 / media.videoWidth
          );

          canvas.width = Math.max(
            1,
            Math.round(media.videoWidth * scale)
          );

          canvas.height = Math.max(
            1,
            Math.round(media.videoHeight * scale)
          );

          const context = canvas.getContext("2d");

          if (!context) {
            finish();
            return;
          }

          context.drawImage(
            media,
            0,
            0,
            canvas.width,
            canvas.height
          );

          result.thumbnail = canvas.toDataURL(
            "image/jpeg",
            0.82
          );

          finish();
        } catch {
          finish();
        }
      }

      media.muted = true;
      media.playsInline = true;
      media.preload = "auto";
      media.crossOrigin = "anonymous";

      media.addEventListener(
        "loadedmetadata",
        () => {
          if (media.videoWidth && media.videoHeight) {
            result.format = formatFromDimensions(
              media.videoWidth,
              media.videoHeight
            );
          }

          const duration = media.duration;

          const second =
            Number.isFinite(duration) && duration > 0
              ? Math.min(
                  1,
                  Math.max(0, duration - 0.1)
                )
              : 0;

          try {
            if (second > 0) {
              media.currentTime = second;
            } else if (media.readyState >= 2) {
              capture();
            } else {
              media.addEventListener(
                "loadeddata",
                capture,
                { once: true }
              );
            }
          } catch {
            finish();
          }
        },
        { once: true }
      );

      media.addEventListener(
        "seeked",
        capture,
        { once: true }
      );

      media.addEventListener(
        "error",
        finish,
        { once: true }
      );

      media.src = url;
      media.load();
    });

    thumbnailJobs.set(url, job);

    job.finally(() => {
      thumbnailJobs.delete(url);
    });

    return job;
  }

  // ==========================================
  // NUQTALAR
  // ==========================================

  function renderDots() {
    dots.replaceChildren();

    if (videos.length <= 1) return;

    const maxDots = Math.min(videos.length, 12);

    for (let i = 0; i < maxDots; i++) {
      const dot = document.createElement("button");

      dot.type = "button";
      dot.className = "cp-dot";

      if (i === currentIndex % maxDots) {
        dot.classList.add("cp-active");
      }

      dot.setAttribute(
        "aria-label",
        `${i + 1}-videoga o'tish`
      );

      dot.addEventListener("click", () => {
        show(i);
      });

      dots.appendChild(dot);
    }
  }

  // ==========================================
  // GALEREYADA VIDEONI KO'RSATISH
  // ==========================================

  async function show(index) {
    if (!videos.length) return;

    const nextIndex =
      (index + videos.length) % videos.length;

    currentIndex = nextIndex;

    const video = videos[currentIndex];
    const token = ++renderToken;

    caption.textContent = title(video);

    counter.textContent =
      `${currentIndex + 1} / ${videos.length}`;

    stage.setAttribute(
      "aria-label",
      title(video) + " — tomosha qilish"
    );

    renderDots();

    imageElement.classList.add("cp-fade");
    imageElement.style.display = "none";

    placeholder.style.display = "grid";
    placeholder.textContent = "Muqova yuklanmoqda...";

    const knownFormat = declaredFormat(video);

    setFormat(knownFormat || "landscape");

    let info;

    try {
      info = await inspectVideo(video);
    } catch {
      info = {
        thumbnail: "",
        format: knownFormat || "landscape"
      };
    }

    if (token !== renderToken) return;

    setFormat(info.format || knownFormat || "landscape");

    const thumb = thumbnailURL(video) || info.thumbnail;

    if (!thumb) {
      placeholder.textContent = "🎬 F1 VIDEO";
      return;
    }

    const preload = new Image();

    preload.onload = () => {
      if (token !== renderToken) return;

      imageElement.src = thumb;
      imageElement.style.display = "block";

      placeholder.style.display = "none";

      requestAnimationFrame(() => {
        imageElement.classList.remove("cp-fade");
      });
    };

    preload.onerror = () => {
      if (token !== renderToken) return;

      placeholder.style.display = "grid";
      placeholder.textContent = "🎬 F1 VIDEO";
    };

    preload.src = thumb;
  }

  // ==========================================
  // PLEYERNI TOZALASH
  // ==========================================

  function destroyPlayer() {
    if (activeVideo) {
      activeVideo.pause();
      activeVideo.removeAttribute("src");

      activeVideo.querySelectorAll("source").forEach(
        source => source.removeAttribute("src")
      );

      activeVideo.load();
      activeVideo = null;
    }

    frame.replaceChildren();
  }

  // ==========================================
  // VIDEONI KATTA OYNADA OCHISH
  // ==========================================

  function play(index) {
    if (!videos.length) return;

    modalIndex =
      (index + videos.length) % videos.length;

    const video = videos[modalIndex];

    if (!modal.classList.contains("cp-open")) {
      lastFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
    }

    destroyPlayer();

    modalTitle.textContent = title(video);

    const cached = thumbnails.get(videoURL(video));

    const format =
      cached?.format ||
      declaredFormat(video) ||
      "landscape";

    frame.classList.remove(
      "cp-vertical",
      "cp-square"
    );

    if (format === "portrait") {
      frame.classList.add("cp-vertical");
    }

    if (format === "square") {
      frame.classList.add("cp-square");
    }

    const player = document.createElement("video");

    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "metadata";

    player.addEventListener(
      "loadedmetadata",
      () => {
        const actualFormat = formatFromDimensions(
          player.videoWidth,
          player.videoHeight
        );

        frame.classList.remove(
          "cp-vertical",
          "cp-square"
        );

        if (actualFormat === "portrait") {
          frame.classList.add("cp-vertical");
        }

        if (actualFormat === "square") {
          frame.classList.add("cp-square");
        }
      }
    );

    const source = document.createElement("source");

    source.src = videoURL(video);

    source.type =
      /\.webm(?:\?|$)/i.test(source.src)
        ? "video/webm"
        : "video/mp4";

    player.appendChild(source);
    frame.appendChild(player);

    activeVideo = player;

    modal.classList.add("cp-open");

    document.body.style.overflow = "hidden";

    player.play().catch(() => {});

    closeButton.focus();
  }

  function closeModal() {
    if (!modal.classList.contains("cp-open")) {
      return;
    }

    modal.classList.remove("cp-open");

    destroyPlayer();

    document.body.style.overflow =
      previousOverflow;

    if (lastFocus && lastFocus.isConnected) {
      lastFocus.focus();
    }
  }

  // ==========================================
  // TUGMALAR
  // ==========================================

  stage.addEventListener("click", () => {
    play(currentIndex);
  });

  previousButton.addEventListener("click", () => {
    show(currentIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    show(currentIndex + 1);
  });

  closeButton.addEventListener(
    "click",
    closeModal
  );

  modalPrevious.addEventListener("click", () => {
    play(modalIndex - 1);
  });

  modalNext.addEventListener("click", () => {
    play(modalIndex + 1);
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      modal.classList.contains("cp-open")
    ) {
      closeModal();
    }
  });

  // ==========================================
  // JSON FAYLDAN VIDEOLARNI O'QISH
  // ==========================================

  async function loadVideos() {
    if (loading) return;

    loading = true;

    try {
      const response = await fetch(
        "./uploaded-videos.json?t=" + Date.now(),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          "uploaded-videos.json HTTP " +
          response.status
        );
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.videos)
          ? data.videos
          : [];

      const updated = normalize(items);

      const previousKey = videos[currentIndex]
        ? videoKey(videos[currentIndex])
        : "";

      const oldKeys = videos.map(videoKey).join("|");
      const newKeys = updated.map(videoKey).join("|");

      videos = updated;

      if (!videos.length) {
        renderToken++;

        status.textContent =
          "Hozircha yuklangan videolar mavjud emas.";

        caption.textContent = "";
        counter.textContent = "";

        imageElement.style.display = "none";

        placeholder.style.display = "grid";
        placeholder.textContent =
          "Hozircha videolar mavjud emas.";

        dots.replaceChildren();

        return;
      }

      status.textContent = "";

      const foundIndex = videos.findIndex(
        video => videoKey(video) === previousKey
      );

      currentIndex =
        foundIndex >= 0 ? foundIndex : 0;

      if (oldKeys !== newKeys || renderToken === 0) {
        await show(currentIndex);
      }

    } catch (error) {
      console.error(
        "F1 CINEMA yuklash xatosi:",
        error
      );

      status.textContent =
        "Videolarni yuklashda xatolik yuz berdi.";
    } finally {
      loading = false;
    }
  }

  // ==========================================
  // ISHGA TUSHIRISH
  // ==========================================

  loadVideos();

  // Har 15 soniyada keyingi video

  setInterval(() => {
    if (
      videos.length > 1 &&
      !modal.classList.contains("cp-open") &&
      !document.hidden
    ) {
      show(currentIndex + 1);
    }
  }, ROTATE_MS);

  // Har 5 daqiqada yangi videolarni tekshirish

  setInterval(
    loadVideos,
    REFRESH_MS
  );

})();

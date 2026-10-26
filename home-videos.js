(() => {
  "use strict";

  if (document.getElementById("f1-cinema-premium")) return;

  const ROTATE_MS = 15000;
  const REFRESH_MS = 5 * 60 * 1000;
  const THUMB_TIMEOUT = 10000;

  const thumbnailCache = new Map();
  const thumbnailJobs = new Map();
  const formatCache = new Map();

  let videos = [];
  let currentIndex = 0;
  let modalIndex = 0;
  let activeVideo = null;
  let previewVideo = null;
  let renderToken = 0;
  let loading = false;
  let previousOverflow = "";
  let lastFocus = null;

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
      width: 6px;
      height: 34px;
      background: #e10600;
      border-radius: 4px;
      flex-shrink: 0;
    }

    #f1-cinema-premium .cp-gallery {
      width: 100%;
      overflow: hidden;
      border: 1px solid #34343c;
      border-radius: 16px;
      background: #101014;
      box-shadow: 0 12px 35px #0007;
    }

    #f1-cinema-premium .cp-stage-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      background: #101014;
    }

    #f1-cinema-premium .cp-stage {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      min-height: 200px;
      padding: 0;
      border: 0;
      overflow: hidden;
      background: #101014;
      color: #fff;
      cursor: pointer;
    }

    #f1-cinema-premium .cp-stage.cp-landscape {
      width: 100%;
      aspect-ratio: 16 / 9;
    }

    #f1-cinema-premium .cp-stage.cp-portrait {
      width: min(100%, 430px);
      aspect-ratio: 9 / 16;
      max-height: 75vh;
    }

    #f1-cinema-premium .cp-stage.cp-square {
      width: min(100%, 650px);
      aspect-ratio: 1 / 1;
    }

    #f1-cinema-premium .cp-media {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #101014;
      overflow: hidden;
    }

    #f1-cinema-premium .cp-image,
    #f1-cinema-premium .cp-preview-video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #101014;
    }

    #f1-cinema-premium .cp-preview-video {
      pointer-events: none;
    }

    #f1-cinema-premium .cp-placeholder {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: radial-gradient(
        circle,
        #303039,
        #101014
      );
      color: #bbb;
      font-size: 14px;
      font-weight: 800;
      text-align: center;
    }

    #f1-cinema-premium .cp-shade {
      position: absolute;
      inset: 45% 0 0;
      background: linear-gradient(
        transparent,
        rgba(0, 0, 0, .35),
        rgba(0, 0, 0, .88)
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
      align-items: center;
      justify-content: center;
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

    /* KATTA VIDEO OYNASI */

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
    <h2 class="cp-heading">🎬 F1 CINEMA</h2>

    <div class="cp-gallery">
      <div class="cp-stage-wrap">
        <button
          type="button"
          class="cp-stage cp-landscape"
          aria-label="Videoni tomosha qilish"
        >
          <div class="cp-media">
            <div class="cp-placeholder">
              Videolar yuklanmoqda...
            </div>
          </div>

          <div class="cp-shade"></div>
          <div class="cp-play">▶</div>
          <div class="cp-counter"></div>
          <div class="cp-caption"></div>
        </button>
      </div>

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

  const target = document.querySelector(".calendar-section");

  if (target) {
    target.before(root);
  } else {
    (
      document.querySelector("main") ||
      document.body
    ).appendChild(root);
  }

  const stage = root.querySelector(".cp-stage");
  const mediaBox = root.querySelector(".cp-media");
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

        <button type="button" class="cp-close">
          ✕ Yopish
        </button>
      </div>

      <div class="cp-frame"></div>

      <div class="cp-navigation">
        <button type="button" class="cp-nav cp-modal-prev">
          ← Oldingi video
        </button>

        <button type="button" class="cp-nav cp-modal-next">
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

  function formatFromDimensions(width, height) {
    if (!width || !height) return "landscape";

    const ratio = width / height;

    if (ratio < 0.85) return "portrait";
    if (ratio > 1.15) return "landscape";

    return "square";
  }

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

  function getFormat(video) {
    return (
      formatCache.get(videoURL(video)) ||
      declaredFormat(video) ||
      "landscape"
    );
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
  // MUQOVANI TEKSHIRISH
  // ==========================================

  function inspectVideo(video) {
    const url = videoURL(video);

    if (thumbnailCache.has(url)) {
      return Promise.resolve(thumbnailCache.get(url));
    }

    if (thumbnailJobs.has(url)) {
      return thumbnailJobs.get(url);
    }

    const job = new Promise(resolve => {
      const media = document.createElement("video");

      const result = {
        thumbnail: "",
        format: getFormat(video)
      };

      let finished = false;
      let attempt = 0;
      let waitingForFrame = false;

      const positions = [1, 3, 5];

      const timer = setTimeout(
        finish,
        THUMB_TIMEOUT
      );

      function cleanup() {
        media.pause();
        media.removeAttribute("src");
        media.load();
      }

      function finish() {
        if (finished) return;

        finished = true;
        clearTimeout(timer);

        cleanup();

        if (result.thumbnail) {
          thumbnailCache.set(url, result);
        }

        formatCache.set(url, result.format);

        resolve(result);
      }

      function seekNext() {
        if (finished) return;

        if (attempt >= positions.length) {
          finish();
          return;
        }

        const duration = media.duration;

        let second = positions[attempt++];

        if (Number.isFinite(duration) && duration > 0) {
          second = Math.min(
            second,
            Math.max(0, duration - 0.1)
          );
        }

        waitingForFrame = true;

        try {
          if (
            Math.abs(media.currentTime - second) < 0.05 &&
            media.readyState >= 2
          ) {
            capture();
          } else {
            media.currentTime = second;
          }
        } catch {
          finish();
        }
      }

      function capture() {
        if (finished || !waitingForFrame) return;

        if (
          !media.videoWidth ||
          !media.videoHeight ||
          media.readyState < 2
        ) {
          return;
        }

        waitingForFrame = false;

        try {
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

          const ctx = canvas.getContext("2d", {
            willReadFrequently: true
          });

          if (!ctx) {
            finish();
            return;
          }

          ctx.drawImage(
            media,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const sample = document.createElement("canvas");

          sample.width = 16;
          sample.height = 16;

          const sampleCtx = sample.getContext("2d", {
            willReadFrequently: true
          });

          if (!sampleCtx) {
            finish();
            return;
          }

          sampleCtx.drawImage(
            canvas,
            0,
            0,
            16,
            16
          );

          const pixels = sampleCtx.getImageData(
            0,
            0,
            16,
            16
          ).data;

          let brightness = 0;

          for (let i = 0; i < pixels.length; i += 4) {
            brightness +=
              pixels[i] * 0.299 +
              pixels[i + 1] * 0.587 +
              pixels[i + 2] * 0.114;
          }

          brightness /= pixels.length / 4;

          if (
            brightness < 12 &&
            attempt < positions.length
          ) {
            seekNext();
            return;
          }

          result.thumbnail = canvas.toDataURL(
            "image/jpeg",
            0.82
          );

          finish();

        } catch (error) {
          console.warn(
            "F1 CINEMA: kadr olinmadi",
            error
          );

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

            formatCache.set(url, result.format);
          }

          seekNext();
        },
        { once: true }
      );

      media.addEventListener("seeked", () => {
        if (media.readyState >= 2) {
          capture();
        }
      });

      media.addEventListener("loadeddata", capture);

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
  // ESKI MUQOVANI TOZALASH
  // ==========================================

  function clearPreview() {
    if (previewVideo) {
      previewVideo.pause();
      previewVideo.removeAttribute("src");
      previewVideo.load();
      previewVideo = null;
    }

    mediaBox.replaceChildren();
  }

  function showPlaceholder(message) {
    clearPreview();

    const placeholder = document.createElement("div");

    placeholder.className = "cp-placeholder";
    placeholder.textContent = message;

    mediaBox.appendChild(placeholder);
  }

  // ==========================================
  // RASM MUQOVASINI KO'RSATISH
  // ==========================================

  function showImage(src, token, onFailure) {
    const image = new Image();

    image.onload = () => {
      if (token !== renderToken) return;

      clearPreview();

      image.className = "cp-image";
      image.alt = "";

      mediaBox.appendChild(image);
    };

    image.onerror = () => {
      if (token !== renderToken) return;

      if (typeof onFailure === "function") {
        onFailure();
      }
    };

    image.src = src;
  }

  // ==========================================
  // ZAXIRA: VIDEO KADRINI KO'RSATISH
  // ==========================================

  function showVideoPreview(video, token) {
    if (token !== renderToken) return;

    clearPreview();

    const preview = document.createElement("video");

    preview.className = "cp-preview-video";
    preview.muted = true;
    preview.defaultMuted = true;
    preview.playsInline = true;
    preview.preload = "auto";
    preview.autoplay = false;
    preview.controls = false;
    preview.loop = false;

    preview.setAttribute("muted", "");
    preview.setAttribute("playsinline", "");

    let frameReady = false;

    const fallbackTimer = setTimeout(() => {
      if (
        token !== renderToken ||
        frameReady
      ) {
        return;
      }

      showPlaceholder("🎬 F1 VIDEO");
    }, 10000);

    function ready() {
      if (token !== renderToken) return;

      frameReady = true;
      clearTimeout(fallbackTimer);
    }

    preview.addEventListener(
      "loadedmetadata",
      () => {
        if (token !== renderToken) return;

        if (preview.videoWidth && preview.videoHeight) {
          const format = formatFromDimensions(
            preview.videoWidth,
            preview.videoHeight
          );

          formatCache.set(videoURL(video), format);
          setFormat(format);
        }

        const duration = preview.duration;

        const second =
          Number.isFinite(duration) && duration > 0
            ? Math.min(1, Math.max(0, duration - 0.1))
            : 0;

        try {
          preview.currentTime = second;
        } catch {
          // Brauzer ruxsat bermasa, birinchi kadr qoladi.
        }
      }
    );

    preview.addEventListener("seeked", ready);
    preview.addEventListener("loadeddata", ready);

    preview.addEventListener("error", () => {
      clearTimeout(fallbackTimer);

      if (token === renderToken) {
        showPlaceholder("🎬 F1 VIDEO");
      }
    });

    preview.src = videoURL(video);

    previewVideo = preview;

    mediaBox.appendChild(preview);

    preview.load();
  }

  // ==========================================
  // GALEREYA NUQTALARI
  // ==========================================

  function renderDots() {
    dots.replaceChildren();

    if (videos.length <= 1) return;

    for (let i = 0; i < videos.length; i++) {
      const dot = document.createElement("button");

      dot.type = "button";
      dot.className = "cp-dot";

      if (i === currentIndex) {
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

    currentIndex =
      (index + videos.length) % videos.length;

    const video = videos[currentIndex];
    const token = ++renderToken;

    caption.textContent = title(video);

    counter.textContent =
      `${currentIndex + 1} / ${videos.length}`;

    stage.setAttribute(
      "aria-label",
      title(video) + " — tomosha qilish"
    );

    setFormat(getFormat(video));
    renderDots();

    showPlaceholder("Muqova yuklanmoqda...");

    // Avval tayyor muqovani ko'rsatamiz.
    const suppliedThumb = thumbnailURL(video);

    if (suppliedThumb) {
      showImage(suppliedThumb, token, async () => {
        const info = await inspectVideo(video);

        if (token !== renderToken) return;

        setFormat(info.format);

        if (info.thumbnail) {
          showImage(
            info.thumbnail,
            token,
            () => showVideoPreview(video, token)
          );
        } else {
          showVideoPreview(video, token);
        }
      });

      // Muqova tayyor bo'lsa ham formatni aniqlaymiz.
      inspectVideo(video).then(info => {
        if (token === renderToken) {
          setFormat(info.format);
        }
      });

      return;
    }

    // Muqova yo'q bo'lsa, videodan kadr olamiz.
    let info;

    try {
      info = await inspectVideo(video);
    } catch {
      info = {
        thumbnail: "",
        format: getFormat(video)
      };
    }

    if (token !== renderToken) return;

    setFormat(info.format);

    if (info.thumbnail) {
      showImage(
        info.thumbnail,
        token,
        () => showVideoPreview(video, token)
      );
    } else {
      showVideoPreview(video, token);
    }
  }

  // ==========================================
  // VIDEO PLEYER
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

    const format = getFormat(video);

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

        formatCache.set(
          videoURL(video),
          actualFormat
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
    if (!modal.classList.contains("cp-open")) return;

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
  // VIDEO JSON FAYLINI YUKLASH
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

        showPlaceholder(
          "Hozircha videolar mavjud emas."
        );

        dots.replaceChildren();

        return;
      }

      status.textContent = "";

      const foundIndex = videos.findIndex(
        video => videoKey(video) === previousKey
      );

      currentIndex =
        foundIndex >= 0 ? foundIndex : 0;

      if (
        oldKeys !== newKeys ||
        renderToken === 0
      ) {
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

  // Har 15 soniyada almashadi.
  setInterval(() => {
    if (
      videos.length > 1 &&
      !modal.classList.contains("cp-open") &&
      !document.hidden
    ) {
      show(currentIndex + 1);
    }
  }, ROTATE_MS);

  // Har 5 daqiqada yangi videolar tekshiriladi.
  setInterval(
    loadVideos,
    REFRESH_MS
  );

})();

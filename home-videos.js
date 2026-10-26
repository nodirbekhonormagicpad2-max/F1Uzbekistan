(() => {
  "use strict";

  if (document.getElementById("f1-cinema-premium")) return;

  const ROTATE_MS = 15000;
  const REFRESH_MS = 5 * 60 * 1000;

  let videos = [];
  let currentIndex = 0;
  let activeVideo = null;
  let previousOverflow = "";
  let lastFocus = null;
  let requestId = 0;

  // =====================================
  // DIZAYN
  // =====================================

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
      margin: 0 0 14px;
      font-size: clamp(19px, 3vw, 28px);
      font-weight: 900;
      letter-spacing: .045em;
    }

    #f1-cinema-premium .cp-heading::before {
      content: "";
      display: block;
      width: 5px;
      height: 28px;
      background: #e10600;
      border-radius: 4px;
    }

    #f1-cinema-premium .cp-stage {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: #101014;
      border: 1px solid #34343c;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 12px 35px #0007;
    }

    #f1-cinema-premium .cp-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 1;
      transition: opacity .45s ease;
    }

    #f1-cinema-premium .cp-image.cp-fade {
      opacity: .15;
    }

    #f1-cinema-premium .cp-placeholder {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: radial-gradient(
        circle,
        #303039,
        #101014
      );
      color: #aaa;
      font-size: 14px;
      font-weight: 800;
      text-align: center;
      padding: 20px;
    }

    #f1-cinema-premium .cp-shade {
      position: absolute;
      inset: 25% 0 0;
      pointer-events: none;
      background: linear-gradient(
        transparent,
        rgba(0, 0, 0, .3) 35%,
        rgba(0, 0, 0, .95)
      );
    }

    #f1-cinema-premium .cp-caption {
      position: absolute;
      left: clamp(15px, 4%, 45px);
      bottom: clamp(15px, 5%, 45px);
      right: 75px;
      pointer-events: none;
      font-size: clamp(17px, 3.5vw, 42px);
      font-weight: 900;
      line-height: 1.14;
      letter-spacing: .025em;
      text-shadow: 0 3px 15px #000;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #f1-cinema-premium .cp-caption::after {
      content: "";
      display: block;
      width: clamp(55px, 12vw, 115px);
      height: 4px;
      margin-top: 12px;
      background: #e10600;
      border-radius: 4px;
      box-shadow: 0 0 14px #e1060099;
    }

    #f1-cinema-premium .cp-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: clamp(56px, 10vw, 85px);
      height: clamp(56px, 10vw, 85px);
      border-radius: 50%;
      background: #e10600;
      color: #fff;
      font-size: clamp(23px, 4vw, 34px);
      box-shadow: 0 5px 25px #000a;
      pointer-events: none;
    }

    #f1-cinema-premium .cp-count {
      position: absolute;
      top: 14px;
      right: 14px;
      padding: 7px 11px;
      border-radius: 20px;
      background: #000a;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      pointer-events: none;
    }

    #f1-cinema-premium .cp-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
    }

    #f1-cinema-premium .cp-info {
      color: #aaa;
      font-size: 12px;
    }

    #f1-cinema-premium .cp-all {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 11px 15px;
      border-radius: 8px;
      background: #e10600;
      color: #fff;
      text-decoration: none;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    #f1-cinema-premium .cp-all:hover {
      background: #b90500;
    }

    #f1-cinema-premium .cp-status {
      padding: 20px 0;
      color: #aaa;
      font-size: 13px;
    }

    #f1-cinema-premium .cp-status:empty {
      display: none;
    }

    /* =====================================
       KATTA VIDEO OYNASI
       ===================================== */

    #f1-cinema-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 15px;
      background: rgba(0, 0, 0, .96);
      overflow-y: auto;
    }

    #f1-cinema-modal.cp-open {
      display: flex;
    }

    #f1-cinema-modal .cp-dialog {
      width: min(1000px, 100%);
      margin: auto;
      padding: 14px;
      border: 1px solid #353535;
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
      font-size: clamp(14px, 2.5vw, 20px);
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
      #f1-cinema-premium .cp-stage {
        border-radius: 12px;
      }

      #f1-cinema-premium .cp-caption {
        left: 17px;
        right: 17px;
        bottom: 17px;
        font-size: clamp(16px, 4.5vw, 26px);
      }

      #f1-cinema-premium .cp-play {
        width: 55px;
        height: 55px;
        font-size: 23px;
      }

      #f1-cinema-premium .cp-info {
        font-size: 10px;
      }

      #f1-cinema-premium .cp-all {
        font-size: 11px;
        padding: 10px;
      }

      #f1-cinema-modal {
        padding: 8px;
      }

      #f1-cinema-modal .cp-dialog {
        padding: 10px;
      }
    }
  `;

  document.head.appendChild(style);

  // =====================================
  // ASOSIY VIDEO GALEREYA
  // =====================================

  const root = document.createElement("section");

  root.id = "f1-cinema-premium";
  root.setAttribute(
    "aria-label",
    "F1 Cinema video galereyasi"
  );

  root.innerHTML = `
    <h2 class="cp-heading">🎬 F1 CINEMA</h2>

    <div
      class="cp-stage"
      role="button"
      tabindex="0"
      aria-label="Videoni tomosha qilish"
    >
      <div class="cp-placeholder">
        Videolar yuklanmoqda...
      </div>

      <img
        class="cp-image"
        alt="F1 video muqovasi"
        style="display:none"
      >

      <div class="cp-shade"></div>
      <div class="cp-caption"></div>
      <div class="cp-play">▶</div>
      <div class="cp-count"></div>
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
  const count = root.querySelector(".cp-count");
  const status = root.querySelector(".cp-status");

  // =====================================
  // VIDEO MODAL
  // =====================================

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
          aria-label="Videoni yopish"
        >
          ✕ Yopish
        </button>
      </div>

      <div class="cp-frame"></div>

      <div class="cp-navigation">
        <button type="button" class="cp-nav cp-prev">
          ← Oldingi video
        </button>

        <button type="button" class="cp-nav cp-next">
          Keyingi video →
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const frame = modal.querySelector(".cp-frame");
  const closeButton = modal.querySelector(".cp-close");
  const modalTitle = modal.querySelector(".cp-modaltitle");
  const previousButton = modal.querySelector(".cp-prev");
  const nextButton = modal.querySelector(".cp-next");

  // =====================================
  // VIDEO MA'LUMOTLARI
  // =====================================

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

  // =====================================
  // VIDEO MUQOVASINI YARATISH
  // =====================================

  function generateThumbnail(video) {
    return new Promise(resolve => {
      const url = videoURL(video);
      const media = document.createElement("video");

      let finished = false;

      const timeout = setTimeout(() => {
        finish("");
      }, 12000);

      function finish(result) {
        if (finished) return;

        finished = true;
        clearTimeout(timeout);

        media.pause();
        media.removeAttribute("src");
        media.load();

        resolve(result);
      }

      function capture() {
        try {
          if (
            !media.videoWidth ||
            !media.videoHeight
          ) {
            finish("");
            return;
          }

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
            finish("");
            return;
          }

          context.drawImage(
            media,
            0,
            0,
            canvas.width,
            canvas.height
          );

          finish(
            canvas.toDataURL("image/jpeg", 0.8)
          );
        } catch {
          finish("");
        }
      }

      media.muted = true;
      media.playsInline = true;
      media.preload = "auto";
      media.crossOrigin = "anonymous";

      media.addEventListener(
        "loadedmetadata",
        () => {
          const duration = media.duration;

          const second =
            Number.isFinite(duration) && duration > 0
              ? Math.min(1, Math.max(0, duration - 0.1))
              : 0;

          try {
            media.currentTime = second;

            if (second === 0 && media.readyState >= 2) {
              capture();
            }
          } catch {
            finish("");
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
        () => finish(""),
        { once: true }
      );

      media.src = url;
      media.load();
    });
  }

  // =====================================
  // BITTA VIDEONI KO'RSATISH
  // =====================================

  async function show(index) {
    if (!videos.length) return;

    const nextIndex =
      (index + videos.length) % videos.length;

    const video = videos[nextIndex];
    const token = ++requestId;

    currentIndex = nextIndex;

    caption.textContent = title(video);
    count.textContent =
      `${currentIndex + 1} / ${videos.length}`;

    imageElement.classList.add("cp-fade");

    let thumb = thumbnailURL(video);

    if (!thumb) {
      thumb = await generateThumbnail(video);
    }

    if (token !== requestId) return;

    if (thumb) {
      const preload = new Image();

      preload.onload = () => {
        if (token !== requestId) return;

        imageElement.src = thumb;
        imageElement.style.display = "block";
        placeholder.style.display = "none";

        requestAnimationFrame(() => {
          imageElement.classList.remove("cp-fade");
        });
      };

      preload.onerror = () => {
        if (token !== requestId) return;

        imageElement.style.display = "none";
        placeholder.style.display = "grid";
        placeholder.textContent = "🎬 F1 VIDEO";

        imageElement.classList.remove("cp-fade");
      };

      preload.src = thumb;
    } else {
      imageElement.style.display = "none";
      placeholder.style.display = "grid";
      placeholder.textContent = "🎬 F1 VIDEO";

      imageElement.classList.remove("cp-fade");
    }
  }

  // =====================================
  // VIDEO PLEYER
  // =====================================

  function destroyPlayer() {
    if (activeVideo) {
      activeVideo.pause();
      activeVideo.removeAttribute("src");
      activeVideo.load();
      activeVideo = null;
    }

    frame.replaceChildren();
  }

  function play(index) {
    if (!videos.length) return;

    const selectedIndex =
      (index + videos.length) % videos.length;

    const video = videos[selectedIndex];

    if (!modal.classList.contains("cp-open")) {
      lastFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
    }

    destroyPlayer();

    modalTitle.textContent = title(video);

    frame.classList.toggle(
      "cp-vertical",
      video.aspect_ratio === "9:16"
    );

    const player = document.createElement("video");

    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "metadata";

    const source = document.createElement("source");

    source.src = videoURL(video);

    source.type =
      /\.webm(?:\?|$)/i.test(source.src)
        ? "video/webm"
        : "video/mp4";

    player.appendChild(source);
    frame.appendChild(player);

    activeVideo = player;

    modal.dataset.index = String(selectedIndex);
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

  // =====================================
  // BOSISH HODISALARI
  // =====================================

  stage.addEventListener("click", () => {
    play(currentIndex);
  });

  stage.addEventListener("keydown", event => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      play(currentIndex);
    }
  });

  closeButton.addEventListener(
    "click",
    closeModal
  );

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

  previousButton.addEventListener("click", () => {
    const index = Number(modal.dataset.index || 0);
    play(index - 1);
  });

  nextButton.addEventListener("click", () => {
    const index = Number(modal.dataset.index || 0);
    play(index + 1);
  });

  // =====================================
  // VIDEO MA'LUMOTLARINI YUKLASH
  // =====================================

  async function loadVideos() {
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
        : Array.isArray(data.videos)
          ? data.videos
          : [];

      const updated = normalize(items);

      const previousKey = videos[currentIndex]
        ? videoKey(videos[currentIndex])
        : "";

      videos = updated;

      if (!videos.length) {
        requestId++;
        status.textContent =
          "Hozircha yuklangan videolar mavjud emas.";

        caption.textContent = "";
        count.textContent = "";

        imageElement.style.display = "none";
        placeholder.style.display = "grid";
        placeholder.textContent =
          "Hozircha videolar mavjud emas.";

        return;
      }

      status.textContent = "";

      const foundIndex = videos.findIndex(
        video => videoKey(video) === previousKey
      );

      currentIndex =
        foundIndex >= 0 ? foundIndex : 0;

      await show(currentIndex);

    } catch (error) {
      console.error(
        "F1 CINEMA yuklash xatosi:",
        error
      );

      status.textContent =
        "Videolarni yuklashda xatolik yuz berdi.";
    }
  }

  // =====================================
  // AVTOMATIK ALMASHISH
  // =====================================

  loadVideos();

  setInterval(() => {
    if (
      videos.length > 1 &&
      !modal.classList.contains("cp-open") &&
      !document.hidden
    ) {
      show(currentIndex + 1);
    }
  }, ROTATE_MS);

  setInterval(
    loadVideos,
    REFRESH_MS
  );

})();

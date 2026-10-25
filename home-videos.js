(() => {
  "use strict";

  if (document.getElementById("f1-cinema-premium")) return;

  const ROTATE_MS = 15 * 60 * 1000;
  const REFRESH_MS = 5 * 60 * 1000;
  const PAGE_SIZE = 4;

  const thumbnails = new Map();
  const thumbnailJobs = new Map();

  let videos = [];
  let page = 0;
  let lastRotation = Date.now();
  let activePlayer = null;
  let plyrPromise = null;
  let playToken = 0;
  let previousOverflow = "";
  let lastFocus = null;

  // ==============================
  // DIZAYN
  // ==============================

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
      margin: 22px 0;
    }

    #f1-cinema-premium .cp-shell {
      background: linear-gradient(140deg, #1b1b22, #0d0d11 70%);
      border: 1px solid #34343c;
      border-radius: 17px;
      padding: 18px;
      overflow: hidden;
    }

    #f1-cinema-premium .cp-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    #f1-cinema-premium .cp-logo {
      font-size: clamp(22px, 4vw, 32px);
      font-weight: 900;
      margin: 0;
    }

    #f1-cinema-premium .cp-logo span {
      color: #ff3838;
    }

    #f1-cinema-premium .cp-sub {
      color: #aaa;
      font-size: 11px;
      margin-top: 6px;
    }

    #f1-cinema-premium .cp-all {
      background: #e10600;
      color: #fff;
      text-decoration: none;
      padding: 10px 12px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    #f1-cinema-premium .cp-sectionhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 14px;
    }

    #f1-cinema-premium .cp-rowtitle {
      font-size: 17px;
      font-weight: 900;
      margin: 0;
    }

    #f1-cinema-premium .cp-timer {
      font-size: 11px;
      color: #aaa;
      text-align: right;
    }

    #f1-cinema-premium .cp-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    #f1-cinema-premium .cp-card {
      background: #111116;
      border: 1px solid #363641;
      border-radius: 14px;
      overflow: hidden;
      min-width: 0;
    }

    #f1-cinema-premium .cp-card:hover {
      border-color: #e10600;
    }

    #f1-cinema-premium .cp-thumb {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      position: relative;
      padding: 0;
      border: 0;
      background: #191920;
      cursor: pointer;
      overflow: hidden;
    }

    #f1-cinema-premium .cp-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    #f1-cinema-premium .cp-cover {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      background: radial-gradient(circle, #383842, #101014);
      font-size: 36px;
      font-weight: 900;
      color: #fff;
    }

    #f1-cinema-premium .cp-cover.cp-loading {
      font-size: 12px;
      font-weight: 700;
      color: #aaa;
      text-align: center;
      padding: 12px;
    }

    #f1-cinema-premium .cp-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e10600;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 20px;
      box-shadow: 0 4px 20px #0009;
      pointer-events: none;
    }

    #f1-cinema-premium .cp-cardbody {
      padding: 13px;
    }

    #f1-cinema-premium .cp-platform {
      color: #b7b7c0;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    #f1-cinema-premium .cp-platform::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-right: 6px;
      border-radius: 50%;
      background: #e10600;
    }

    #f1-cinema-premium .cp-cardtitle {
      font-size: 15px;
      font-weight: 800;
      line-height: 1.45;
      min-height: 43px;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #f1-cinema-premium .cp-cardmeta {
      color: #aaa;
      font-size: 11px;
      margin-top: 10px;
    }

    #f1-cinema-premium .cp-status {
      font-size: 12px;
      color: #aaa;
      padding: 12px 0;
    }

    #f1-cinema-premium .cp-status:empty {
      display: none;
    }

    /* VIDEO OYNASI */

    #f1-cinema-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: none;
      align-items: flex-start;
      justify-content: center;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.96);
      padding: 12px;
    }

    #f1-cinema-modal.cp-open {
      display: flex;
    }

    #f1-cinema-modal .cp-dialog {
      width: min(960px, 100%);
      margin: auto;
      padding: 12px;
      border: 1px solid #33343d;
      border-radius: 13px;
      background: #111116;
    }

    #f1-cinema-modal .cp-modalhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    #f1-cinema-modal .cp-modaltitle {
      font-size: 14px;
      font-weight: 900;
      margin: 0;
      line-height: 1.4;
    }

    #f1-cinema-modal .cp-close {
      background: #e10600;
      color: #fff;
      border: 0;
      border-radius: 8px;
      padding: 10px 13px;
      font-weight: 900;
      cursor: pointer;
    }

    #f1-cinema-modal .cp-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 9px;
      overflow: hidden;
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
      border: 0;
      object-fit: contain;
      background: #000;
    }

    /* PLYR */

    #f1-cinema-modal .plyr {
      width: 100%;
      height: 100%;
      --plyr-color-main: #e10600;
    }

    #f1-cinema-modal .plyr__video-wrapper {
      height: 100%;
      background: #000;
    }

    #f1-cinema-modal .cp-nexttitle {
      margin: 15px 0 9px;
      font-size: 13px;
      font-weight: 900;
    }

    #f1-cinema-modal .cp-nextlist {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 9px;
    }

    #f1-cinema-modal .cp-next {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      padding: 7px;
      background: #22222a;
      color: #fff;
      border: 1px solid #393944;
      border-radius: 9px;
      text-align: left;
      cursor: pointer;
    }

    #f1-cinema-modal .cp-next img,
    #f1-cinema-modal .cp-next-icon {
      width: 90px;
      aspect-ratio: 16 / 9;
      flex-shrink: 0;
      border-radius: 5px;
      object-fit: cover;
    }

    #f1-cinema-modal .cp-next-icon {
      display: grid;
      place-items: center;
      background: #111;
      font-size: 24px;
    }

    #f1-cinema-modal .cp-next span {
      font-size: 11px;
      line-height: 1.35;
      font-weight: 800;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    @media (max-width: 700px) {
      #f1-cinema-premium {
        margin: 18px 0;
      }

      #f1-cinema-premium .cp-shell {
        padding: 11px;
        border-radius: 13px;
      }

      #f1-cinema-premium .cp-logo {
        font-size: 22px;
      }

      #f1-cinema-premium .cp-sub {
        font-size: 10px;
      }

      #f1-cinema-premium .cp-all {
        font-size: 10px;
        padding: 9px 10px;
      }

      #f1-cinema-premium .cp-grid {
        gap: 10px;
      }

      #f1-cinema-premium .cp-cardbody {
        padding: 9px;
      }

      #f1-cinema-premium .cp-cardtitle {
        font-size: 12px;
        min-height: 35px;
      }

      #f1-cinema-premium .cp-platform,
      #f1-cinema-premium .cp-cardmeta {
        font-size: 10px;
      }

      #f1-cinema-premium .cp-play {
        width: 39px;
        height: 39px;
        font-size: 16px;
      }

      #f1-cinema-premium .cp-rowtitle {
        font-size: 14px;
      }

      #f1-cinema-premium .cp-timer {
        font-size: 10px;
      }

      #f1-cinema-modal .cp-nextlist {
        grid-template-columns: 1fr;
      }

      #f1-cinema-modal .cp-next img,
      #f1-cinema-modal .cp-next-icon {
        width: 100px;
      }
    }
  `;

  document.head.append(style);

  // ==============================
  // ASOSIY BLOK
  // ==============================

  const root = document.createElement("section");

  root.id = "f1-cinema-premium";
  root.setAttribute(
    "aria-label",
    "F1 Cinema video markazi"
  );

  root.innerHTML = `
    <div class="cp-shell">
      <div class="cp-top">
        <div>
          <h2 class="cp-logo">
            🎬 F1 <span>CINEMA</span>
          </h2>
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

  const target = document.querySelector(
    ".calendar-section"
  );

  if (target) {
    target.before(root);
  } else {
    (
      document.querySelector("main") ||
      document.body
    ).append(root);
  }

  // ==============================
  // MODAL
  // ==============================

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

      <h4 class="cp-nexttitle">
        ▶ Keyingi videolar
      </h4>

      <div class="cp-nextlist"></div>
    </div>
  `;

  document.body.append(modal);

  const grid = root.querySelector(".cp-grid");
  const status = root.querySelector(".cp-status");

  const frame = modal.querySelector(".cp-frame");
  const closeButton = modal.querySelector(".cp-close");

  const nextList = modal.querySelector(
    ".cp-nextlist"
  );

  // ==============================
  // PLYR.JS YUKLASH
  // ==============================

  function loadPlyr() {
    if (typeof window.Plyr === "function") {
      return Promise.resolve(true);
    }

    if (plyrPromise) {
      return plyrPromise;
    }

    plyrPromise = new Promise(resolve => {
      if (!document.getElementById("f1-plyr-css")) {
        const link = document.createElement("link");

        link.id = "f1-plyr-css";
        link.rel = "stylesheet";
        link.href =
          "https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css";

        document.head.append(link);
      }

      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.polyfilled.min.js";

      script.async = true;

      script.onload = () => {
        resolve(typeof window.Plyr === "function");
      };

      script.onerror = () => resolve(false);

      document.head.append(script);
    });

    return plyrPromise;
  }

  // ==============================
  // VIDEO MA'LUMOTLARI
  // ==============================

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

  function videoKey(video) {
    return String(
      video.id ||
      video.url ||
      video.video_url ||
      ""
    );
  }

  // ==============================
  // MUQOVA
  // ==============================

  function image(video) {
    const value =
      video.thumbnail ||
      video.thumbnail_url ||
      video.thumbnailUrl;

    if (
      typeof value === "string" &&
      (
        /^https:\/\//i.test(value) ||
        /^\.\//.test(value) ||
        /^\//.test(value)
      )
    ) {
      return value;
    }

    return thumbnails.get(videoURL(video)) || "";
  }

  // MP4/WebM videodan muqova yaratish

  function generateThumbnail(video) {
    const url = videoURL(video);

    if (!validUploadURL(video)) {
      return Promise.resolve("");
    }

    if (thumbnails.has(url)) {
      return Promise.resolve(thumbnails.get(url));
    }

    if (thumbnailJobs.has(url)) {
      return thumbnailJobs.get(url);
    }

    const job = new Promise(resolve => {
      const media = document.createElement("video");

      let finished = false;
      let timeout = null;

      function finish(result) {
        if (finished) return;

        finished = true;

        clearTimeout(timeout);

        media.pause();
        media.removeAttribute("src");
        media.load();

        if (result) {
          thumbnails.set(url, result);
        }

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

          const canvas = document.createElement(
            "canvas"
          );

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
            canvas.toDataURL("image/jpeg", 0.78)
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
            Number.isFinite(duration) &&
            duration > 0
              ? Math.min(
                  1,
                  Math.max(0, duration - 0.1)
                )
              : 1;

          try {
            media.currentTime = second;
          } catch {
            finish("");
          }
        },
        { once: true }
      );

      media.addEventListener(
        "seeked",
        () => {
          if (media.readyState >= 2) {
            capture();
          } else {
            media.addEventListener(
              "loadeddata",
              capture,
              { once: true }
            );
          }
        },
        { once: true }
      );

      media.addEventListener(
        "error",
        () => finish(""),
        { once: true }
      );

      timeout = setTimeout(
        () => finish(""),
        15000
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

  // ==============================
  // FAQAT YUKLANGAN VIDEOLAR
  // ==============================

  function normalize(items) {
    const seen = new Set();

    return items.filter(video => {
      if (!video || typeof video !== "object") {
        return false;
      }

      if (!validUploadURL(video)) {
        return false;
      }

      const key = videoKey(video);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
  }

  function meta(video) {
    const parts = [];

    if (video.channel || video.author) {
      parts.push(
        String(video.channel || video.author)
      );
    }

    const published =
      video.published ||
      video.publishedAt;

    if (published) {
      const date = new Date(published);

      if (!Number.isNaN(date.getTime())) {
        parts.push(
          date.toLocaleDateString("uz-UZ")
        );
      }
    }

    return parts.join(" · ") || "F1 Uzbekistan TV";
  }

  // ==============================
  // VIDEO KARTASI
  // ==============================

  function setThumbnail(button, src) {
    if (!button.isConnected || !src) return;

    const cover = button.querySelector(".cp-cover");

    if (!cover) return;

    const img = document.createElement("img");

    img.src = src;
    img.alt = "";
    img.loading = "lazy";

    cover.replaceWith(img);
  }

  function card(video) {
    const article = document.createElement("article");

    article.className = "cp-card";

    const button = document.createElement("button");

    button.type = "button";
    button.className = "cp-thumb";

    button.setAttribute(
      "aria-label",
      title(video) + " — tomosha qilish"
    );

    const thumb = image(video);

    if (thumb) {
      const img = document.createElement("img");

      img.src = thumb;
      img.alt = "";
      img.loading = "lazy";

      button.append(img);

    } else {
      const cover = document.createElement("div");

      cover.className = "cp-cover cp-loading";
      cover.textContent = "Muqova tayyorlanmoqda…";

      button.append(cover);
    }

    const playIcon = document.createElement("span");

    playIcon.className = "cp-play";
    playIcon.textContent = "▶";

    button.append(playIcon);

    button.addEventListener(
      "click",
      () => play(video)
    );

    const body = document.createElement("div");

    body.className = "cp-cardbody";

    const source = document.createElement("div");

    source.className = "cp-platform";
    source.textContent = "F1 Uzbekistan TV";

    const heading = document.createElement("p");

    heading.className = "cp-cardtitle";
    heading.textContent = title(video);

    const small = document.createElement("div");

    small.className = "cp-cardmeta";
    small.textContent = meta(video);

    body.append(source, heading, small);

    article.append(button, body);

    if (!thumb) {
      generateThumbnail(video).then(result => {
        if (result) {
          setThumbnail(button, result);
        } else {
          const cover = button.querySelector(
            ".cp-cover"
          );

          if (cover) {
            cover.classList.remove("cp-loading");
            cover.textContent = "🎬";
          }
        }
      });
    }

    return article;
  }

  // ==============================
  // PLEYERNI TOZALASH
  // ==============================

  function destroyPlayer() {
    if (activePlayer) {
      try {
        activePlayer.pause();
        activePlayer.destroy();
      } catch (error) {
        console.warn("Plyr:", error);
      }

      activePlayer = null;
    }

    const nativeVideo = frame.querySelector("video");

    if (nativeVideo) {
      nativeVideo.pause();
      nativeVideo.removeAttribute("src");

      nativeVideo.querySelectorAll("source").forEach(
        source => source.removeAttribute("src")
      );

      nativeVideo.load();
    }

    frame.replaceChildren();
  }

  function closeModal() {
    playToken++;

    if (!modal.classList.contains("cp-open")) {
      return;
    }

    modal.classList.remove("cp-open");

    destroyPlayer();

    frame.classList.remove("cp-vertical");

    document.body.style.overflow =
      previousOverflow;

    if (lastFocus && lastFocus.isConnected) {
      lastFocus.focus();
    }
  }

  // ==============================
  // VIDEO OCHISH
  // ==============================

  async function play(video) {
    const token = ++playToken;

    if (!modal.classList.contains("cp-open")) {
      lastFocus = document.activeElement;

      previousOverflow =
        document.body.style.overflow;
    }

    modal.querySelector(
      ".cp-modaltitle"
    ).textContent = title(video);

    destroyPlayer();

    const isVertical =
      video.aspect_ratio === "9:16";

    frame.classList.toggle(
      "cp-vertical",
      isVertical
    );

    modal.classList.add("cp-open");

    document.body.style.overflow = "hidden";

    const player = document.createElement("video");

    player.controls = true;
    player.playsInline = true;
    player.preload = "metadata";
    player.autoplay = true;

    const source = document.createElement("source");

    source.src = videoURL(video);

    source.type =
      /\.webm(?:\?|$)/i.test(source.src)
        ? "video/webm"
        : "video/mp4";

    player.append(source);

    frame.append(player);

    const available = await loadPlyr();

    if (
      token !== playToken ||
      !modal.classList.contains("cp-open") ||
      !player.isConnected
    ) {
      return;
    }

    if (available) {
      try {
        activePlayer = new window.Plyr(player, {
          autoplay: true,
          clickToPlay: true,

          ratio: isVertical
            ? "9:16"
            : "16:9",

          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "settings",
            "pip",
            "fullscreen"
          ],

          settings: [
            "speed",
            "loop"
          ],

          fullscreen: {
            enabled: true,
            fallback: true,
            iosNative: true
          },

          storage: {
            enabled: false
          }
        });

        const result = activePlayer.play();

        if (
          result &&
          typeof result.catch === "function"
        ) {
          result.catch(() => {});
        }

      } catch (error) {
        console.warn(
          "Plyr ishga tushmadi:",
          error
        );

        activePlayer = null;

        player.controls = true;
        player.play().catch(() => {});
      }

    } else {
      player.play().catch(() => {});
    }

    // KEYINGI VIDEOLAR

    nextList.replaceChildren();

    const others = videos
      .filter(
        item => videoKey(item) !== videoKey(video)
      )
      .slice(0, 6);

    for (const item of others) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "cp-next";

      const thumb = image(item);

      if (thumb) {
        const img = document.createElement("img");

        img.src = thumb;
        img.alt = "";
        img.loading = "lazy";

        button.append(img);

      } else {
        const icon = document.createElement("div");

        icon.className = "cp-next-icon";
        icon.textContent = "▶";

        button.append(icon);

        generateThumbnail(item).then(result => {
          if (result && button.isConnected) {
            const img = document.createElement("img");

            img.src = result;
            img.alt = "";
            img.loading = "lazy";

            icon.replaceWith(img);
          }
        });
      }

      const label = document.createElement("span");

      label.textContent = title(item);

      button.append(label);

      button.addEventListener(
        "click",
        () => play(item)
      );

      nextList.append(button);
    }

    closeButton.focus();
  }

  // ==============================
  // MODALNI YOPISH
  // ==============================

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

  // ==============================
  // KARTALARNI KO'RSATISH
  // ==============================

  function renderPage() {
    grid.replaceChildren();

    if (!videos.length) {
      status.textContent =
        "Hozircha yuklangan videolar mavjud emas.";

      return;
    }

    status.textContent = "";

    const totalPages = Math.ceil(
      videos.length / PAGE_SIZE
    );

    if (page >= totalPages) {
      page = 0;
    }

    const start = page * PAGE_SIZE;

    const selected = videos.slice(
      start,
      start + PAGE_SIZE
    );

    for (const video of selected) {
      grid.append(card(video));
    }
  }

  function rotate() {
    const totalPages = Math.ceil(
      videos.length / PAGE_SIZE
    );

    if (totalPages <= 1) return;

    page = (page + 1) % totalPages;

    lastRotation = Date.now();

    renderPage();
  }

  // ==============================
  // JSON FAYLNI O'QISH
  // ==============================

  async function readVideos(filename) {
    try {
      const response = await fetch(
        "./" + filename + "?t=" + Date.now(),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          filename + " HTTP " + response.status
        );
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        return data;
      }

      if (
        data &&
        Array.isArray(data.videos)
      ) {
        return data.videos;
      }

      return [];

    } catch (error) {
      console.warn(
        "F1 CINEMA:",
        filename,
        error
      );

      return null;
    }
  }

  // ==============================
  // FAQAT MP4 / WEBM YUKLASH
  // ==============================

  async function load() {
    const uploadedVideos = await readVideos(
      "uploaded-videos.json"
    );

    const previousFirst =
      videos[0]
        ? videoKey(videos[0])
        : "";

    if (uploadedVideos !== null) {
      videos = normalize(uploadedVideos);
    }

    const newFirst =
      videos[0]
        ? videoKey(videos[0])
        : "";

    if (newFirst !== previousFirst) {
      page = 0;
      lastRotation = Date.now();
    }

    renderPage();
  }

  // ==============================
  // ISHGA TUSHIRISH
  // ==============================

  load();

  setInterval(
    load,
    REFRESH_MS
  );

  setInterval(() => {
    if (
      Date.now() - lastRotation >= ROTATE_MS
    ) {
      rotate();
      lastRotation = Date.now();
    }
  }, 30000);

})();

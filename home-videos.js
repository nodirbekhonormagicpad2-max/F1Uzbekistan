(() => {
  "use strict";

  if (document.getElementById("f1-cinema-premium")) return;

  const ROTATE_MS = 15 * 60 * 1000;
  const REFRESH_MS = 5 * 60 * 1000;
  const PAGE_SIZE = 4;

  const css = document.createElement("style");

  css.textContent = `
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
      color: white;
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

    #f1-cinema-modal iframe,
    #f1-cinema-modal video {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }

    #f1-cinema-modal video {
      object-fit: contain;
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

  document.head.appendChild(css);

  const root = document.createElement("section");
  root.id = "f1-cinema-premium";
  root.setAttribute("aria-label", "F1 Cinema video markazi");

  root.innerHTML = `
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
        <h3 class="cp-rowtitle">🔥 Eng qiziqarli videolar</h3>
        <div class="cp-timer">Har 15 daqiqada almashadi</div>
      </div>

      <div class="cp-grid"></div>

      <div class="cp-status" role="status">
        Videolar yuklanmoqda…
      </div>
    </div>
  `;

  const target = document.querySelector(".calendar-section");

  if (target) {
    target.before(root);
  } else {
    (document.querySelector("main") || document.body).append(root);
  }

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

      <h4 class="cp-nexttitle">▶ Keyingi videolar</h4>
      <div class="cp-nextlist"></div>
    </div>
  `;

  document.body.append(modal);

  const grid = root.querySelector(".cp-grid");
  const status = root.querySelector(".cp-status");
  const frame = modal.querySelector(".cp-frame");
  const close = modal.querySelector(".cp-close");
  const nextList = modal.querySelector(".cp-nextlist");

  let allVideos = [];
  let pageIndex = 0;
  let lastRotation = Date.now();
  let lastFocus = null;
  let previousOverflow = "";

  function platform(video) {
    const value = String(
      video.platform || video.source || "youtube"
    ).toLowerCase();

    if (value === "facebook" || value === "fb") {
      return "facebook";
    }

    if (value === "upload" || value === "local") {
      return "upload";
    }

    if (value === "x" || value === "twitter") {
      return "x";
    }

    return "youtube";
  }

  function validYouTubeId(id) {
    return /^[A-Za-z0-9_-]{11}$/.test(String(id || ""));
  }

  function title(video) {
    if (video.title_uz) return String(video.title_uz);

    return String(video.title || "F1 videosi");
  }

  function image(video) {
    const value =
      video.thumbnail ||
      video.thumbnail_url ||
      video.thumbnailUrl;

    if (
      typeof value === "string" &&
      (/^https:\/\//i.test(value) || /^\.\//.test(value))
    ) {
      return value;
    }

    if (
      platform(video) === "youtube" &&
      validYouTubeId(video.id)
    ) {
      return (
        "https://i.ytimg.com/vi/" +
        encodeURIComponent(video.id) +
        "/hqdefault.jpg"
      );
    }

    return "";
  }

  function videoURL(video) {
    return String(
      video.video_url || video.videoUrl || video.url || ""
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

      const url = new URL(raw, window.location.origin);

      return (
        url.protocol === "https:" &&
        /\.(mp4|webm)$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function facebookURL(video) {
    try {
      const url = new URL(String(video.url || ""));

      if (
        url.protocol !== "https:" ||
        ![
          "facebook.com",
          "www.facebook.com",
          "m.facebook.com",
          "web.facebook.com"
        ].includes(url.hostname.toLowerCase())
      ) {
        return "";
      }

      if (
        !/^\/(?:reel|reels)\/[A-Za-z0-9_-]+\/?$/i.test(
          url.pathname
        ) &&
        !/^\/share\/r\/[A-Za-z0-9_-]+\/?$/i.test(
          url.pathname
        )
      ) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function embedURL(video) {
    const type = platform(video);

    if (type === "youtube") {
      if (!validYouTubeId(video.id)) return "";

      return (
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(video.id) +
        "?autoplay=1&playsinline=1&rel=0"
      );
    }

    if (type === "facebook") {
      const url = facebookURL(video);

      if (!url) return "";

      return (
        "https://www.facebook.com/plugins/video.php?href=" +
        encodeURIComponent(url) +
        "&show_text=false&autoplay=true"
      );
    }

    return "";
  }

  function videoKey(video) {
    return (
      platform(video) +
      ":" +
      String(video.id || video.url || video.video_url || "")
    );
  }

  function normalize(items) {
    const seen = new Set();

    return items.filter(video => {
      if (!video || typeof video !== "object") return false;

      const type = platform(video);

      if (type === "x") return false;

      if (
        type === "youtube" &&
        !validYouTubeId(video.id)
      ) {
        return false;
      }

      if (
        type === "facebook" &&
        !facebookURL(video)
      ) {
        return false;
      }

      if (
        type === "upload" &&
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

  function meta(video) {
    const parts = [];

    if (video.channel || video.author) {
      parts.push(String(video.channel || video.author));
    }

    const value = video.published || video.publishedAt;

    if (value) {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        parts.push(date.toLocaleDateString("uz-UZ"));
      }
    }

    return parts.join(" · ") || "F1 Uzbekistan TV";
  }

  function card(video) {
    const article = document.createElement("article");
    article.className = "cp-card";

    const button = document.createElement("button");
    button.className = "cp-thumb";
    button.type = "button";

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
      cover.className = "cp-cover";

      cover.textContent =
        platform(video) === "facebook"
          ? "f"
          : platform(video) === "upload"
            ? "▶"
            : "🎬";

      button.append(cover);
    }

    const playIcon = document.createElement("span");
    playIcon.className = "cp-play";
    playIcon.textContent = "▶";

    button.append(playIcon);

    button.addEventListener("click", () => play(video));

    const body = document.createElement("div");
    body.className = "cp-cardbody";

    const source = document.createElement("div");
    source.className = "cp-platform";

    source.textContent = {
      youtube: "YouTube",
      facebook: "Facebook Reels",
      upload: "F1 Uzbekistan TV"
    }[platform(video)];

    const heading = document.createElement("p");
    heading.className = "cp-cardtitle";
    heading.textContent = title(video);

    const small = document.createElement("div");
    small.className = "cp-cardmeta";
    small.textContent = meta(video);

    body.append(source, heading, small);
    article.append(button, body);

    return article;
  }

  function closeModal() {
    if (!modal.classList.contains("cp-open")) return;

    modal.classList.remove("cp-open");
    frame.replaceChildren();
    frame.classList.remove("cp-vertical");

    document.body.style.overflow = previousOverflow;

    if (lastFocus && lastFocus.isConnected) {
      lastFocus.focus();
    }
  }

  function play(video) {
    if (!modal.classList.contains("cp-open")) {
      lastFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
    }

    modal.querySelector(".cp-modaltitle").textContent =
      title(video);

    frame.replaceChildren();

    const type = platform(video);

    frame.classList.toggle(
      "cp-vertical",
      type === "facebook" ||
      (type === "upload" && video.aspect_ratio === "9:16")
    );

    modal.classList.add("cp-open");
    document.body.style.overflow = "hidden";

    if (type === "upload" && validUploadURL(video)) {
      const player = document.createElement("video");

      player.src = videoURL(video);
      player.controls = true;
      player.playsInline = true;
      player.preload = "metadata";
      player.autoplay = true;
      player.style.objectFit = "contain";

      frame.append(player);

      player.play().catch(() => {});
    } else {
      const url = embedURL(video);

      if (url) {
        const iframe = document.createElement("iframe");

        iframe.title = title(video);
        iframe.src = url;

        iframe.allow =
          "autoplay; encrypted-media; picture-in-picture; fullscreen";

        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";

        frame.append(iframe);
      } else {
        const message = document.createElement("div");

        message.style.cssText =
          "display:grid;place-items:center;height:100%;" +
          "padding:20px;text-align:center;color:#ddd;";

        message.textContent =
          "Bu video hozircha sayt ichida mavjud emas.";

        frame.append(message);
      }
    }

    nextList.replaceChildren();

    const others = allVideos
      .filter(item => videoKey(item) !== videoKey(video))
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

        icon.textContent =
          platform(item) === "facebook" ? "f" : "▶";

        button.append(icon);
      }

      const label = document.createElement("span");
      label.textContent = title(item);

      button.append(label);
      button.addEventListener("click", () => play(item));

      nextList.append(button);
    }

    close.focus();
  }

  close.addEventListener("click", closeModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      modal.classList.contains("cp-open")
    ) {
      closeModal();
    }
  });

  function renderPage() {
    grid.replaceChildren();

    if (!allVideos.length) {
      status.textContent = "Hozircha videolar mavjud emas.";
      return;
    }

    status.textContent = "";

    const totalPages = Math.ceil(
      allVideos.length / PAGE_SIZE
    );

    if (pageIndex >= totalPages) pageIndex = 0;

    const start = pageIndex * PAGE_SIZE;

    const selected = allVideos.slice(
      start,
      start + PAGE_SIZE
    );

    for (const video of selected) {
      grid.append(card(video));
    }
  }

  function rotate() {
    const totalPages = Math.ceil(
      allVideos.length / PAGE_SIZE
    );

    if (totalPages <= 1) return;

    pageIndex = (pageIndex + 1) % totalPages;
    lastRotation = Date.now();

    renderPage();
  }

  async function readVideos(filename) {
    try {
      const response = await fetch(
        "./" + filename + "?t=" + Date.now(),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          filename + " HTTP " + response.status
        );
      }

      const data = await response.json();

      return Array.isArray(data)
        ? data
        : Array.isArray(data.videos)
          ? data.videos
          : [];
    } catch (error) {
      console.warn("F1 CINEMA:", filename, error);
      return null;
    }
  }

  async function load() {
    const [
      youtubeVideos,
      facebookVideos,
      uploadedVideos
    ] = await Promise.all([
      readVideos("videos.json"),
      readVideos("facebook-videos.json"),
      readVideos("uploaded-videos.json")
    ]);

    const oldYouTube = allVideos.filter(
      video => platform(video) === "youtube"
    );

    const oldFacebook = allVideos.filter(
      video => platform(video) === "facebook"
    );

    const oldUploads = allVideos.filter(
      video => platform(video) === "upload"
    );

    // Yangi video qo‘shilganini aniqlash.
    const previousFirstVideo = allVideos[0]
      ? videoKey(allVideos[0])
      : "";

    // Yuklangan videolar doim birinchi o‘rinda.
    allVideos = normalize([
      ...(uploadedVideos !== null
        ? uploadedVideos
        : oldUploads),

      ...(facebookVideos !== null
        ? facebookVideos
        : oldFacebook),

      ...(youtubeVideos !== null
        ? youtubeVideos
        : oldYouTube)
    ]);

    // Yangi video paydo bo‘lsa, birinchi sahifaga qaytish.
    const newFirstVideo = allVideos[0]
      ? videoKey(allVideos[0])
      : "";

    if (newFirstVideo !== previousFirstVideo) {
      pageIndex = 0;
      lastRotation = Date.now();
    }

    renderPage();
  }

  load();

  setInterval(load, REFRESH_MS);

  setInterval(() => {
    if (Date.now() - lastRotation >= ROTATE_MS) {
      rotate();
      lastRotation = Date.now();
    }
  }, 30000);

})();

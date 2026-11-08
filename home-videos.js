
(() => {
  "use strict";

  if (document.getElementById("f1-cinema-premium")) return;

  const ROTATE_MS = 15000;
  const REFRESH_MS = 5 * 60 * 1000;

  let videos = [];
  let currentIndex = 0;
  let loading = false;
  let renderToken = 0;
  let previousOverflow = "";
  let lastFocus = null;

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
      border-radius: 4px;
      background: #e10600;
      flex-shrink: 0;
    }

    #f1-cinema-premium .cp-gallery {
      overflow: hidden;
      border: 1px solid #34343c;
      border-radius: 16px;
      background: #101014;
      box-shadow: 0 12px 35px #0007;
    }

    #f1-cinema-premium .cp-stage-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #101014;
    }

    #f1-cinema-premium .cp-stage {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      min-height: 190px;
      padding: 0;
      border: 0;
      overflow: hidden;
      background: #101014;
      color: #fff;
      cursor: pointer;
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
      display: grid;
      place-items: center;
      overflow: hidden;
      background: #101014;
    }

    #f1-cinema-premium .cp-image {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: center;
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
      color: #ccc;
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
      font-size: 28px;
      box-shadow: 0 5px 25px #0009;
      pointer-events: none;
    }

    #f1-cinema-premium .cp-caption {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      font-size: clamp(17px, 3vw, 29px);
      font-weight: 900;
      line-height: 1.25;
      text-align: left;
      text-shadow: 0 3px 12px #000;
      pointer-events: none;
      overflow-wrap: anywhere;
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

    #f1-cinema-premium .cp-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: 14px;
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
      height: min(70dvh, 650px);
      overflow: hidden;
      border-radius: 9px;
      background: #000;
    }

    #f1-cinema-modal .cp-frame.cp-vertical {
      width: min(420px, 100%);
      height: min(70dvh, 650px);
      margin: 0 auto;
    }

    #f1-cinema-modal .cp-frame.cp-square {
      width: min(650px, 100%);
      height: min(70dvh, 650px);
      margin: 0 auto;
    }

    #f1-cinema-modal .cp-frame iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #000;
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

      #f1-cinema-premium .cp-all {
        padding: 10px;
        font-size: 11px;
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
          class="cp-stage"
          aria-label="Videoni tomosha qilish"
        >
          <div class="cp-media">
            <div class="cp-placeholder">
              Videolar yuklanmoqda...
            </div>
          </div>

          <div class="cp-shade"></div>
          <div class="cp-play">▶</div>
          <div class="cp-caption"></div>
        </button>
      </div>
    </div>

    <div class="cp-footer">
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
  const status = root.querySelector(".cp-status");

  const modal = document.createElement("div");

  modal.id = "f1-cinema-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "F1 Cinema video");

  modal.innerHTML = `
    <div class="cp-dialog">
      <div class="cp-modalhead">
        <h3 class="cp-modaltitle">🎬 F1 CINEMA</h3>

        <button type="button" class="cp-close">
          ✕ Yopish
        </button>
      </div>

      <div class="cp-frame"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const frame = modal.querySelector(".cp-frame");
  const closeButton = modal.querySelector(".cp-close");

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
      video.url ||
      ""
    );
  }

  function telegramPostURL(video) {
    try {
      const url = new URL(videoURL(video));

      if (
        url.protocol !== "https:" ||
        !["t.me", "www.t.me"].includes(
          url.hostname.toLowerCase()
        )
      ) {
        return "";
      }

      const match = url.pathname.match(
        /^\/f1cinema\/(\d+)\/?$/i
      );

      if (!match) return "";

      return "https://t.me/f1cinema/" + match[1];
    } catch {
      return "";
    }
  }

  function normalize(items) {
    if (!Array.isArray(items)) return [];

    const seen = new Set();

    return items.filter(video => {
      if (
        !video ||
        typeof video !== "object" ||
        !telegramPostURL(video)
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

  function format(video) {
    const ratio = String(
      video.aspect_ratio ||
      video.aspectRatio ||
      ""
    );

    if (ratio === "9:16") return "portrait";
    if (ratio === "1:1") return "square";

    return "landscape";
  }

  function setFormat(video) {
    stage.classList.remove(
      "cp-portrait",
      "cp-square"
    );

    if (format(video) === "portrait") {
      stage.classList.add("cp-portrait");
    }

    if (format(video) === "square") {
      stage.classList.add("cp-square");
    }
  }

  function showPlaceholder(message) {
    const placeholder = document.createElement("div");

    placeholder.className = "cp-placeholder";
    placeholder.textContent = message;

    mediaBox.replaceChildren(placeholder);
  }

  function show(index) {
    if (!videos.length) return;

    currentIndex =
      (index + videos.length) % videos.length;

    const video = videos[currentIndex];
    const token = ++renderToken;

    caption.textContent = title(video);

    stage.setAttribute(
      "aria-label",
      title(video) + " — tomosha qilish"
    );

    setFormat(video);

    const thumb = thumbnailURL(video);

    if (!thumb) {
      showPlaceholder("🎬 F1 CINEMA");
      return;
    }

    showPlaceholder("Muqova yuklanmoqda...");

    const image = new Image();

    image.onload = () => {
      if (token !== renderToken) return;

      image.className = "cp-image";
      image.alt = "";

      mediaBox.replaceChildren(image);
    };

    image.onerror = () => {
      if (token !== renderToken) return;

      showPlaceholder("🎬 F1 CINEMA");
    };

    image.src = thumb;
  }

  function play(index) {
    if (!videos.length) return;

    const video = videos[index];
    const postURL = telegramPostURL(video);

    if (!postURL) return;

    if (!modal.classList.contains("cp-open")) {
      lastFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
    }

    frame.classList.remove(
      "cp-vertical",
      "cp-square"
    );

    if (format(video) === "portrait") {
      frame.classList.add("cp-vertical");
    }

    if (format(video) === "square") {
      frame.classList.add("cp-square");
    }

    const iframe = document.createElement("iframe");

    iframe.src = postURL + "?embed=1";
    iframe.title = title(video);
    iframe.allow = "autoplay; fullscreen";
    iframe.allowFullscreen = true;
    iframe.loading = "eager";

    frame.replaceChildren(iframe);

    modal.classList.add("cp-open");
    document.body.style.overflow = "hidden";

    closeButton.focus();
  }

  function closeModal() {
    if (!modal.classList.contains("cp-open")) return;

    modal.classList.remove("cp-open");
    frame.replaceChildren();

    document.body.style.overflow =
      previousOverflow;

    if (lastFocus && lastFocus.isConnected) {
      lastFocus.focus();
    }
  }

  stage.addEventListener("click", () => {
    play(currentIndex);
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

  async function loadVideos() {
    if (loading) return;

    loading = true;

    try {
      const response = await fetch(
        "./telegram-videos.json?t=" + Date.now(),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          "telegram-videos.json HTTP " +
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
          "Hozircha Telegram videolari mavjud emas.";

        caption.textContent = "";

        showPlaceholder(
          "Hozircha videolar mavjud emas."
        );

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
        show(currentIndex);
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

  setInterval(loadVideos, REFRESH_MS);
})();

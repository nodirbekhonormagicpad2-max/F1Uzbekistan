
(() => {
  "use strict";

  if (document.getElementById("f1NewsCarousel")) return;

  const AUTO_DELAY = 15000;
  const REFRESH_DELAY = 300000;
  const MAX_NEWS = 10;

  const style = document.createElement("style");

  style.textContent = `
    .f1-news {
      margin-top: 20px;
      padding: 20px;
      background: #101116;
      border: 1px solid #303039;
      border-top: 3px solid #e10600;
      border-radius: 16px;
      color: #fff;
    }

    .f1-news h2 {
      margin: 0 0 18px;
      font-size: clamp(21px, 4vw, 28px);
      font-weight: 900;
    }

    .f1-carousel {
      position: relative;
      overflow: hidden;
      border-radius: 15px;
      border: 1px solid #42434c;
      background: linear-gradient(145deg, #202431, #090b11);
      touch-action: pan-y;
    }

    .f1-slide {
      min-height: 290px;
      padding: 20px 55px 28px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 13px;
      box-sizing: border-box;
    }

    .f1-slide-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      display: block;
      background: #151821;
    }

    .f1-slide-placeholder {
      height: 170px;
      border-radius: 12px;
      background: linear-gradient(
        135deg, #e10600, #242633, #101116
      );
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 55px;
    }

    .f1-slide-source {
      color: #ff6864;
      font-size: 12px;
      font-weight: 800;
    }

    .f1-slide-title {
      font-size: clamp(20px, 4vw, 30px);
      font-weight: 850;
      line-height: 1.35;
      margin: 0;
    }

    .f1-slide-title a {
      color: #fff;
      text-decoration: none;
    }

    .f1-slide-title a:hover {
      color: #ff6864;
    }

    .f1-slide-date {
      color: #aeb1bd;
      font-size: 12px;
    }

    .f1-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2;
      width: 40px;
      height: 48px;
      border-radius: 30px;
      border: 1px solid #697080;
      background: #101724;
      color: white;
      font-size: 27px;
      cursor: pointer;
    }

    .f1-arrow.prev {
      left: 8px;
    }

    .f1-arrow.next {
      right: 8px;
    }

    .f1-arrow:hover {
      background: #e10600;
    }

    .f1-arrow:focus-visible,
    .f1-dot:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    .f1-arrow[hidden] {
      display: none;
    }

    .f1-dots {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .f1-dot {
      width: 9px;
      height: 9px;
      padding: 0;
      border: 0;
      border-radius: 20px;
      background: #505563;
      cursor: pointer;
    }

    .f1-dot.active {
      width: 28px;
      background: #e10600;
    }

    .f1-news-message {
      color: #aaa;
      font-size: 14px;
      padding: 20px;
    }

    @media (max-width: 600px) {
      .f1-news {
        padding: 15px;
      }

      .f1-slide {
        min-height: 300px;
        padding: 20px 48px 25px;
      }

      .f1-slide-image {
        height: 170px;
      }

      .f1-slide-title {
        font-size: 21px;
      }

      .f1-arrow {
        width: 37px;
        height: 44px;
      }
    }
  `;

  document.head.appendChild(style);

  const section = document.createElement("section");

  section.className = "f1-news";
  section.id = "f1NewsCarousel";
  section.setAttribute("aria-label", "F1 yangiliklari");

  section.innerHTML = `
    <h2>🏎️ F1 YANGILIKLARI</h2>

    <div
      class="f1-carousel"
      aria-roledescription="carousel"
      aria-label="Formula 1 yangiliklari"
    >
      <button
        class="f1-arrow prev"
        aria-label="Oldingi yangilik"
        type="button"
      >‹</button>

      <div class="f1-slide" aria-live="off">
        <p class="f1-news-message">
          Yangiliklar yuklanmoqda...
        </p>
      </div>

      <button
        class="f1-arrow next"
        aria-label="Keyingi yangilik"
        type="button"
      >›</button>
    </div>

    <div
      class="f1-dots"
      aria-label="Yangiliklar tanlovi"
    ></div>
  `;

  const calendar = document.querySelector(".calendar-section");
  const main = document.querySelector("main");

  if (calendar) {
    calendar.before(section);
  } else if (main) {
    main.appendChild(section);
  } else {
    document.body.appendChild(section);
  }

  const slide = section.querySelector(".f1-slide");
  const dots = section.querySelector(".f1-dots");
  const carousel = section.querySelector(".f1-carousel");
  const prev = section.querySelector(".prev");
  const next = section.querySelector(".next");

  let articles = [];
  let index = 0;
  let timer = null;
  let touchStartX = null;
  let loading = false;
  let pointerInside = false;
  let focusInside = false;

  function stopAuto() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function canAutoPlay() {
    return (
      articles.length > 1 &&
      !document.hidden &&
      !pointerInside &&
      !focusInside
    );
  }

  function startAuto() {
    stopAuto();

    if (!canAutoPlay()) return;

    timer = setTimeout(() => {
      timer = null;
      show(index + 1);
      startAuto();
    }, AUTO_DELAY);
  }

  function createPlaceholder() {
    const placeholder = document.createElement("div");

    placeholder.className = "f1-slide-placeholder";
    placeholder.textContent = "🏎️";

    return placeholder;
  }

  function show(number) {
    if (!articles.length) return;

    index = (
      (number % articles.length) + articles.length
    ) % articles.length;

    const item = articles[index];

    slide.replaceChildren();

    if (
      typeof item.image === "string" &&
      item.image.startsWith("https://")
    ) {
      const image = document.createElement("img");

      image.className = "f1-slide-image";
      image.alt = item.title;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";

      image.onerror = () => {
        image.replaceWith(createPlaceholder());
      };

      image.src = item.image;
      slide.appendChild(image);
    } else {
      slide.appendChild(createPlaceholder());
    }

    const source = document.createElement("div");
    source.className = "f1-slide-source";
    source.textContent = item.source || "Formula 1";

    const heading = document.createElement("h3");
    heading.className = "f1-slide-title";

    const link = document.createElement("a");

    link.href =
      "./article.html?id=" +
      encodeURIComponent(item.url);

    link.textContent = item.title;
    heading.appendChild(link);

    const date = document.createElement("div");
    date.className = "f1-slide-date";

    if (item.date) {
      const d = new Date(item.date);

      if (!Number.isNaN(d.getTime())) {
        date.textContent = d.toLocaleDateString(
          "uz-UZ",
          {
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        );
      }
    }

    slide.append(source, heading, date);

    dots.replaceChildren();

    articles.forEach((_, i) => {
      const dot = document.createElement("button");

      dot.className =
        "f1-dot" + (i === index ? " active" : "");

      dot.type = "button";

      dot.setAttribute(
        "aria-label",
        `${i + 1}-yangilik`
      );

      dot.setAttribute(
        "aria-current",
        i === index ? "true" : "false"
      );

      dot.addEventListener("click", () => {
        show(i);
        startAuto();
      });

      dots.appendChild(dot);
    });

    prev.hidden = articles.length < 2;
    next.hidden = articles.length < 2;
  }

  prev.addEventListener("click", () => {
    show(index - 1);
    startAuto();
  });

  next.addEventListener("click", () => {
    show(index + 1);
    startAuto();
  });

  carousel.addEventListener(
    "touchstart",
    event => {
      touchStartX = event.changedTouches[0].screenX;
    },
    { passive: true }
  );

  carousel.addEventListener(
    "touchend",
    event => {
      if (touchStartX === null) return;

      const difference =
        event.changedTouches[0].screenX - touchStartX;

      touchStartX = null;

      if (Math.abs(difference) > 45) {
        show(index + (difference < 0 ? 1 : -1));
        startAuto();
      }
    },
    { passive: true }
  );

  carousel.addEventListener("touchcancel", () => {
    touchStartX = null;
  });

  carousel.addEventListener("mouseenter", () => {
    pointerInside = true;
    stopAuto();
  });

  carousel.addEventListener("mouseleave", () => {
    pointerInside = false;
    startAuto();
  });

  carousel.addEventListener("focusin", () => {
    focusInside = true;
    stopAuto();
  });

  carousel.addEventListener("focusout", event => {
    if (!carousel.contains(event.relatedTarget)) {
      focusInside = false;
      startAuto();
    }
  });

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        stopAuto();
      } else {
        startAuto();
      }
    }
  );

  async function loadNews() {
    if (loading) return;

    loading = true;

    try {
      const response = await fetch(
        "./news.json?t=" + Date.now(),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Yangiliklar formati noto'g'ri");
      }

      const valid = data.filter(item =>
        item &&
        typeof item.title === "string" &&
        item.title.trim() &&
        typeof item.url === "string" &&
        item.url.startsWith("https://") &&
        item.lang === "uz"
      ).slice(0, MAX_NEWS);

      if (!valid.length) {
        throw new Error("O'zbekcha yangiliklar mavjud emas");
      }

      const oldUrl = articles[index]?.url;
      const previousUrls = articles.map(item => item.url);

      articles = valid;

      const previousIndex = articles.findIndex(
        item => item.url === oldUrl
      );

      const newUrls = articles.map(item => item.url);

      const changed =
        JSON.stringify(previousUrls) !== JSON.stringify(newUrls);

      if (changed || !slide.querySelector(".f1-slide-title")) {
        show(previousIndex >= 0 ? previousIndex : 0);
        startAuto();
      }

    } catch (error) {
      console.warn("F1 yangiliklari:", error);

      if (!articles.length) {
        slide.replaceChildren();

        const message = document.createElement("p");
        message.className = "f1-news-message";

        message.textContent =
          "O'zbekcha yangiliklar tayyorlanmoqda. " +
          "Birozdan so'ng qayta tekshiring.";

        slide.appendChild(message);

        prev.hidden = true;
        next.hidden = true;
        dots.replaceChildren();
      }
    } finally {
      loading = false;
    }
  }

  loadNews();

  // Yangiliklarni har 5 daqiqada qayta yuklash.
  setInterval(loadNews, REFRESH_DELAY);
})();

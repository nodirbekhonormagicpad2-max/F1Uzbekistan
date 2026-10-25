
(() => {
  'use strict';

  if (document.getElementById('f1-cinema')) return;

  const css = document.createElement('style');
  css.textContent = `
    #f1-cinema {
      --red: #e10600;
      --bg: #101014;
      --muted: #aaaab5;
      max-width: 1180px;
      margin: 36px auto;
      padding: 0 14px;
      color: white;
      font-family: Arial, Helvetica, sans-serif;
    }

    #f1-cinema * {
      box-sizing: border-box;
    }

    #f1-cinema .cinema-panel {
      background: linear-gradient(145deg, #1b1b23, #0b0b0e);
      border: 1px solid #33333d;
      border-radius: 18px;
      padding: clamp(14px, 3vw, 25px);
      overflow: hidden;
    }

    #f1-cinema .cinema-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }

    #f1-cinema h2 {
      font-size: clamp(23px, 4vw, 34px);
      font-weight: 900;
      letter-spacing: -.5px;
      margin: 0;
    }

    #f1-cinema h2 span {
      color: #ff3636;
    }

    #f1-cinema .cinema-sub {
      color: #9b9ba6;
      font-size: 12px;
      margin-top: 6px;
    }

    #f1-cinema .cinema-all {
      color: white;
      text-decoration: none;
      background: var(--red);
      padding: 11px 16px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 900;
    }

    #f1-cinema .cinema-feature {
      position: relative;
      width: 100%;
      min-height: 240px;
      aspect-ratio: 16/8;
      border: 1px solid #454550;
      border-radius: 16px;
      background: #151515;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      display: block;
      text-align: left;
      color: white;
    }

    #f1-cinema .cinema-feature img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform .4s ease;
    }

    #f1-cinema .cinema-feature:hover img {
      transform: scale(1.04);
    }

    #f1-cinema .cinema-shade {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        0deg,
        rgba(0,0,0,.96),
        rgba(0,0,0,.25) 55%,
        rgba(0,0,0,.05)
      );
    }

    #f1-cinema .cinema-live {
      position: absolute;
      top: 15px;
      left: 15px;
      background: #e10600;
      padding: 7px 11px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    #f1-cinema .cinema-feature-content {
      position: absolute;
      left: clamp(16px, 4vw, 34px);
      right: 16px;
      bottom: clamp(16px, 4vw, 32px);
      z-index: 1;
    }

    #f1-cinema .cinema-feature-title {
      font-size: clamp(20px, 4vw, 34px);
      font-weight: 900;
      line-height: 1.2;
      max-width: 740px;
      text-shadow: 0 3px 12px #000;
    }

    #f1-cinema .cinema-feature-meta {
      color: #d4d4da;
      font-size: 12px;
      margin-top: 10px;
    }

    #f1-cinema .cinema-watch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 17px;
      background: #e10600;
      color: white;
      border-radius: 8px;
      padding: 12px 17px;
      font-size: 13px;
      font-weight: 900;
    }

    #f1-cinema .cinema-row-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 26px 0 14px;
    }

    #f1-cinema h3 {
      margin: 0;
      font-size: 19px;
      font-weight: 900;
    }

    #f1-cinema .cinema-arrows {
      display: flex;
      gap: 7px;
    }

    #f1-cinema .cinema-arrow {
      border: 1px solid #494955;
      background: #25252d;
      color: white;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      font-size: 20px;
      cursor: pointer;
    }

    #f1-cinema .cinema-track {
      display: flex;
      gap: 13px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      scrollbar-color: #555 #18181e;
      padding: 2px 0 12px;
    }

    #f1-cinema .cinema-card {
      flex: 0 0 clamp(210px, 29%, 310px);
      min-width: 0;
      border: 1px solid #353540;
      border-radius: 13px;
      overflow: hidden;
      background: #1a1a22;
      scroll-snap-align: start;
    }

    #f1-cinema .cinema-thumb {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 16/9;
      border: 0;
      padding: 0;
      background: #25252a;
      cursor: pointer;
    }

    #f1-cinema .cinema-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #f1-cinema .cinema-play {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: 53px;
      height: 53px;
      border-radius: 50%;
      background: #e10600;
      color: white;
      font-size: 22px;
      box-shadow: 0 5px 20px #0009;
    }

    #f1-cinema .cinema-card-body {
      padding: 13px;
    }

    #f1-cinema .cinema-card-title {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.4;
      min-height: 40px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #f1-cinema .cinema-meta {
      color: #9999a5;
      font-size: 11px;
      margin-top: 9px;
    }

    #f1-cinema .cinema-status {
      padding: 18px 0;
      color: #aaa;
      font-size: 13px;
    }

    #f1-cinema-player {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0,0,0,.96);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 15px;
    }

    #f1-cinema-player.open {
      display: flex;
    }

    #f1-cinema-player .cinema-dialog {
      width: min(960px, 100%);
    }

    #f1-cinema-player .cinema-close {
      display: block;
      margin: 0 0 12px auto;
      padding: 11px 17px;
      border: 0;
      border-radius: 8px;
      background: #e10600;
      color: white;
      font-weight: 900;
      cursor: pointer;
    }

    #f1-cinema-player .cinema-video {
      width: 100%;
      aspect-ratio: 16/9;
      background: black;
      border: 1px solid #333;
      border-radius: 10px;
      overflow: hidden;
    }

    #f1-cinema-player iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }

    @media(max-width:600px) {
      #f1-cinema {
        margin: 24px auto;
        padding: 0 10px;
      }

      #f1-cinema .cinema-panel {
        padding: 12px;
        border-radius: 13px;
      }

      #f1-cinema .cinema-feature {
        aspect-ratio: 4/4;
        min-height: 270px;
      }

      #f1-cinema .cinema-feature-title {
        font-size: 21px;
      }

      #f1-cinema .cinema-card {
        flex-basis: 78%;
      }

      #f1-cinema .cinema-all {
        font-size: 11px;
        padding: 10px 12px;
      }
    }
  `;

  document.head.appendChild(css);

  // Inglizcha sarlavhalarni o‘zbekchalashtirish
  function uzTitle(value) {
    const original = String(value || '').trim();

    if (!original) return 'F1 videosi';

    const t = original
      .replace(/&amp;/gi, '&')
      .toLowerCase();

    const names = [
      ['fernando alonso', 'Fernando Alonso'],
      ['max verstappen', 'Maks Verstappen'],
      ['lewis hamilton', 'Lyuis Hemilton'],
      ['charles leclerc', 'Sharl Lekler'],
      ['lando norris', 'Lando Norris'],
      ['oscar piastri', 'Oskar Piastri'],
      ['george russell', 'Jorj Rassell'],
      ['carlos sainz', 'Karlos Sayns'],
      ['kimi antonelli', 'Kimi Antonelli'],
      ['toto wolff', 'Toto Volf']
    ];

    let person = '';

    for (const [en, uz] of names) {
      if (t.includes(en)) {
        person = uz;
        break;
      }
    }

    let gp = '';

    if (/united states|usa gp|austin/.test(t)) {
      gp = 'AQSH Gran-prisi';
    } else if (/mexico|mexican/.test(t)) {
      gp = 'Meksika Gran-prisi';
    } else if (/brazil|sao paulo|são paulo/.test(t)) {
      gp = 'Braziliya Gran-prisi';
    } else if (/las vegas/.test(t)) {
      gp = 'Las-Vegas Gran-prisi';
    } else if (/qatar/.test(t)) {
      gp = 'Qatar Gran-prisi';
    } else if (/abu dhabi/.test(t)) {
      gp = 'Abu-Dabi Gran-prisi';
    }

    const prefix = gp ? gp + ' — ' : '';

    if (/crash|collision|accident|hits the wall/.test(t)) {
      return prefix + (
        person
          ? '💥 ' + person + ' avariyaga uchradi'
          : '💥 Poygadagi avariya lavhalari'
      );
    }

    if (/fire|flames|burning/.test(t)) {
      return prefix + '🔥 Boliddagi yong‘in';
    }

    if (/drivers react|driver reactions/.test(t)) {
      return prefix + '🎤 Saralashdan keyin pilotlar fikri';
    }

    if (/qualifying leaderboard/.test(t)) {
      return prefix + '📊 Saralash natijalari';
    }

    if (/qualifying/.test(t) && /highlight/.test(t)) {
      return prefix + '🏁 Saralashning eng qiziqarli lahzalari';
    }

    if (/qualifying/.test(t) && /pole/.test(t)) {
      return prefix + '🏁 Poul-pozitsiya uchun kurash';
    }

    if (/race/.test(t) && /highlight/.test(t)) {
      return prefix + '🏎️ Poyganing eng qiziqarli lahzalari';
    }

    if (/interview/.test(t)) {
      return prefix + (
        person
          ? '🎤 ' + person + ' bilan intervyu'
          : '🎤 F1 intervyusi'
      );
    }

    if (/overtak/.test(t)) {
      return prefix + '⚡ Ajoyib quvib o‘tishlar';
    }

    return original.replace(/&amp;/gi, '&');
  }

  function videoTitle(v) {
    return String(v.title_uz || uzTitle(v.title));
  }

  function thumbnail(v) {
    if (
      typeof v.thumbnail === 'string' &&
      /^https:\/\//i.test(v.thumbnail)
    ) {
      return v.thumbnail;
    }

    return 'https://i.ytimg.com/vi/' +
      encodeURIComponent(v.id) +
      '/hqdefault.jpg';
  }

  function metaText(v) {
    const date = new Date(v.published);

    return [
      v.channel || '',
      Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('uz-UZ')
    ].filter(Boolean).join(' · ');
  }

  const section = document.createElement('section');
  section.id = 'f1-cinema';

  section.innerHTML = `
    <div class="cinema-panel">
      <div class="cinema-heading">
        <div>
          <h2>🎬 F1 <span>CINEMA</span></h2>
          <div class="cinema-sub">
            Poyga, saralash, avariyalar va eng qiziqarli lavhalar
          </div>
        </div>
        <a class="cinema-all" href="./videos.html">
          Barcha videolar →
        </a>
      </div>

      <div class="cinema-feature-holder"></div>

      <div class="cinema-row-head">
        <h3>🔥 So‘nggi videolar</h3>
        <div class="cinema-arrows">
          <button class="cinema-arrow cinema-prev"
                  type="button"
                  aria-label="Oldingi videolar">‹</button>
          <button class="cinema-arrow cinema-next"
                  type="button"
                  aria-label="Keyingi videolar">›</button>
        </div>
      </div>

      <div class="cinema-track"></div>
      <div class="cinema-status">Videolar yuklanmoqda…</div>
    </div>
  `;

  const target = document.querySelector(
    '.calendar-section, #calendar-section, #calendar'
  );

  if (target && target.parentNode) {
    target.parentNode.insertBefore(section, target);
  } else {
    (document.querySelector('main') || document.body)
      .appendChild(section);
  }

  const overlay = document.createElement('div');
  overlay.id = 'f1-cinema-player';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'F1 video pleyeri');

  overlay.innerHTML = `
    <div class="cinema-dialog">
      <button class="cinema-close" type="button">
        ✕ Yopish
      </button>
      <div class="cinema-video"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const videoBox = overlay.querySelector('.cinema-video');
  const closeButton = overlay.querySelector('.cinema-close');

  function closePlayer() {
    overlay.classList.remove('open');
    videoBox.replaceChildren();
    document.body.style.overflow = '';
  }

  function openPlayer(id) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(String(id))) return;

    const iframe = document.createElement('iframe');

    iframe.src =
      'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(id) +
      '?autoplay=1&rel=0&playsinline=1';

    iframe.title = 'F1 Uzbekistan video';
    iframe.allow =
      'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;

    videoBox.replaceChildren(iframe);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  }

  closeButton.addEventListener('click', closePlayer);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePlayer();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' &&
        overlay.classList.contains('open')) {
      closePlayer();
    }
  });

  function makeImage(v) {
    const img = document.createElement('img');
    img.src = thumbnail(v);
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }

  function render(videos) {
    const featureHolder =
      section.querySelector('.cinema-feature-holder');

    const track = section.querySelector('.cinema-track');
    const status = section.querySelector('.cinema-status');

    featureHolder.replaceChildren();
    track.replaceChildren();

    const list = videos.filter(v =>
      v &&
      /^[A-Za-z0-9_-]{11}$/.test(String(v.id || ''))
    );

    if (!list.length) {
      status.textContent = 'Hozircha videolar mavjud emas.';
      return;
    }

    status.textContent = '';

    const featured = list[0];

    const feature = document.createElement('button');
    feature.type = 'button';
    feature.className = 'cinema-feature';
    feature.setAttribute(
      'aria-label',
      'Videoni ko‘rish: ' + videoTitle(featured)
    );

    const image = makeImage(featured);
    image.loading = 'eager';

    const shade = document.createElement('span');
    shade.className = 'cinema-shade';

    const badge = document.createElement('span');
    badge.className = 'cinema-live';
    badge.textContent = '▶ YANGI VIDEO';

    const content = document.createElement('span');
    content.className = 'cinema-feature-content';

    const title = document.createElement('span');
    title.className = 'cinema-feature-title';
    title.style.display = 'block';
    title.textContent = videoTitle(featured);

    const meta = document.createElement('span');
    meta.className = 'cinema-feature-meta';
    meta.style.display = 'block';
    meta.textContent = metaText(featured);

    const watch = document.createElement('span');
    watch.className = 'cinema-watch';
    watch.textContent = '▶ HOZIR TOMOSHA QILISH';

    content.append(title, meta, watch);
    feature.append(image, shade, badge, content);

    feature.addEventListener('click', () => {
      openPlayer(featured.id);
    });

    featureHolder.appendChild(feature);

    for (const v of list.slice(1, 13)) {
      const card = document.createElement('article');
      card.className = 'cinema-card';

      const thumb = document.createElement('button');
      thumb.className = 'cinema-thumb';
      thumb.type = 'button';
      thumb.setAttribute(
        'aria-label',
        'Videoni ko‘rish: ' + videoTitle(v)
      );

      const play = document.createElement('span');
      play.className = 'cinema-play';
      play.textContent = '▶';

      thumb.append(makeImage(v), play);

      thumb.addEventListener('click', () => {
        openPlayer(v.id);
      });

      const body = document.createElement('div');
      body.className = 'cinema-card-body';

      const heading = document.createElement('p');
      heading.className = 'cinema-card-title';
      heading.textContent = videoTitle(v);

      const meta = document.createElement('div');
      meta.className = 'cinema-meta';
      meta.textContent = metaText(v);

      body.append(heading, meta);
      card.append(thumb, body);
      track.appendChild(card);
    }
  }

  const track = section.querySelector('.cinema-track');

  section.querySelector('.cinema-prev')
    .addEventListener('click', () => {
      track.scrollBy({
        left: -track.clientWidth * 0.8,
        behavior: 'smooth'
      });
    });

  section.querySelector('.cinema-next')
    .addEventListener('click', () => {
      track.scrollBy({
        left: track.clientWidth * 0.8,
        behavior: 'smooth'
      });
    });

  async function load() {
    try {
      const response = await fetch(
        './videos.json?t=' + Date.now(),
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();

      render(
        Array.isArray(data.videos)
          ? data.videos
          : []
      );
    } catch (error) {
      section.querySelector('.cinema-status').textContent =
        'Videolarni yuklashda xatolik: ' + error.message;
    }
  }

  load();

  // Har 5 daqiqada yangilash
  setInterval(load, 300000);
})();

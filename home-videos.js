
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #f1-home-videos {
      max-width: 1180px;
      margin: 36px auto;
      padding: 0 16px;
      color: #f5f5f7;
      font-family: system-ui, Arial, sans-serif;
    }
    #f1-home-videos * { box-sizing: border-box; }
    #f1-home-videos .f1vh-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 17px;
    }
    #f1-home-videos h2 {
      margin: 0;
      font-size: clamp(22px, 4vw, 31px);
      font-weight: 900;
    }
    #f1-home-videos h2 span { color: #ff3535; }
    #f1-home-videos .f1vh-all {
      background: #e10600;
      color: white;
      text-decoration: none;
      padding: 10px 15px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
    }
    #f1-home-videos .f1vh-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    #f1-home-videos .f1vh-card {
      background: #15171e;
      border: 1px solid #30313c;
      border-radius: 12px;
      overflow: hidden;
      min-width: 0;
    }
    #f1-home-videos .f1vh-thumb {
      width: 100%;
      display: block;
      position: relative;
      aspect-ratio: 16/9;
      border: 0;
      padding: 0;
      background: #24252c;
      cursor: pointer;
    }
    #f1-home-videos .f1vh-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #f1-home-videos .f1vh-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #e10600;
      color: white;
      border-radius: 10px;
      padding: 8px 15px;
      font-size: 23px;
    }
    #f1-home-videos .f1vh-body { padding: 12px; }
    #f1-home-videos .f1vh-title {
      font-size: 14px;
      line-height: 1.4;
      font-weight: 800;
      margin: 0 0 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    #f1-home-videos .f1vh-meta {
      font-size: 12px;
      color: #adb0bb;
    }
    #f1-home-videos .f1vh-status {
      color: #b8bac4;
      padding: 12px 0;
    }
    #f1vh-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #000e;
      display: none;
      place-items: center;
      padding: 14px;
    }
    #f1vh-overlay.f1vh-open { display: grid; }
    #f1vh-overlay .f1vh-dialog {
      width: min(900px, 100%);
    }
    #f1vh-overlay .f1vh-close {
      display: block;
      margin: 0 0 9px auto;
      background: #e10600;
      border: 0;
      color: #fff;
      border-radius: 6px;
      padding: 10px 15px;
      cursor: pointer;
    }
    #f1vh-overlay .f1vh-player {
      aspect-ratio: 16/9;
      background: #000;
    }
    #f1vh-overlay iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }
    @media (max-width: 750px) {
      #f1-home-videos .f1vh-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 450px) {
      #f1-home-videos .f1vh-grid {
        grid-template-columns: 1fr;
      }
      #f1-home-videos .f1vh-card {
        display: grid;
        grid-template-columns: 44% 56%;
      }
      #f1-home-videos .f1vh-body { padding: 9px; }
      #f1-home-videos .f1vh-title { font-size: 12px; }
      #f1-home-videos .f1vh-meta { font-size: 11px; }
    }
  `;
  document.head.append(style);

  const section = document.createElement('section');
  section.id = 'f1-home-videos';
  section.innerHTML = `
    <div class="f1vh-head">
      <h2>🎬 F1 <span>VIDEO LAVHALAR</span></h2>
      <a class="f1vh-all" href="./videos.html">
        Barcha videolar →
      </a>
    </div>
    <div class="f1vh-grid" aria-live="polite"></div>
    <p class="f1vh-status">Videolar yuklanmoqda…</p>
  `;

  const target = document.querySelector(
    '#calendar-section, .calendar-section, #calendar, [id*="calendar"]'
  );

  if (target && target.parentNode) {
    target.parentNode.insertBefore(section, target);
  } else {
    (document.querySelector('main') || document.body)
      .append(section);
  }

  const overlay = document.createElement('div');
  overlay.id = 'f1vh-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'F1 video');

  overlay.innerHTML = `
    <div class="f1vh-dialog">
      <button class="f1vh-close" type="button">
        ✕ Yopish
      </button>
      <div class="f1vh-player"></div>
    </div>
  `;

  document.body.append(overlay);

  const player = overlay.querySelector('.f1vh-player');

  function closeVideo() {
    overlay.classList.remove('f1vh-open');
    player.replaceChildren();
    document.body.style.overflow = '';
  }

  overlay.querySelector('.f1vh-close').onclick = closeVideo;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeVideo();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeVideo();
  });

  function showVideo(id) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;

    const iframe = document.createElement('iframe');
    iframe.src =
      'https://www.youtube-nocookie.com/embed/' +
      id +
      '?autoplay=1';

    iframe.title = 'F1 video';
    iframe.allow =
      'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;

    player.replaceChildren(iframe);
    overlay.classList.add('f1vh-open');
    document.body.style.overflow = 'hidden';
  }

  // Inglizcha sarlavhalarni o‘zbekchalashtirish
  function uzTitle(originalTitle) {
    const original = String(originalTitle || '').trim();

    if (!original) return 'F1 videosi';

    // Agar JSON ichida o‘zbekcha sarlavha bo‘lsa,
    // uni bevosita ishlatish mumkin.
    const t = original
      .replace(/&amp;/gi, '&')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .toLowerCase();

    const driverNames = [
      ['max verstappen', 'Maks Verstappen'],
      ['lewis hamilton', 'Lyuis Hemilton'],
      ['charles leclerc', 'Sharl Lekler'],
      ['lando norris', 'Lando Norris'],
      ['oscar piastri', 'Oskar Piastri'],
      ['george russell', 'Jorj Rassell'],
      ['carlos sainz', 'Karlos Sayns'],
      ['fernando alonso', 'Fernando Alonso'],
      ['kimi antonelli', 'Kimi Antonelli'],
      ['oliver bearman', 'Oliver Berman'],
      ['alex albon', 'Aleks Albon'],
      ['pierre gasly', 'Pyer Gasli'],
      ['esteban ocon', 'Esteban Okon'],
      ['nico hulkenberg', 'Niko Hyulkenberg'],
      ['toto wolff', 'Toto Volf']
    ];

    let person = '';

    for (const [english, uzbek] of driverNames) {
      if (t.includes(english)) {
        person = uzbek;
        break;
      }
    }

    let event = '';

    if (/united states|usa gp|us grand prix|austin/.test(t)) {
      event = 'AQSH Gran-prisi';
    } else if (/mexico|mexican/.test(t)) {
      event = 'Meksika Gran-prisi';
    } else if (/brazil|são paulo|sao paulo/.test(t)) {
      event = 'Braziliya Gran-prisi';
    } else if (/las vegas/.test(t)) {
      event = 'Las-Vegas Gran-prisi';
    } else if (/qatar/.test(t)) {
      event = 'Qatar Gran-prisi';
    } else if (/abu dhabi/.test(t)) {
      event = 'Abu-Dabi Gran-prisi';
    } else if (/british|silverstone/.test(t)) {
      event = 'Britaniya Gran-prisi';
    } else if (/monaco/.test(t)) {
      event = 'Monako Gran-prisi';
    } else if (/italian|monza/.test(t)) {
      event = 'Italiya Gran-prisi';
    } else if (/japanese|suzuka/.test(t)) {
      event = 'Yaponiya Gran-prisi';
    }

    const prefix = event ? event + ': ' : '';

    if (/crash|collision|accident|hits the wall/.test(t)) {
      return prefix + (
        person
          ? `💥 ${person} avariyaga uchradi`
          : '💥 Poygadagi avariya lavhalari'
      );
    }

    if (/fire|flames|burning/.test(t)) {
      return prefix + '🔥 Boliddagi yong‘in lavhalari';
    }

    if (/drivers react|driver reactions/.test(t)) {
      return prefix + '🎤 Saralashdan keyin pilotlar fikri';
    }

    if (/post.qualifying interview/.test(t)) {
      return prefix + (
        person
          ? `🎤 ${person} bilan saralashdan keyingi intervyu`
          : '🎤 Saralashdan keyingi intervyu'
      );
    }

    if (/qualifying/.test(t) && /highlight/.test(t)) {
      return prefix + '🏁 Saralashning eng qiziqarli lahzalari';
    }

    if (/qualifying leaderboard/.test(t)) {
      return prefix + '📊 Saralash natijalari';
    }

    if (/qualifying/.test(t) && /pole/.test(t)) {
      return prefix + '🏁 Poul-pozitsiya uchun kurash';
    }

    if (/race/.test(t) && /highlight/.test(t)) {
      return prefix + '🏎️ Poyganing eng qiziqarli lahzalari';
    }

    if (/overtak|passes/.test(t)) {
      return prefix + '⚡ Ajoyib quvib o‘tishlar';
    }

    if (/interview/.test(t)) {
      return prefix + (
        person
          ? `🎤 ${person} bilan intervyu`
          : '🎤 F1 intervyusi'
      );
    }

    if (/reaction|reacts/.test(t)) {
      return prefix + (
        person
          ? `🎤 ${person}ning fikrlari`
          : '🎤 Pilotlarning fikrlari'
      );
    }

    if (/practice|free practice/.test(t)) {
      return prefix + '🏎️ Erkin mashg‘ulot lavhalari';
    }

    if (/sprint/.test(t) && /highlight/.test(t)) {
      return prefix + '🏁 Sprint poygasining eng yaxshi lahzalari';
    }

    // Noma'lum sarlavhani noto‘g‘ri tarjima qilmaslik
    // uchun asl nomini saqlaymiz.
    return original.replace(/&amp;/gi, '&');
  }

  function render(videos) {
    const grid = section.querySelector('.f1vh-grid');
    const status = section.querySelector('.f1vh-status');

    grid.replaceChildren();

    const list = videos
      .filter(v =>
        v &&
        /^[A-Za-z0-9_-]{11}$/.test(String(v.id || ''))
      )
      .slice(0, 6);

    status.textContent = list.length
      ? ''
      : 'Hozircha videolar yo‘q. GitHub Actions orqali videolarni yangilang.';

    for (const v of list) {
      const card = document.createElement('article');
      card.className = 'f1vh-card';

      const btn = document.createElement('button');
      btn.className = 'f1vh-thumb';
      btn.type = 'button';

      const translatedTitle = String(
        v.title_uz || uzTitle(v.title)
      );

      btn.setAttribute(
        'aria-label',
        'Videoni ko‘rish: ' + translatedTitle
      );

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';

      img.src =
        typeof v.thumbnail === 'string' &&
        /^https:\/\//.test(v.thumbnail)
          ? v.thumbnail
          : 'https://i.ytimg.com/vi/' +
            v.id +
            '/hqdefault.jpg';

      const play = document.createElement('span');
      play.className = 'f1vh-play';
      play.textContent = '▶';

      btn.append(img, play);
      btn.onclick = () => showVideo(v.id);

      const body = document.createElement('div');
      body.className = 'f1vh-body';

      const h = document.createElement('p');
      h.className = 'f1vh-title';
      h.textContent = translatedTitle;

      const meta = document.createElement('div');
      meta.className = 'f1vh-meta';

      const date = new Date(v.published);

      meta.textContent = [
        v.channel || '',
        isNaN(date.getTime())
          ? ''
          : date.toLocaleDateString('uz-UZ')
      ]
        .filter(Boolean)
        .join(' · ');

      body.append(h, meta);
      card.append(btn, body);
      grid.append(card);
    }
  }

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
    } catch (e) {
      section.querySelector('.f1vh-status').textContent =
        'Videolarni yuklashda xatolik: ' + e.message;
    }
  }

  load();

  // Har 5 daqiqada yangi videolarni tekshirish
  setInterval(load, 300000);
})();

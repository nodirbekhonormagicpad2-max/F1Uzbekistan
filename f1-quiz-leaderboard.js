/* F1 QUIZ PRO — Cloudflare D1 reytingi */

(() => {
  'use strict';

  const API = 'https://f1-quiz-api.nodirbekhonormagicpad2.workers.dev';

  const $ = id => document.getElementById(id);
  const levels = ['easy', 'medium', 'hard'];

  const cache = {
    easy: [],
    medium: [],
    hard: []
  };

  let activeLevel = 'easy';
  let expanded = false;
  let requestNumber = 0;

  const rank = score =>
    score === 150 ? '👑 WORLD CHAMPION' :
    score >= 120 ? '🏆 LEGEND' :
    score >= 90 ? '🥇 EXPERT' :
    score >= 50 ? '🏎️ RACER' :
    '🏁 ROOKIE';

  function render() {
    const all = cache[activeLevel];
    const shown = expanded ? all : all.slice(0, 10);

    const list = $('leaderboardList');
    const fragment = document.createDocumentFragment();

    if (!shown.length) {
      const p = document.createElement('p');
      p.className = 'leaderboard-empty';
      p.textContent = 'Hozircha natija yo‘q. Birinchi bo‘lib o‘ynang!';
      fragment.append(p);
    }

    shown.forEach((player, i) => {
      const row = document.createElement('div');

      row.className =
        'leaderboard-item' + (i < 3 ? ' podium' : '');

      const pos = document.createElement('div');
      pos.className = 'leaderboard-position';
      pos.textContent = ['🥇', '🥈', '🥉'][i] || String(i + 1);

      const info = document.createElement('div');

      const name = document.createElement('div');
      name.className = 'leaderboard-name';
      name.textContent = player.name;

      const label = document.createElement('small');
      label.className = 'leaderboard-rank';
      label.textContent = rank(player.score);

      info.append(name, label);

      const points = document.createElement('div');
      points.className = 'leaderboard-points';
      points.textContent = player.score;

      row.append(pos, info, points);
      fragment.append(row);
    });

    list.replaceChildren(fragment);

    const more = $('leaderboardMore');

    more.classList.toggle('hidden', all.length <= 10);
    more.textContent = expanded
      ? '↑ TOP 10 GA QAYTISH'
      : '🏆 TOP 100 NI KO‘RISH ↓';

    more.setAttribute('aria-expanded', String(expanded));
  }

  async function loadLeaderboard(level) {
    if (!levels.includes(level)) return;

    const currentRequest = ++requestNumber;

    $('leaderboardStatus').textContent = '⏳ Reyting yuklanmoqda...';

    try {
      const response = await fetch(
        `${API}/leaderboard?level=${encodeURIComponent(level)}`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server xatosi');
      }

      if (currentRequest !== requestNumber) return;

      cache[level] = Array.isArray(data.leaderboard)
        ? data.leaderboard
        : [];

      if (activeLevel === level) {
        render();
      }

      $('leaderboardStatus').textContent = '';

    } catch (error) {
      if (currentRequest !== requestNumber) return;

      console.error('Reyting xatosi:', error);

      $('leaderboardStatus').textContent =
        '⚠️ Reyting yuklanmadi. Internetni tekshiring.';
    }
  }

  function showLevel(level) {
    if (!levels.includes(level)) return;

    activeLevel = level;
    expanded = false;

    document.querySelectorAll('[data-board]').forEach(button => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.board === level)
      );
    });

    render();
    loadLeaderboard(level);
  }

  // Natijani faqat Worker saqlaydi.
  // Brauzerdan ball yuborish mumkin emas.
  window.F1QuizLeaderboard = {
    showLevel,
    refresh: () => loadLeaderboard(activeLevel)
  };

  $('leaderboardMore').addEventListener('click', () => {
    expanded = !expanded;
    render();
  });

  document.querySelectorAll('[data-board]').forEach(button => {
    button.addEventListener('click', () => {
      showLevel(button.dataset.board);
    });
  });

  showLevel('easy');
})();

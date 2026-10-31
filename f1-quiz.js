(() => {
  'use strict';

  const API = 'https://f1-quiz-api.nodirbekhonormagicpad2.workers.dev';
  const TOTAL = 15;
  const SECONDS = 15;
  const $ = id => document.getElementById(id);

  const ranks = score =>
    score === 150 ? '👑 F1 WORLD CHAMPION' :
    score >= 120 ? '🏆 F1 LEGEND' :
    score >= 90 ? '🥇 F1 EXPERT' :
    score >= 50 ? '🏎️ F1 RACER' :
    '🏁 F1 ROOKIE';

  let gameId = '';
  let playerName = '';
  let selectedLevel = 'easy';
  let currentNumber = 0;
  let score = 0;
  let timerId = null;
  let deadline = 0;
  let locked = false;
  let pending = null;
  let busy = false;

  function stopTimer() {
    if (timerId !== null) clearInterval(timerId);
    timerId = null;
  }

  async function api(path, payload) {
    const response = await fetch(API + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Server xatosi');
    }

    return data;
  }

  function setLevelButtons(disabled) {
    document.querySelectorAll('[data-level]').forEach(button => {
      button.disabled = disabled;
    });
  }

  async function start(level) {
    if (busy) return;

    const name = $('playerName').value
      .trim()
      .replace(/\s+/g, ' ');

    if (
      name.length < 2 ||
      name.length > 24 ||
      /[<>\u0000-\u001f]/.test(name)
    ) {
      alert('Reyting uchun 2–24 belgidan iborat ism kiriting.');
      $('playerName').focus();
      return;
    }

    busy = true;
    setLevelButtons(true);

    try {
      const data = await api('/start', {
        name,
        level
      });

      gameId = data.gameId;
      playerName = name;
      selectedLevel = level;
      score = data.score || 0;
      pending = null;

      try {
        localStorage.setItem('f1_quiz_player_name', name);
      } catch (_) {}

      $('start').classList.add('hidden');
      $('result').classList.add('hidden');
      $('game').classList.remove('hidden');

      render(data.question);

    } catch (error) {
      alert('O‘yin boshlanmadi: ' + error.message);

    } finally {
      busy = false;
      setLevelButtons(false);
    }
  }

  function render(question) {
    stopTimer();

    pending = null;
    locked = false;
    currentNumber = Number(question.number);

    $('counter').textContent =
      `Savol ${currentNumber} / ${TOTAL}`;

    $('score').textContent = `${score} ball`;

    $('bar').style.width =
      `${((currentNumber - 1) / TOTAL) * 100}%`;

    $('question').textContent = question.question;
    $('feedback').textContent = '';

    $('next').classList.add('hidden');
    $('answers').replaceChildren();

    question.options.forEach((label, index) => {
      const letter = 'abcd'[index];

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer';
      button.dataset.answer = letter;

      const strong = document.createElement('strong');
      strong.textContent = letter.toUpperCase() + ')';

      button.append(
        strong,
        document.createTextNode(' ' + label)
      );

      button.addEventListener('click', () => answer(letter));

      $('answers').append(button);
    });

    deadline = Date.now() + SECONDS * 1000;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000)
      );

      $('timer').textContent = `⏱ ${remaining}`;

      if (remaining === 0) {
        answer(null);
      }
    };

    tick();
    timerId = setInterval(tick, 200);
  }

  async function answer(choice) {
    if (locked || !gameId) return;

    locked = true;
    stopTimer();

    $('answers')
      .querySelectorAll('button')
      .forEach(button => {
        button.disabled = true;
      });

    $('feedback').textContent =
      '⏳ Javob tekshirilmoqda...';

    try {
      const data = await api('/answer', {
        gameId,
        answer: choice
      });

      score = data.score;
      pending = data;

      $('score').textContent = `${score} ball`;

      $('bar').style.width =
        `${(currentNumber / TOTAL) * 100}%`;

      $('answers')
        .querySelectorAll('button')
        .forEach(button => {
          if (button.dataset.answer === data.correctOption) {
            button.classList.add('correct');
          } else if (button.dataset.answer === choice) {
            button.classList.add('wrong');
          }
        });

      $('feedback').textContent =
        choice === null
          ? '⏱ Vaqt tugadi!'
          : data.correct
            ? '✅ To‘g‘ri javob!'
            : '❌ Noto‘g‘ri javob!';

      $('next').textContent = data.done
        ? 'Natijani ko‘rish 🏆'
        : 'Keyingi savol →';

      $('next').classList.remove('hidden');

    } catch (error) {
      $('feedback').textContent =
        '⚠️ ' + error.message + '. Qayta urinib ko‘ring.';

      $('next').textContent =
        'Javobni qayta yuborish ↻';

      $('next').classList.remove('hidden');

      pending = {
        retry: true,
        answer: choice
      };
    }
  }

  function finish() {
    stopTimer();

    $('game').classList.add('hidden');
    $('result').classList.remove('hidden');

    $('rank').textContent = ranks(score);
    $('finalScore').textContent = `${score} / 150`;

    $('details').textContent =
      `👤 ${playerName} · ` +
      `✅ ${score / 10} ta to‘g‘ri · ` +
      `❌ ${TOTAL - score / 10} ta noto‘g‘ri · ` +
      selectedLevel.toUpperCase();

    $('saveStatus').textContent =
      '✅ Natija serverga yuborildi.';

    $('shareStatus').textContent = '';

    window.F1QuizLeaderboard?.showLevel?.(selectedLevel);

    $('result').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  document.querySelectorAll('[data-level]').forEach(button => {
    button.addEventListener('click', () => {
      start(button.dataset.level);
    });
  });

  $('next').addEventListener('click', () => {
    if (!pending) return;

    const data = pending;
    pending = null;

    if (data.retry) {
      locked = false;
      answer(data.answer);

    } else if (data.done) {
      finish();

    } else {
      render(data.question);
    }
  });

  $('restart').addEventListener('click', () => {
    stopTimer();

    gameId = '';
    pending = null;

    $('result').classList.add('hidden');
    $('start').classList.remove('hidden');

    $('start').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });

  $('share').addEventListener('click', async () => {
    const text =
      `🏎️ F1 QUIZ PRO: ${score}/150 ball! ` +
      $('rank').textContent;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'F1 QUIZ PRO',
          text,
          url: location.href
        });

      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${text}\n${location.href}`
        );

        $('shareStatus').textContent =
          '✅ Natija nusxalandi!';

      } else {
        $('shareStatus').textContent = text;
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        $('shareStatus').textContent =
          'Ulashishda xatolik yuz berdi.';
      }
    }
  });

  try {
    $('playerName').value =
      localStorage.getItem('f1_quiz_player_name') || '';
  } catch (_) {}

  window.addEventListener('pagehide', stopTimer);
})();

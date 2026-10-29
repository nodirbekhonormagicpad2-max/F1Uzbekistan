(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const TOTAL = 15, SECONDS = 15;
  let questions = [], current = 0, correct = 0, remaining = SECONDS;
  let timerId = null, locked = false, selectedLevel = 'easy', playerName = '';
  const shuffle = list => {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const ranks = score => score === 150 ? '👑 F1 WORLD CHAMPION' : score >= 120 ? '🏆 F1 LEGEND' : score >= 90 ? '🥇 F1 EXPERT' : score >= 50 ? '🏎️ F1 RACER' : '🏁 F1 ROOKIE';
  function stopTimer() { if (timerId !== null) clearInterval(timerId); timerId = null; }
  function start(level) {
    const name = $('playerName').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 24 || /[<>\u0000-\u001f]/.test(name)) {
      alert('Reyting uchun 2–24 belgidan iborat ism kiriting.'); $('playerName').focus(); return;
    }
    const bank = window.F1_QUIZ_QUESTIONS?.[level];
    if (!Array.isArray(bank) || bank.length < TOTAL) {
      alert('Savollar bazasi yuklanmadi. Sahifani yangilang.'); return;
    }
    playerName = name;
    try { localStorage.setItem('f1_quiz_player_name', name); } catch (_) {}
    stopTimer(); selectedLevel = level; questions = shuffle(bank).slice(0, TOTAL);
    current = 0; correct = 0;
    $('start').classList.add('hidden'); $('result').classList.add('hidden');
    $('game').classList.remove('hidden'); render();
  }
  function render() {
    stopTimer(); locked = false; remaining = SECONDS;
    const q = questions[current];
    $('counter').textContent = `Savol ${current + 1} / ${TOTAL}`;
    $('score').textContent = `${correct * 10} ball`;
    $('bar').style.width = `${(current / TOTAL) * 100}%`;
    $('timer').textContent = `⏱ ${remaining}`;
    $('question').textContent = q[0];
    $('feedback').textContent = '';
    $('next').classList.add('hidden');
    $('answers').replaceChildren();
    const choices = shuffle(q.slice(1, 5).map((label, index) => ({ label, correct: index === q[5] })));
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'answer';
      const letter = document.createElement('strong'); letter.textContent = 'ABCD'[index] + ')';
      button.append(letter, document.createTextNode(' ' + choice.label));
      button.addEventListener('click', () => answer(choice, button));
      button.dataset.correct = choice.correct ? '1' : '0';
      $('answers').append(button);
    });
    timerId = setInterval(() => {
      remaining--; $('timer').textContent = `⏱ ${remaining}`;
      if (remaining <= 0) answer(null, null);
    }, 1000);
  }
  function answer(choice, clicked) {
    if (locked) return;
    locked = true; stopTimer();
    if (choice?.correct) correct++;
    $('answers').querySelectorAll('button').forEach(button => {
      button.disabled = true;
      if (button.dataset.correct === '1') button.classList.add('correct');
      else if (button === clicked) button.classList.add('wrong');
    });
    $('score').textContent = `${correct * 10} ball`;
    $('feedback').textContent = choice === null ? '⏱ Vaqt tugadi!' : choice.correct ? '✅ To‘g‘ri javob!' : '❌ Noto‘g‘ri javob!';
    $('next').textContent = current === TOTAL - 1 ? 'Natijani ko‘rish 🏆' : 'Keyingi savol →';
    $('next').classList.remove('hidden');
    $('bar').style.width = `${((current + 1) / TOTAL) * 100}%`;
  }
  function finish() {
    stopTimer(); $('game').classList.add('hidden'); $('result').classList.remove('hidden');
    const score = correct * 10;
    $('rank').textContent = ranks(score);
    $('finalScore').textContent = `${score} / 150`;
    $('details').textContent = `👤 ${playerName} · ✅ ${correct} ta to‘g‘ri · ❌ ${TOTAL - correct} ta noto‘g‘ri · ${selectedLevel.toUpperCase()}`;
    $('shareStatus').textContent = '';
    $('saveStatus').textContent = '⏳ Natija reytingga saqlanmoqda...';
    window.F1QuizLeaderboard?.save({ name: playerName, score, level: selectedLevel })
      .then(message => { $('saveStatus').textContent = message; })
      .catch(() => { $('saveStatus').textContent = '⚠️ Natija saqlanmadi. Internet yoki Firebase sozlamalarini tekshiring.'; });
    window.F1QuizLeaderboard?.showLevel(selectedLevel);
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => start(button.dataset.level)));
  $('next').addEventListener('click', () => { if (!locked) return; current++; if (current === TOTAL) finish(); else render(); });
  $('restart').addEventListener('click', () => {
    stopTimer(); $('result').classList.add('hidden'); $('start').classList.remove('hidden');
    $('start').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('share').addEventListener('click', async () => {
    const text = `🏎️ F1 QUIZ PRO: ${correct * 10}/150 ball! ${$('rank').textContent}`;
    try {
      if (navigator.share) await navigator.share({ title: 'F1 QUIZ PRO', text, url: location.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text}\n${location.href}`); $('shareStatus').textContent = '✅ Natija nusxalandi!'; }
      else $('shareStatus').textContent = text;
    } catch (error) { if (error.name !== 'AbortError') $('shareStatus').textContent = 'Ulashishda xatolik yuz berdi.'; }
  });
  try { $('playerName').value = localStorage.getItem('f1_quiz_player_name') || ''; } catch (_) {}
  window.addEventListener('pagehide', stopTimer);
})();

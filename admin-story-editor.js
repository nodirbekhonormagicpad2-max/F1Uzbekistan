(() => {
  'use strict';
  if (document.getElementById('story-edit-panel')) return;
  const host = document.querySelector('.photo-section') || document.querySelector('.box') || document.body;
  const panel = document.createElement('section');
  panel.id = 'story-edit-panel';
  panel.style.cssText = 'border-top:1px solid #303540;margin-top:30px;padding-top:24px;color:#fff';
  panel.innerHTML = `
    <h2 style="font-size:23px;margin:0 0 10px">✏️ <span style="color:#ff303e">F1 STORIES</span> — MAQOLANI TAHRIRLASH</h2>
    <p style="color:#aeb5c1">Oldin yuklangan suratni tanlang. Surat qayta yuklanmaydi.</p>
    <form id="story-edit-form">
      <label for="story-edit-password">🔐 Admin paroli</label>
      <input id="story-edit-password" type="password" autocomplete="current-password" required placeholder="Admin parolingiz">
      <label for="story-edit-select">📸 Mavjud suratni tanlang</label>
      <select id="story-edit-select" required><option value="">Yuklanmoqda...</option></select>
      <img id="story-edit-preview" alt="Tanlangan surat" style="display:none;width:100%;max-height:280px;object-fit:contain;margin-top:14px;background:#000;border-radius:10px">
      <label for="story-edit-title">📰 Sarlavha</label>
      <input id="story-edit-title" maxlength="160" required placeholder="Sarlavha">
      <label for="story-edit-article">📝 To‘liq maqola</label>
      <textarea id="story-edit-article" maxlength="30000" required placeholder="Maqolani shu yerga yozing..." style="width:100%;min-height:260px;resize:vertical;padding:15px;background:#090c11;border:1px solid #414753;border-radius:10px;color:#fff;font:16px/1.6 Arial,sans-serif"></textarea>
      <p id="story-edit-count" style="text-align:right;font-size:12px;color:#aeb5c1;margin:6px 0">0 / 30000 belgi</p>
      <label for="story-edit-source">🔗 Manba (ixtiyoriy)</label>
      <input id="story-edit-source" maxlength="300" placeholder="Masalan: Formula 1 / Autosport">
      <button id="story-edit-save" type="submit">💾 MAQOLANI SAQLASH</button>
      <p id="story-edit-status" role="status" aria-live="polite" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>
    </form>`;
  host.appendChild(panel);
  const get = id => document.getElementById(id);
  const select = get('story-edit-select');
  const preview = get('story-edit-preview');
  const title = get('story-edit-title');
  const article = get('story-edit-article');
  const source = get('story-edit-source');
  const status = get('story-edit-status');
  const save = get('story-edit-save');
  const count = get('story-edit-count');
  let items = [];
  function notice(text, error = false) { status.textContent = text; status.style.color = error ? '#ff737d' : '#56e7a0'; }
  function fill() {
    const item = items.find(x => x.id === select.value);
    title.value = item?.title_uz || '';
    article.value = item?.article_uz || '';
    source.value = item?.source || '';
    count.textContent = article.value.length + ' / 30000 belgi';
    preview.style.display = item?.url ? 'block' : 'none';
    if (item?.url) preview.src = item.url;
    notice('');
  }
  article.addEventListener('input', () => { count.textContent = article.value.length + ' / 30000 belgi'; });
  select.addEventListener('change', fill);
  async function load() {
    try {
      const response = await fetch('/gallery-photos.json?t=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw Error('Ro‘yxatni yuklab bo‘lmadi (HTTP ' + response.status + ')');
      const data = await response.json();
      if (!Array.isArray(data)) throw Error('Galereya ma’lumotlari noto‘g‘ri');
      items = data.filter(x => x && typeof x.id === 'string' && typeof x.title_uz === 'string');
      select.replaceChildren(new Option('— Suratni tanlang —', ''));
      for (const item of items) select.add(new Option(item.title_uz, item.id));
      if (!items.length) notice('Hozircha suratlar topilmadi.', true);
    } catch (error) { select.replaceChildren(new Option('Yuklashda xatolik', '')); notice('❌ ' + error.message, true); }
  }
  get('story-edit-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!select.value || !article.value.trim() || !title.value.trim()) return notice('Surat, sarlavha va maqolani kiriting.', true);
    save.disabled = true;
    notice('⏳ Maqola saqlanmoqda...');
    try {
      const response = await fetch('/api/story-edit', {
        method:'POST', cache:'no-store', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({password:get('story-edit-password').value,id:select.value,title_uz:title.value.trim(),article_uz:article.value.trim(),source:source.value.trim()})
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw Error(result?.error || 'Server xatosi: HTTP ' + response.status);
      const index = items.findIndex(x => x.id === select.value);
      if (index >= 0) items[index] = result.photo;
      const option = select.options[select.selectedIndex];
      if (option) option.textContent = result.photo.title_uz;
      notice('✅ Maqola saqlandi! Bosh sahifada F1 STORIES rasmini ochib tekshiring.');
    } catch (error) { notice('❌ ' + error.message, true); }
    finally { save.disabled = false; }
  });
  load();
})();

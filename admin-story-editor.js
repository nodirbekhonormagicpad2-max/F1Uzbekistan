(() => {
  'use strict';
  if (document.getElementById('story-edit-panel')) return;
  const host = document.querySelector('.box') || document.body;
  const panel = document.createElement('section');
  panel.id = 'story-edit-panel';
  panel.className = 'section';
  panel.innerHTML = `
    <h2>✏️ <span class="red">F1 STORIES</span> — BOSHQARISH</h2>
    <p>Mavjud postni tanlang, maqolasini tahrirlang yoki o‘chiring. Suratni qayta yuklash shart emas.</p>
    <form id="story-edit-form">
      <label for="story-edit-select">📸 Mavjud post</label>
      <select id="story-edit-select" required><option value="">Yuklanmoqda...</option></select>
      <img id="story-edit-preview" class="preview hidden" alt="Tanlangan surat">
      <label for="story-edit-title">📰 Sarlavha</label>
      <input id="story-edit-title" maxlength="160" required>
      <label for="story-edit-article">📝 To‘liq maqola</label>
      <textarea id="story-edit-article" maxlength="30000" required></textarea>
      <div id="story-edit-count" class="count">0 / 30000 belgi</div>
      <label for="story-edit-source">🔗 Manba (ixtiyoriy)</label>
      <input id="story-edit-source" maxlength="300">
      <button id="story-edit-save" type="submit">💾 MAQOLANI SAQLASH</button>
      <button id="story-edit-delete" type="button" style="background:#62202a">🗑️ POSTNI O‘CHIRISH</button>
      <p id="story-edit-status" class="status" role="status" aria-live="polite"></p>
    </form>`;
  const anchor = host.querySelector('p:last-child');
  if (anchor && anchor.querySelector('a[href="/"]')) host.insertBefore(panel, anchor);
  else host.append(panel);
  const get = id => document.getElementById(id);
  const select = get('story-edit-select'), preview = get('story-edit-preview');
  const title = get('story-edit-title'), article = get('story-edit-article');
  const source = get('story-edit-source'), status = get('story-edit-status');
  const save = get('story-edit-save'), remove = get('story-edit-delete');
  const count = get('story-edit-count');
  const master = get('password');
  const photoPassword = get('f1-photo-password');
  const oldEditPassword = get('story-edit-password');
  if (photoPassword && master) {
    photoPassword.value = master.value;
    const field = photoPassword.closest('form');
    const label = document.querySelector('label[for="f1-photo-password"]');
    photoPassword.classList.add('hidden');
    photoPassword.required = false;
    if (label) label.classList.add('hidden');
    if (field) field.addEventListener('submit', () => {photoPassword.value = master.value;}, true);
  }
  if (oldEditPassword) {
    oldEditPassword.required = false;
    oldEditPassword.classList.add('hidden');
    const label = document.querySelector('label[for="story-edit-password"]');
    if (label) label.classList.add('hidden');
  }
  if (master) {
    const videoForm = get('videoForm');
    const masterSection = document.createElement('section');
    masterSection.setAttribute('aria-label', 'Yagona admin paroli');
    masterSection.innerHTML = '<h2>🔐 ADMIN KIRISH</h2><p>Parolni bir marta kiriting. Barcha bo‘limlarda shu parol ishlaydi.</p>';
    const masterLabel = document.querySelector('label[for="password"]');
    if (videoForm && masterLabel) {
      videoForm.before(masterSection);
      masterSection.append(masterLabel, master);
      // Parol boshqa formaga ko‘chirilgan bo‘lsa ham video yuborishdan oldin tekshiriladi.
      videoForm.addEventListener('submit', event => {
        if (!master.value.trim()) {event.preventDefault(); event.stopImmediatePropagation(); alert('Admin parolini kiriting.'); master.focus();}
      }, true);
    }
  }
  function password() {
    const value = master?.value || '';
    if (!value.trim()) throw Error('Avval sahifa yuqorisida admin parolini kiriting.');
    return value;
  }
  function notice(text, isError = false) {
    status.textContent = text;
    status.className = 'status ' + (isError ? 'error' : 'success');
  }
  let items = [];
  function fill() {
    const item = items.find(x => x.id === select.value);
    title.value = item?.title_uz || '';
    article.value = item?.article_uz || '';
    source.value = item?.source || '';
    count.textContent = article.value.length + ' / 30000 belgi';
    preview.classList.toggle('hidden', !item?.url);
    if (item?.url) preview.src = item.url;
    else preview.removeAttribute('src');
    remove.disabled = !item;
    notice('');
  }
  article.addEventListener('input', () => count.textContent = article.value.length + ' / 30000 belgi');
  select.addEventListener('change', fill);
  async function load(keepId = '') {
    try {
      const response = await fetch('/gallery-photos.json?t=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw Error('Ro‘yxatni yuklab bo‘lmadi (HTTP ' + response.status + ')');
      const data = await response.json();
      if (!Array.isArray(data)) throw Error('Galereya formati noto‘g‘ri.');
      items = data.filter(x => x && typeof x.id === 'string' && typeof x.title_uz === 'string');
      select.replaceChildren(new Option('— Postni tanlang —', ''));
      for (const item of items) select.add(new Option(item.title_uz, item.id));
      if (items.some(x => x.id === keepId)) select.value = keepId;
      fill();
    } catch (error) {notice('❌ ' + error.message, true);}
  }
  async function send(action, body) {
    const response = await fetch('/api/story-edit', {
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:password(),action,...body})
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw Error(data?.error || 'Server xatosi: HTTP ' + response.status);
    return data;
  }
  get('story-edit-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!select.value || !title.value.trim() || !article.value.trim()) return notice('Post, sarlavha va maqolani kiriting.', true);
    save.disabled = remove.disabled = true;
    notice('⏳ Saqlanmoqda...');
    try {
      const result = await send('update', {id:select.value,title_uz:title.value.trim(),article_uz:article.value.trim(),source:source.value.trim()});
      await load(result.photo.id);
      notice('✅ Maqola saqlandi!');
    } catch (error) {notice('❌ ' + error.message, true);}
    finally {save.disabled = false; remove.disabled = !select.value;}
  });
  remove.addEventListener('click', async () => {
    const item = items.find(x => x.id === select.value);
    if (!item) return notice('Avval postni tanlang.', true);
    if (!confirm('“' + item.title_uz + '” postini o‘chirmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.')) return;
    save.disabled = remove.disabled = true;
    notice('⏳ Post o‘chirilmoqda...');
    try {
      await send('delete', {id:item.id});
      await load();
      notice('✅ Post F1 STORIES ro‘yxatidan o‘chirildi.');
    } catch (error) {notice('❌ ' + error.message, true);}
    finally {save.disabled = false; remove.disabled = !select.value;}
  });
  load();
})();

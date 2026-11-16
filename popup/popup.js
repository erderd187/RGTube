// RGTube popup: mevcut ayarlar + Kanal Grupları yönetimi.
(async () => {
'use strict';

const D = globalThis.RGTUBE_DEFAULTS;
let s;
try { s = await chrome.storage.local.get(D); } catch { s = null; }
if (!s || typeof s !== 'object') s = { ...D };

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

function setLocal(patch) {
  try {
    const p = chrome.storage.local.set(patch);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch { /* eski API */ }
}
function removeLocal(keys) {
  try {
    const p = chrome.storage.local.remove(keys);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch { /* eski API */ }
}
removeLocal(globalThis.RGTUBE_OBSOLETE_KEYS || []);
try { $('#ver').textContent = 'v' + chrome.runtime.getManifest().version; } catch { /* yok say */ }

const MAX_EDGE = 2560;
const JPEG_QUALITY = 0.82;
function readEl(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range' || el.dataset.type === 'number') return Number(el.value);
  return el.value;
}

let pending = {}, timer = null;
function flush() {
  if (!Object.keys(pending).length) return;
  const p = pending; pending = {};
  setLocal(p);
}
function save(patch) {
  Object.assign(s, patch);
  Object.assign(pending, patch);
  render();
  if (!timer) { flush(); timer = setTimeout(() => { timer = null; flush(); }, 80); }
}
addEventListener('pagehide', flush);

let lastPreview = null;
function render() {
  $$('[data-key]').forEach((el) => {
    const v = s[el.dataset.key];
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.value !== String(v)) el.value = v;
  });
  $$('[data-out]').forEach((o) => { o.textContent = s[o.dataset.out] + (o.dataset.unit || ''); });
  const flags = { ...s, hasImg: !!s.bgImage, bgGradActive: s.bgColorOn && s.bgGradOn };
  $$('[data-dep]').forEach((el) => el.classList.toggle('off', !flags[el.dataset.dep]));
  $$('[data-dim]').forEach((el) => el.classList.toggle('dim', !flags[el.dataset.dim]));
  if (lastPreview !== s.bgImage) {
    lastPreview = s.bgImage;
    const prev = $('#preview');
    if (prev) {
      prev.classList.toggle('has', !!s.bgImage);
      prev.style.backgroundImage = s.bgImage ? `url("${s.bgImage}")` : 'none';
    }
    const rm = $('#removeImg');
    if (rm) { rm.disabled = !s.bgImage; rm.style.opacity = s.bgImage ? 1 : 0.5; }
  }
}

$$('[data-key]').forEach((el) => {
  el.addEventListener('input', () => {
    const key = el.dataset.key;
    const patch = { [key]: readEl(el) };
    if (key === 'bgColor') patch.bgColorOn = true;
    if (key === 'textColor') patch.textColorOn = true;
    if (key === 'bgColor2') { patch.bgGradOn = true; patch.bgColorOn = true; }
    save(patch);
  });
});

const note = $('#imgNote');
const fileInput = $('#file');
if (fileInput) fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (note) note.textContent = 'Görsel işleniyor…';
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    save({ bgImage: url });
    if (note) note.textContent = `${canvas.width}×${canvas.height} · ${Math.round(url.length * 0.75 / 1024)} KB olarak kaydedildi.`;
  } catch {
    if (note) note.textContent = 'Görsel okunamadı. PNG, JPG veya WEBP dene.';
  }
  e.target.value = '';
});
const removeImgBtn = $('#removeImg');
if (removeImgBtn) removeImgBtn.addEventListener('click', () => { save({ bgImage: '' }); if (note) note.textContent = ''; });

const resetBtn = $('#reset');
let armed = null;
if (resetBtn) resetBtn.addEventListener('click', () => {
  if (!armed) {
    resetBtn.textContent = 'Emin misin? Tekrar tıkla';
    armed = setTimeout(() => { resetBtn.textContent = 'Varsayılana dön'; armed = null; }, 3000);
    return;
  }
  clearTimeout(armed); armed = null;
  resetBtn.textContent = 'Varsayılana dön';
  if (note) note.textContent = '';
  save({ ...D });
});

render();
})();


// ============================================================================
// RGTube — Kanal Grupları Yönetimi (panel)
// ============================================================================
(() => {
'use strict';

const KG = 'rgtubeGroups', KO = 'rgtubeGroupsOn', KC = 'rgtubeGroupsOtherCollapsed', KM = 'rgtubeChannelMeta';
const PALETTE = ['#ff3d5a', '#2fd47a', '#3d8bff', '#ffb02e', '#ff5ad2', '#2fd4d4', '#9a6bff', '#b8e62e'];
const EMOJIS = ['🎮', '🎵', '', '📚', '🔬', '😂', '', '', '🧠', '⚽', '', '💡'];
const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const panel = $('#panel');
if (!panel) return;

let G = { on: true, otherCollapsed: false, groups: [], meta: {} };
let tab = 'groups', editing = null, search = '', filter = 'all';
let undoData = null, undoTimer = null, loaded = false;

function sget(defs) {
  return new Promise((res) => {
    try { chrome.storage.local.get(defs, (v) => { void chrome.runtime?.lastError; res(v || defs); }); }
    catch { res(defs); }
  });
}
function sset(obj) { try { chrome.storage.local.set(obj, () => { void chrome.runtime?.lastError; }); } catch { /* yok say */ } }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function validColor(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : PALETTE[0]; }
function uid() { return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function initial(name) {
  const v = String(name || '').trim();
  if (!v) return '?';
  try {
    if (globalThis.Intl && Intl.Segmenter) {
      const seg = new Intl.Segmenter('tr', { granularity: 'grapheme' });
      const first = seg.segment(v)[Symbol.iterator]().next().value;
      if (first && first.segment) return first.segment.toLocaleUpperCase('tr');
    }
  } catch { /* yok say */ }
  return v.charAt(0).toLocaleUpperCase('tr');
}
function badge(g) { const e = String(g.emoji || '').trim(); return e || initial(g.name); }
function groupOf(key) { return G.groups.find((g) => g.channels.includes(key)) || null; }
function saveGroups() { sset({ [KG]: G.groups }); }

function normalize(groups) {
  return (Array.isArray(groups) ? groups : []).map((g) => ({
    id: String(g.id || uid()),
    name: String(g.name || 'Grup').slice(0, 40),
    emoji: String(g.emoji || '').slice(0, 8),
    color: validColor(g.color),
    collapsed: !!g.collapsed,
    channels: Array.isArray(g.channels) ? [...new Set(g.channels.map(String))] : []
  }));
}

// ---------- Panel bölümünü oluştur ----------
const sec = document.createElement('section');
sec.id = 'rgtube-groups-section';
sec.innerHTML = `
<div class="rgg-head">
  <div>
    <h2>Kanal Grupları</h2>
    <small>Zen Mod’da kenar çubuğu emoji / baş harf rozetleriyle sadeleşir.</small>
  </div>
  <label class="switch" title="Grupları etkinleştir">
    <input type="checkbox" id="rgg-on"><span></span>
  </label>
</div>
<div class="rgg-tabs" role="tablist">
  <button class="rgg-tab rgg-active" data-tab="groups" role="tab">Gruplar <span class="rgg-pill" id="rgg-gcount">0</span></button>
  <button class="rgg-tab" data-tab="channels" role="tab">Kanallar <span class="rgg-pill" id="rgg-ccount">0</span></button>
</div>
<div class="rgg-pane" id="rgg-pane-groups">
  <div class="rgg-toolbar">
    <button class="btn primary" id="rgg-add">＋ Yeni grup</button>
    <button class="btn ghost" id="rgg-collapse" title="Tüm grupları daralt / genişlet">⇅ Daralt</button>
  </div>
  <div class="rgg-glist" id="rgg-glist"></div>
  <div class="rgg-form" id="rgg-editor" hidden>
    <div class="rgg-form-top">
      <span class="rgg-badge rgg-preview" id="rgg-ed-badge">E</span>
      <input class="rgg-input" id="rgg-ed-name" maxlength="40" placeholder="Grup adı (örn. Eğlence)" autocomplete="off">
    </div>
    <p class="rgg-ed-err" id="rgg-ed-err" hidden></p>
    <div class="rgg-form-row">
      <input class="rgg-input rgg-emoji-input" id="rgg-ed-emoji" maxlength="8" placeholder="Emoji (boş bırakırsan baş harf)">
      <button class="rgg-ic" id="rgg-ed-clear" title="Emojiyi temizle">×</button>
    </div>
    <div class="rgg-emojis" id="rgg-emojis"></div>
    <div class="rgg-swatches" id="rgg-swatches"></div>
    <div class="rgg-form-actions">
      <button class="btn ghost" id="rgg-ed-cancel">Vazgeç</button>
      <button class="btn primary" id="rgg-ed-save">Kaydet</button>
    </div>
  </div>
</div>
<div class="rgg-pane" id="rgg-pane-channels" hidden>
  <div class="rgg-tools">
    <input class="rgg-input" id="rgg-search" placeholder="Kanal ara…">
    <select id="rgg-filter"></select>
    <button class="rgg-ic" id="rgg-refresh" title="YouTube sekmesinden kanal listesini yenile">⟳</button>
  </div>
  <div class="rgg-clist" id="rgg-clist"></div>
  <p class="note" id="rgg-cnote"></p>
</div>
<div class="rgg-undo" id="rgg-undo" hidden>
  <span id="rgg-undo-text">Grup silindi.</span>
  <button class="btn ghost" id="rgg-undo-btn">Geri al</button>
</div>
`;
const firstSection = panel.querySelector('section');
if (firstSection && firstSection.nextSibling) panel.insertBefore(sec, firstSection.nextSibling);
else panel.appendChild(sec);

const elOn = $('#rgg-on'), elGList = $('#rgg-glist'), elCList = $('#rgg-clist');
const elGCount = $('#rgg-gcount'), elCCount = $('#rgg-ccount');
const elEditor = $('#rgg-editor'), elEdName = $('#rgg-ed-name'), elEdEmoji = $('#rgg-ed-emoji'), elEdBadge = $('#rgg-ed-badge');
const elEdErr = $('#rgg-ed-err');
const elEmojis = $('#rgg-emojis'), elSwatches = $('#rgg-swatches');
const elSearch = $('#rgg-search'), elFilter = $('#rgg-filter'), elCNote = $('#rgg-cnote');
const elUndo = $('#rgg-undo'), elUndoText = $('#rgg-undo-text');

// ---------- Rozet / renk / emoji seçiciler ----------
elEmojis.innerHTML = EMOJIS.map((e) => `<button class="rgg-emoji" data-emoji="${esc(e)}" title="${esc(e)}">${esc(e)}</button>`).join('');
elSwatches.innerHTML = PALETTE.map((c) => `<button class="rgg-swatch" data-color="${c}" style="--rgg-c:${c}" title="${c}"></button>`).join('');

function updateEditorPreview() {
  if (!editing) return;
  const text = String(editing.emoji || '').trim() || initial(editing.name || 'E');
  elEdBadge.textContent = text;
  elEdBadge.classList.toggle('rgg-emoji-mode', !!String(editing.emoji || '').trim());
  elEdBadge.style.setProperty('--rgg-c', validColor(editing.color));
  elSwatches.querySelectorAll('.rgg-swatch').forEach((b) => b.classList.toggle('rgg-sel', b.dataset.color === editing.color));
  elEmojis.querySelectorAll('.rgg-emoji').forEach((b) => b.classList.toggle('rgg-sel', b.dataset.emoji === editing.emoji));
}
function setEditorError(msg) {
  if (!elEdErr) return;
  elEdErr.textContent = msg || '';
  elEdErr.hidden = !msg;
  elEdName.classList.toggle('rgg-invalid', !!msg);
}
function openEditor(mode, gid) {
  const g = gid ? G.groups.find((x) => x.id === gid) : null;
  editing = { mode, gid: g ? g.id : null, name: g ? g.name : '', emoji: g ? g.emoji : '', color: g ? g.color : PALETTE[G.groups.length % PALETTE.length] };
  elEdName.value = editing.name;
  elEdEmoji.value = editing.emoji;
  elEditor.hidden = false;
  setEditorError('');
  updateEditorPreview();
  elEdName.focus();
  if (elEditor.scrollIntoView) elEditor.scrollIntoView({ block: 'nearest' });
}
function closeEditor() { editing = null; elEditor.hidden = true; setEditorError(''); }
function commitEditor() {
  if (!editing) return;
  const name = elEdName.value.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!name) { setEditorError('Grup adı boş olamaz.'); elEdName.focus(); return; }
  setEditorError('');
  const emoji = elEdEmoji.value.trim().slice(0, 8);
  const color = validColor(editing.color);
  if (editing.mode === 'create') {
    G.groups.push({ id: uid(), name, emoji, color, collapsed: false, channels: [] });
  } else {
    const g = G.groups.find((x) => x.id === editing.gid);
    if (g) { g.name = name; g.emoji = emoji; g.color = color; }
  }
  saveGroups();
  closeEditor();
  render();
}

// ---------- Grup listesi ----------
function renderGroups() {
  elGCount.textContent = G.groups.length;
  if (!G.groups.length) {
    elGList.innerHTML = '<div class="rgg-empty">Henüz grup yok. “＋ Yeni grup” ile örneğin 🎮 Eğlence, 📚 Bilgi gruplarını oluştur.</div>';
    return;
  }
  elGList.innerHTML = G.groups.map((g, i) => {
    const col = validColor(g.color);
    const members = g.channels.map((k) => {
      const name = (G.meta[k] && G.meta[k].t) || k;
      return `<span class="rgg-chip"><span>${esc(name)}</span><button class="rgg-chip-x" data-act="rm" data-key="${esc(k)}" title="Gruptan çıkar">×</button></span>`;
    }).join('');
    return `
<div class="rgg-card${g.collapsed ? ' rgg-closed-card' : ''}" draggable="true" data-gid="${esc(g.id)}">
  <div class="rgg-card-main">
    <span class="rgg-badge" style="--rgg-c:${col}">${esc(badge(g))}</span>
    <div class="rgg-card-txt">
      <b>${esc(g.name)}</b>
      <small>${g.channels.length} kanal · Zen rozeti: ${esc(badge(g))}</small>
    </div>
    <div class="rgg-card-actions">
      <button class="rgg-ic" data-act="up" title="Yukarı taşı" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="rgg-ic" data-act="down" title="Aşağı taşı" ${i === G.groups.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="rgg-ic" data-act="edit" title="Düzenle">✎</button>
      <button class="rgg-ic rgg-danger" data-act="del" title="Grubu sil">🗑</button>
    </div>
  </div>
  <div class="rgg-members">${members || '<span class="rgg-none">Henüz kanal yok — “Kanallar” sekmesinden ekle.</span>'}</div>
</div>`;
  }).join('');
}

// ---------- Kanal listesi ----------
function renderChannels() {
  const keys = Object.keys(G.meta || {});
  elCCount.textContent = keys.length;
  // Silinen grup seçili kaldıysa filtreyi sıfırla (boş liste görünmesin).
  if (filter !== 'all' && filter !== 'none' && !G.groups.some((g) => g.id === filter)) filter = 'all';
  elFilter.innerHTML = '<option value="all">Tüm kanallar</option><option value="none">Grupsuz</option>' +
    G.groups.map((g) => `<option value="${esc(g.id)}">${esc(badge(g))} ${esc(g.name)}</option>`).join('');
  elFilter.value = filter;
  if (!keys.length) {
    elCList.innerHTML = '';
    elCNote.textContent = 'Kanal listesi boş. YouTube’da sol kenar çubuğunu aç ve aboneliklerini bir kez genişlet; liste panele otomatik gelir. ⟳ ile de deneyebilirsin.';
    return;
  }
  const q = search.trim().toLocaleLowerCase('tr');
  let rows = keys.map((k) => {
    const m = G.meta[k] || {};
    return { key: k, title: m.t || k, img: m.i || '', href: m.h || k };
  });
  if (q) rows = rows.filter((r) => r.title.toLocaleLowerCase('tr').includes(q));
  if (filter === 'none') rows = rows.filter((r) => !groupOf(r.key));
  else if (filter !== 'all') rows = rows.filter((r) => { const g = groupOf(r.key); return g && g.id === filter; });
  rows.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  if (!rows.length) {
    elCList.innerHTML = '<div class="rgg-empty">Bu filtreyle eşleşen kanal yok.</div>';
    elCNote.textContent = '';
    return;
  }
  const opts = (selected) => '<option value="">Grupsuz</option>' + G.groups.map((g) => `<option value="${esc(g.id)}"${g.id === selected ? ' selected' : ''}>${esc(badge(g))} ${esc(g.name)}</option>`).join('');
  elCList.innerHTML = rows.map((r) => {
    const g = groupOf(r.key);
    const avatar = r.img ? `<img src="${esc(r.img)}" alt="">` : '<span class="rgg-avatar-ph"></span>';
    return `
<div class="rgg-chan" data-key="${esc(r.key)}">
  ${avatar}
  <span class="rgg-chan-name" title="${esc(r.title)}">${esc(r.title)}</span>
  <select class="rgg-chan-sel" data-key="${esc(r.key)}">${opts(g ? g.id : '')}</select>
</div>`;
  }).join('');
  elCNote.textContent = `${rows.length} kanal listeleniyor. Grup değiştirmek için sağdaki açılır kutuyu kullan.`;
}

function render() {
  elOn.checked = G.on;
  sec.classList.toggle('rgg-disabled', !G.on);
  renderGroups();
  renderChannels();
  updateEditorPreview();
}

// ---------- İşlemler ----------
function assignChannel(key, gid) {
  G.groups.forEach((g) => { g.channels = g.channels.filter((k) => k !== key); });
  if (gid) { const g = G.groups.find((x) => x.id === gid); if (g) { g.channels.push(key); g.collapsed = false; } }
  saveGroups();
  render();
}
function moveGroup(gid, dir) {
  const i = G.groups.findIndex((x) => x.id === gid);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= G.groups.length) return;
  const tmp = G.groups[i]; G.groups[i] = G.groups[j]; G.groups[j] = tmp;
  saveGroups(); render();
}
function deleteGroup(gid) {
  const i = G.groups.findIndex((x) => x.id === gid);
  if (i < 0) return;
  const removed = G.groups.splice(i, 1)[0];
  undoData = { group: removed, index: i };
  elUndoText.textContent = `“${removed.name}” silindi. Kanallar grupsuz kalır.`;
  elUndo.hidden = false;
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { elUndo.hidden = true; undoData = null; }, 6500);
  saveGroups(); render();
}
function undoDelete() {
  if (!undoData) return;
  G.groups.splice(Math.min(undoData.index, G.groups.length), 0, undoData.group);
  undoData = null; elUndo.hidden = true;
  if (undoTimer) clearTimeout(undoTimer);
  saveGroups(); render();
}
async function refreshChannels() {
  const btn = $('#rgg-refresh');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '…';
  const prevNote = elCNote ? elCNote.textContent : '';
  if (elCNote) elCNote.textContent = 'YouTube sekmesindeki abonelikler taranıyor…';
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tid = tabs && tabs[0] && tabs[0].id;
    if (tid) await chrome.tabs.sendMessage(tid, { type: 'rgtube-groups-scan' });
    // İçerik scripti taramayı ~220 ms gecikmeyle kaydediyor; hemen okursak eski liste gelir.
    await new Promise((r) => setTimeout(r, 450));
    const v = await sget({ [KM]: {} });
    G.meta = v[KM] && typeof v[KM] === 'object' ? v[KM] : {};
  } catch { /* sekme/erişim yoksa mevcut listeyle devam et */ }
  if (!btn.isConnected) return;               // panel kapandıysa DOM'a dokunma
  btn.disabled = false;
  btn.textContent = '⟳';
  render();
  if (elCNote && !Object.keys(G.meta).length) elCNote.textContent = prevNote || elCNote.textContent;
}

// ---------- Olaylar ----------
elOn.addEventListener('change', () => { G.on = elOn.checked; sset({ [KO]: G.on }); render(); });
$$('.rgg-tab').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  $$('.rgg-tab').forEach((x) => x.classList.toggle('rgg-active', x === b));
  $('#rgg-pane-groups').hidden = tab !== 'groups';
  $('#rgg-pane-channels').hidden = tab !== 'channels';
}));
$('#rgg-add').addEventListener('click', () => openEditor('create'));
$('#rgg-collapse').addEventListener('click', () => {
  const anyOpen = G.groups.some((g) => !g.collapsed) || !G.otherCollapsed;
  G.groups.forEach((g) => { g.collapsed = anyOpen; });
  G.otherCollapsed = anyOpen;
  sset({ [KG]: G.groups, [KC]: G.otherCollapsed });
  render();
});
elEdName.addEventListener('input', () => {
  if (!editing) return;
  editing.name = elEdName.value;
  if (elEdName.value.trim()) setEditorError('');
  updateEditorPreview();
});
elEdEmoji.addEventListener('input', () => { if (editing) { editing.emoji = elEdEmoji.value; updateEditorPreview(); } });
$('#rgg-ed-clear').addEventListener('click', () => { elEdEmoji.value = ''; if (editing) editing.emoji = ''; updateEditorPreview(); elEdEmoji.focus(); });
$('#rgg-ed-cancel').addEventListener('click', closeEditor);
$('#rgg-ed-save').addEventListener('click', commitEditor);
elEdName.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitEditor(); if (e.key === 'Escape') closeEditor(); });
elEdEmoji.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitEditor(); if (e.key === 'Escape') closeEditor(); });
elEmojis.addEventListener('click', (e) => {
  const b = e.target.closest('.rgg-emoji');
  if (!b || !editing) return;
  editing.emoji = b.dataset.emoji; elEdEmoji.value = editing.emoji; updateEditorPreview();
});
elSwatches.addEventListener('click', (e) => {
  const b = e.target.closest('.rgg-swatch');
  if (!b || !editing) return;
  editing.color = b.dataset.color; updateEditorPreview();
});
elGList.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const card = e.target.closest('.rgg-card');
  const gid = card && card.dataset.gid;
  const act = b.dataset.act;
  if (act === 'up') moveGroup(gid, -1);
  else if (act === 'down') moveGroup(gid, 1);
  else if (act === 'edit') openEditor('edit', gid);
  else if (act === 'del') deleteGroup(gid);
  else if (act === 'rm') assignChannel(b.dataset.key, null);
});
let dragGid = null;
elGList.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.rgg-card');
  if (!card) return;
  dragGid = card.dataset.gid;
  e.dataTransfer.setData('text/plain', dragGid);
  e.dataTransfer.effectAllowed = 'move';
  card.classList.add('rgg-dragging');
});
elGList.addEventListener('dragend', () => {
  dragGid = null;
  elGList.querySelectorAll('.rgg-dragging,.rgg-drop').forEach((n) => n.classList.remove('rgg-dragging', 'rgg-drop'));
});
elGList.addEventListener('dragover', (e) => {
  const card = e.target.closest('.rgg-card');
  if (!card || !dragGid || card.dataset.gid === dragGid) return;
  e.preventDefault();
  elGList.querySelectorAll('.rgg-drop').forEach((n) => { if (n !== card) n.classList.remove('rgg-drop'); });
  card.classList.add('rgg-drop');
});
elGList.addEventListener('drop', (e) => {
  const card = e.target.closest('.rgg-card');
  if (!card || !dragGid) return;
  e.preventDefault();
  const from = G.groups.findIndex((x) => x.id === dragGid);
  const to = G.groups.findIndex((x) => x.id === card.dataset.gid);
  if (from < 0 || to < 0 || from === to) return;
  const g = G.groups.splice(from, 1)[0];
  G.groups.splice(to, 0, g);
  saveGroups(); render();
});
elSearch.addEventListener('input', () => { search = elSearch.value; renderChannels(); });
elFilter.addEventListener('change', () => { filter = elFilter.value; renderChannels(); });
elCList.addEventListener('change', (e) => {
  const sel = e.target.closest('.rgg-chan-sel');
  if (!sel) return;
  assignChannel(sel.dataset.key, sel.value || null);
});
$('#rgg-refresh').addEventListener('click', refreshChannels);
$('#rgg-undo-btn').addEventListener('click', undoDelete);

// ---------- Yükle + canlı senkron ----------
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !loaded) return;
    let dirty = false;
    if (changes[KO] && changes[KO].newValue !== G.on) { G.on = changes[KO].newValue !== false; dirty = true; }
    if (changes[KC] && !!changes[KC].newValue !== G.otherCollapsed) { G.otherCollapsed = !!changes[KC].newValue; dirty = true; }
    if (changes[KG]) {
      const v = normalize(changes[KG].newValue);
      if (JSON.stringify(v) !== JSON.stringify(G.groups)) { G.groups = v; dirty = true; }
    }
    if (changes[KM] && changes[KM].newValue) { G.meta = changes[KM].newValue; dirty = true; }
    if (dirty) render();
  });
} catch { /* yok say */ }

(async () => {
  const v = await sget({ [KG]: [], [KO]: true, [KC]: false, [KM]: {} });
  G.on = v[KO] !== false;
  G.otherCollapsed = !!v[KC];
  G.groups = normalize(v[KG]);
  G.meta = v[KM] && typeof v[KM] === 'object' ? v[KM] : {};
  loaded = true;
  render();
})();
})();


// ============================================================================
// RGTube — Yer İmleri (panel yönetimi)
// ============================================================================
(() => {
'use strict';

const KB = 'rgtubeBookmarks', KO = 'rgtubeBmOn';
const MAX_MARKS = 1000;
const section = document.getElementById('rgtube-bm-section');
if (!section) return;

const $ = (q) => document.querySelector(q);
const listEl = $('#rgtbm-list'), noteEl = $('#rgtbm-note'), totalEl = $('#rgtbm-total');
const searchEl = $('#rgtbm-search'), onEl = $('#rgtbm-on'), clearEl = $('#rgtbm-clear');
const undoEl = $('#rgtbm-undo'), undoText = $('#rgtbm-undo-text');

let marks = [], on = true, search = '';
let undoSet = null, undoTimer = null, clearTimer = null;

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function clean(v) { return String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32); }
function norm(list) {
  const out = [];
  const seen = new Set();
  for (const b of (Array.isArray(list) ? list : [])) {
    if (!b || typeof b !== 'object') continue;
    const vid = clean(b.vid);
    if (!vid) continue;
    const t = Math.max(0, Math.round(Number(b.t) || 0));
    const key = vid + ':' + t;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: String(b.id || 'b' + Math.random().toString(36).slice(2, 8)),
      vid,
      t,
      title: String(b.title || '').slice(0, 200),
      createdAt: Number(b.createdAt) || Date.now()
    });
    if (out.length >= MAX_MARKS) break;
  }
  return out;
}
function fmt(t) {
  const n = Math.max(0, Math.floor(Number(t) || 0));
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
  const p = (x) => String(x).padStart(2, '0');
  return (h ? h + ':' + p(m) : String(m)) + ':' + p(s);
}
function dateStr(ts) {
  const d = new Date(Number(ts) || Date.now());
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch { return d.toDateString(); }
}
const thumbUrl = (vid) => 'https://i.ytimg.com/vi/' + encodeURIComponent(vid) + '/mqdefault.jpg';
const watchUrl = (b) => 'https://www.youtube.com/watch?v=' + encodeURIComponent(b.vid) + '&t=' + b.t;

function sget(defs) {
  return new Promise((res) => {
    try { chrome.storage.local.get(defs, (v) => { void chrome.runtime?.lastError; res(v || defs); }); }
    catch { res(defs); }
  });
}
function sset(obj) { try { chrome.storage.local.set(obj, () => { void chrome.runtime?.lastError; }); } catch { /* yok say */ } }

function render() {
  totalEl.textContent = marks.length;
  onEl.checked = on;
  if (!marks.length) {
    listEl.innerHTML = '<div class="rgg-empty">Henüz yer imi yok. Bir video aç, oynatıcının kontrol çubuğundaki <b>🔖</b> düğmesine bas; o an burada listelenir.</div>';
    noteEl.textContent = '';
    return;
  }
  const q = search.trim().toLocaleLowerCase('tr');
  const rows = marks
    .filter((b) => !q || b.title.toLocaleLowerCase('tr').includes(q))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!rows.length) {
    listEl.innerHTML = '<div class="rgg-empty">Eşleşen yer imi yok.</div>';
    noteEl.textContent = '';
    return;
  }
  listEl.innerHTML = rows.map((b) => {
    const u = esc(watchUrl(b));
    return `<div class="rgtbm-row" data-id="${esc(b.id)}">
  <a class="rgtbm-thumb" href="${u}" target="_blank" rel="noopener" title="Yeni sekmede aç">
    <img src="${esc(thumbUrl(b.vid))}" alt="" loading="lazy">
    <b>${esc(fmt(b.t))}</b>
  </a>
  <span class="rgtbm-meta">
    <a class="rgtbm-title" href="${u}" target="_blank" rel="noopener" title="${esc(b.title || b.vid)}">${esc(b.title || b.vid)}</a>
    <span class="rgtbm-date">${esc(dateStr(b.createdAt))}</span>
  </span>
  <button class="rgtbm-ic" data-act="copy" title="Bağlantıyı kopyala">⧉</button>
  <button class="rgtbm-ic rgtbm-del" data-act="del" title="Yer imini sil">×</button>
</div>`;
  }).join('');
  noteEl.textContent = rows.length + ' kayıt gösteriliyor.';
}

function offerUndo(set, text) {
  undoSet = set;
  undoText.textContent = text;
  undoEl.hidden = false;
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { undoEl.hidden = true; undoSet = null; }, 6000);
}
function doUndo() {
  if (!undoSet || !undoSet.length) return;
  marks = undoSet.concat(marks);
  undoSet = null;
  undoEl.hidden = true;
  if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
  sset({ [KB]: marks });
  render();
}
function removeMark(id) {
  const i = marks.findIndex((b) => b.id === id);
  if (i < 0) return;
  const [removed] = marks.splice(i, 1);
  sset({ [KB]: marks });
  offerUndo([removed], `“${removed.title || fmt(removed.t)}” silindi.`);
  render();
}
function copyLink(b, btn) {
  const text = 'https://youtu.be/' + b.vid + '?t=' + b.t;
  const done = () => {
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = old; }, 1200);
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
      return;
    }
  } catch { /* yedek yönteme geç */ }
  fallback();
  function fallback() {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch { /* yok say */ }
  }
}

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const row = btn.closest('.rgtbm-row');
  const id = row && row.dataset.id;
  const b = marks.find((x) => x.id === id);
  if (!b) return;
  if (btn.dataset.act === 'del') removeMark(id);
  else if (btn.dataset.act === 'copy') copyLink(b, btn);
});
searchEl.addEventListener('input', () => { search = searchEl.value; render(); });
$('#rgtbm-undo-btn').addEventListener('click', doUndo);
onEl.addEventListener('change', () => { on = onEl.checked; sset({ [KO]: on }); });
clearEl.addEventListener('click', () => {
  if (!marks.length) return;
  if (!clearTimer) {
    clearEl.textContent = '!';
    clearEl.title = 'Emin misin? Tekrar tıkla';
    clearTimer = setTimeout(() => { clearEl.textContent = '🗑'; clearEl.title = 'Tüm yer imlerini sil'; clearTimer = null; }, 3000);
    return;
  }
  clearTimeout(clearTimer);
  clearTimer = null;
  clearEl.textContent = '🗑';
  clearEl.title = 'Tüm yer imlerini sil';
  const old = marks;
  marks = [];
  sset({ [KB]: [] });
  offerUndo(old, old.length + ' yer imi silindi.');
  render();
});

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[KO]) { on = changes[KO].newValue !== false; onEl.checked = on; }
    if (changes[KB]) { marks = norm(changes[KB].newValue); render(); }
  });
} catch { /* yok say */ }

(async () => {
  const v = await sget({ [KB]: [], [KO]: true });
  marks = norm(v[KB]);
  on = v[KO] !== false;
  render();
})();
})();


// ============================================================================
// RGTube — YT Lens (Groq API anahtarı)
// ============================================================================
(() => {
'use strict';

const K_KEY = 'rgtubeGroqKey';
const input = document.getElementById('rgtlens-key');
const statusEl = document.getElementById('rgtlens-status');
const eye = document.getElementById('rgtlens-eye');
const clear = document.getElementById('rgtlens-clear');
if (!input) return;

let timer = null;

function sget(defs) {
  return new Promise((res) => {
    try { chrome.storage.local.get(defs, (v) => { void chrome.runtime?.lastError; res(v || defs); }); }
    catch { res(defs); }
  });
}
function sset(obj) { try { chrome.storage.local.set(obj, () => { void chrome.runtime?.lastError; }); } catch { /* yok say */ } }
function say(text) { if (statusEl) statusEl.textContent = text || ''; }

input.addEventListener('input', () => {
  const val = input.value.trim();
  if (timer) clearTimeout(timer);
  say('Kaydediliyor…');
  timer = setTimeout(() => { timer = null; sset({ [K_KEY]: val }); say(val ? 'Anahtar kaydedildi.' : 'Anahtar silindi.'); }, 300);
});
input.addEventListener('change', () => { if (timer) { clearTimeout(timer); timer = null; } const val = input.value.trim(); sset({ [K_KEY]: val }); say(val ? 'Anahtar kaydedildi.' : 'Anahtar silindi.'); });
eye.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; eye.title = input.type === 'password' ? 'Göster' : 'Gizle'; });
clear.addEventListener('click', () => {
  input.value = '';
  if (timer) { clearTimeout(timer); timer = null; }
  sset({ [K_KEY]: '' });
  say('Anahtar silindi.');
});

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[K_KEY] || document.activeElement === input) return;
    input.value = changes[K_KEY].newValue || '';
  });
} catch { /* yok say */ }

(async () => {
  const v = await sget({ [K_KEY]: '' });
  input.value = typeof v[K_KEY] === 'string' ? v[K_KEY] : '';
  say('');
})();
})();
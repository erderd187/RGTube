// ============================================================================
// RGTube — YT Lens: görselle YouTube'da arama (Groq)
// Masthead'te "Oluştur" yanındaki düğme paneli açar; paneldeki görsel
// Groq'un çok modlu modeliyle yorumlanır ve YouTube arama sorguları önerilir.
// API anahtarı yalnızca chrome.storage.local'da tutulur, koda gömülmez.
// ============================================================================
(() => {
'use strict';

const K_KEY = 'rgtubeGroqKey';
const API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'qwen/qwen3.8-27b';
const KEYS_URL = 'https://console.groq.com/keys';
const HOST_ID = 'rgtube-lens-host';
const BTN_ID = 'rgtube-lens-btn';
const MAX_EDGE = 1024;
const JPEG_Q = 0.82;
const TIMEOUT_MS = 45000;

const PROMPT = [
  'Sen bir YouTube görsel arama yardımcısısın. Kullanıcının verdiği görseli incele.',
  'Yalnızca geçerli bir JSON nesnesi döndür, başka metin yazma:',
  '{ "description": "1-2 cümlelik kısa Türkçe açıklama",',
  '  "texts": ["görselde görünen önemli yazılar"],',
  '  "queries": ["YouTube aramasında kullanılacak 5 kısa sorgu"] }',
  'Kurallar: sorgular en fazla 6 kelime olsun, görünen marka/kişi/ürün/yazar adlarını',
  'içersin, uydurma bilgi ekleme, Türkçe karakter kullanma.'
].join('\n');

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.panel {
  position: fixed; top: 64px; right: 16px; width: 420px; max-height: 85vh;
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: 14px; border: 1px solid rgba(255,255,255,.14);
  background: #1e1b28; color: #f3f0fa;
  font: 13px/1.45 "Segoe UI", Roboto, Arial, sans-serif;
  box-shadow: 0 18px 50px rgba(0,0,0,.55);
  z-index: 2147483000;
}
.panel[hidden] { display: none !important; }
header { display: flex; align-items: center; gap: 8px; padding: 11px 12px 9px; border-bottom: 1px solid #34304a; }
header .t { flex: 1; min-width: 0; }
header b { display: flex; align-items: center; gap: 7px; font-size: 13.5px; }
header b .dot { width: 8px; height: 8px; border-radius: 50%; background: #ff3d5a; box-shadow: 0 0 8px #ff3d5a; }
header small { display: block; margin-top: 1px; color: #9d97b3; font-size: 11px; }
.x { width: 26px; height: 26px; border: 0; border-radius: 7px; background: transparent; color: #9d97b3; font-size: 17px; line-height: 1; cursor: pointer; }
.x:hover { background: #262236; color: #f3f0fa; }
.body { padding: 11px 12px 13px; overflow-y: auto; }
.body::-webkit-scrollbar { width: 8px; }
.body::-webkit-scrollbar-thumb { background: #34304a; border-radius: 8px; }
.drop { position: relative; display: flex; align-items: center; justify-content: center; min-height: 118px; padding: 10px; border-radius: 11px; border: 1.5px dashed #3d3856; background: #15131c; cursor: pointer; text-align: center; transition: border-color .15s, background .15s; }
.drop:hover, .drop.over { border-color: #ff3d5a; background: #1b1726; }
.drop .ph { color: #9d97b3; font-size: 11.5px; }
.drop .ph b { color: #f3f0fa; }
.drop img { display: block; max-width: 100%; max-height: 150px; border-radius: 8px; }
.row { display: flex; gap: 6px; margin-top: 8px; }
.btn { flex: 1; padding: 7px 8px; border-radius: 8px; border: 1px solid #34304a; background: #15131c; color: #f3f0fa; font: 600 11.5px/1.2 inherit; cursor: pointer; }
.btn:hover { border-color: #55507a; }
.btn:disabled { opacity: .45; cursor: default; }
.go { width: 100%; margin-top: 8px; padding: 9px 10px; border: 0; border-radius: 9px; background: #ff3d5a; color: #fff; font: 700 12.5px/1.2 inherit; cursor: pointer; }
.go:hover { filter: brightness(1.08); }
.go:disabled { opacity: .45; cursor: default; filter: none; }
.msg { margin: 9px 0 0; padding: 7px 9px; border-radius: 8px; background: rgba(255,61,90,.12); color: #ffb3bf; font-size: 11.5px; }
.msg.ok { background: rgba(47,212,122,.12); color: #8ef0b8; }
.results { margin-top: 11px; padding-top: 10px; border-top: 1px solid #34304a; }
.desc { margin: 0 0 8px; color: #d9d4e7; font-size: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 5px 9px; border-radius: 16px; border: 1px solid #3d3856; background: #262236; color: #f3f0fa; font: 500 11.5px/1.2 inherit; text-decoration: none; cursor: pointer; }
.chip:hover { border-color: #ff3d5a; background: #2f2840; }
.chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip svg { width: 11px; height: 11px; flex: none; opacity: .75; }
details.key { margin-top: 11px; padding-top: 9px; border-top: 1px solid #34304a; }
details.key summary { cursor: pointer; color: #9d97b3; font-size: 11.5px; }
details.key summary:hover { color: #f3f0fa; }
.keyrow { display: flex; gap: 5px; margin-top: 7px; }
.keyrow input { flex: 1; min-width: 0; padding: 7px 8px; border-radius: 8px; border: 1px solid #34304a; background: #15131c; color: #f3f0fa; font: 12px/1.2 ui-monospace, Consolas, monospace; }
.keyrow input:focus { outline: none; border-color: #ff3d5a; }
.keyrow button { padding: 0 9px; border-radius: 8px; border: 1px solid #34304a; background: #15131c; color: #9d97b3; font: 600 11.5px/1 inherit; cursor: pointer; }
.keyrow button:hover { color: #f3f0fa; border-color: #55507a; }
.hint { margin: 7px 0 0; color: #9d97b3; font-size: 11px; }
.hint a { color: #8ab4ff; }
.spin { display: inline-block; width: 11px; height: 11px; margin-right: 6px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: rgt-spin .8s linear infinite; vertical-align: -1px; }
@keyframes rgt-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
@media (max-width: 700px) { .panel { display: none !important; } }
`;

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="10.4" cy="10.4" r="3.1"/><path d="M12.8 12.8 17 17"/></svg>';
const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="10.4" cy="10.4" r="3.1"/><path d="M12.8 12.8 17 17"/></svg>';

let apiKey = '';
let extOn = true;
let imgData = '';
let busy = false;
let open = false;
let abortCtl = null;
let host = null, shadow = null, els = null;
let btnObserver = null, btnTries = 0;

function sget(defs) {
  return new Promise((res) => {
    try { chrome.storage.local.get(defs, (v) => { void chrome.runtime?.lastError; res(v || defs); }); }
    catch { res(defs); }
  });
}
function sset(obj) {
  try { const p = chrome.storage.local.set(obj, () => { void chrome.runtime?.lastError; }); if (p && typeof p.catch === 'function') p.catch(() => {}); }
  catch { /* yok say */ }
}

function buildPanel() {
  if (host) return;
  host = document.createElement('div');
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${CSS}</style>
<div class="panel" hidden>
  <header>
    <span class="t"><b><i class="dot"></i>YT Lens</b><small>Görselle YouTube'da ara</small></span>
    <button class="x" data-act="close" title="Kapat">×</button>
  </header>
  <div class="body">
    <div class="drop" tabindex="0" role="button" aria-label="Görsel seç">
      <div class="ph">Görseli sürükle bırak,<br><b>seç</b> veya <b>Ctrl+V</b> ile yapıştır</div>
    </div>
    <div class="row">
      <button class="btn" data-act="pick">Dosya seç</button>
      <button class="btn" data-act="frame">Kareyi al</button>
      <button class="btn" data-act="clear">Temizle</button>
    </div>
    <button class="go" data-act="go" disabled>Görseli analiz et</button>
    <p class="msg" hidden></p>
    <div class="results" hidden><p class="desc"></p><div class="chips"></div></div>
    <details class="key">
      <summary>Groq API anahtarı</summary>
      <div class="keyrow">
        <input type="password" placeholder="gsk_..." spellcheck="false" autocomplete="off" aria-label="Groq API anahtarı">
        <button data-act="eye" title="Göster/gizle">👁</button>
      </div>
      <p class="hint">Anahtar yalnızca bu tarayıcıda saklanır, koda gömülmez. <a href="${KEYS_URL}" target="_blank" rel="noopener">console.groq.com/keys</a> adresinden ücretsiz anahtar alabilirsin.</p>
    </details>
  </div>
</div>`;
  (document.body || document.documentElement).appendChild(host);

  const q = (s) => shadow.querySelector(s);
  els = {
    panel: q('.panel'), drop: q('.drop'), ph: q('.ph'), file: null,
    go: q('.go'), msg: q('.msg'), results: q('.results'), desc: q('.desc'), chips: q('.chips'),
    key: q('input[type="password"]'), details: q('details.key')
  };

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  els.drop.appendChild(fileInput);
  els.file = fileInput;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) readFile(f);
    fileInput.value = '';
  });

  els.drop.addEventListener('click', (e) => { if (e.target === fileInput) return; fileInput.click(); });
  els.drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  ['dragenter', 'dragover'].forEach((t) => els.drop.addEventListener(t, (e) => { e.preventDefault(); els.drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => els.drop.addEventListener(t, (e) => { e.preventDefault(); els.drop.classList.remove('over'); }));
  els.drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) readFile(f);
  });

  shadow.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'close') closePanel();
    else if (act === 'pick') fileInput.click();
    else if (act === 'frame') captureFrame();
    else if (act === 'clear') setImage('', '');
    else if (act === 'go') analyze();
    else if (act === 'eye') { els.key.type = els.key.type === 'password' ? 'text' : 'password'; }
  });

  els.key.addEventListener('change', () => {
    apiKey = els.key.value.trim();
    sset({ [K_KEY]: apiKey });
    setMsg(apiKey ? 'Anahtar kaydedildi.' : 'Anahtar silindi.', !apiKey);
  });

  document.addEventListener('paste', (e) => {
    if (!open) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.kind === 'file' && /^image\//.test(it.type)) {
        const f = it.getAsFile();
        if (f) { e.preventDefault(); readFile(f); }
        break;
      }
    }
  }, true);

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) closePanel(); }, true);
}

function setMsg(text, isError) {
  if (!els) return;
  els.msg.textContent = text || '';
  els.msg.hidden = !text;
  els.msg.classList.toggle('ok', !isError && !!text);
}

function setImage(dataUrl, source) {
  imgData = dataUrl || '';
  if (!els) return;
  const img = els.drop.querySelector('img');
  if (img) img.remove();
  if (imgData) {
    const im = document.createElement('img');
    im.src = imgData;
    im.alt = 'Seçilen görsel';
    els.drop.insertBefore(im, els.file);
    els.ph.hidden = true;
  } else {
    els.ph.hidden = false;
  }
  els.go.disabled = !imgData || busy;
  els.results.hidden = true;
  setMsg('');
  if (source === 'frame') setMsg('Video karesi alındı.', false);
}

function readFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    try {
      const k = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((img.naturalWidth || 1) * k));
      c.height = Math.max(1, Math.round((img.naturalHeight || 1) * k));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      setImage(c.toDataURL('image/jpeg', JPEG_Q), 'file');
    } catch {
      setMsg('Görsel işlenemedi. PNG, JPG veya WEBP dene.', true);
    }
  };
  img.onerror = () => { URL.revokeObjectURL(url); setMsg('Görsel okunamadı.', true); };
  img.src = url;
}

function captureFrame() {
  const v = document.querySelector('video#movie_player') || document.querySelector('video');
  if (!v || !v.videoWidth) { setMsg('Önce bir video açmalısın.', true); return; }
  try {
    const k = Math.min(1, MAX_EDGE / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(v.videoWidth * k));
    c.height = Math.max(1, Math.round(v.videoHeight * k));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    setImage(c.toDataURL('image/jpeg', JPEG_Q), 'frame');
  } catch {
    setMsg('Video karesi alınamadı (DRM/koruma olabilir).', true);
  }
}

function parseJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch { return null; }
}

async function analyze() {
  if (busy) return;
  if (!imgData) { setMsg('Önce bir görsel seç.', true); return; }
  if (els && els.key && els.key.value.trim() !== apiKey) {   // yazıp hemen tıklanmış olabilir
    apiKey = els.key.value.trim();
    sset({ [K_KEY]: apiKey });
  }
  if (!apiKey) { setMsg('Groq API anahtarı gerekli. Aşağıdan ekleyebilirsin.', true); if (els.details) els.details.open = true; els.key.focus(); return; }

  busy = true;
  els.go.disabled = true;
  els.go.textContent = '';
  const spin = document.createElement('span');
  spin.className = 'spin';
  els.go.appendChild(spin);
  els.go.appendChild(document.createTextNode('Analiz ediliyor…'));
  setMsg('');
  els.results.hidden = true;

  abortCtl = new AbortController();
  const timer = setTimeout(() => { try { abortCtl.abort(); } catch { /* yok say */ } }, TIMEOUT_MS);
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_completion_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imgData } }
          ]
        }]
      }),
      signal: abortCtl.signal
    });
    if (!res.ok) {
      let msg = 'İstek başarısız (' + res.status + ').';
      if (res.status === 401) msg = 'API anahtarı geçersiz.';
      else if (res.status === 403) msg = 'Bu anahtarın bu modele erişimi yok.';
      else if (res.status === 429) msg = 'Hız sınırı aşıldı, biraz sonra dene.';
      else if (res.status === 400 || res.status === 413) msg = 'Görsel çok büyük veya desteklenmiyor.';
      else if (res.status >= 500) msg = 'Groq sunucu hatası, sonra dene.';
      setMsg(msg, true);
      return;
    }
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const json = parseJson(text);
    if (!json) { setMsg('Model yanıtı okunamadı, tekrar dene.', true); return; }
    renderResults(json);
  } catch (err) {
    const aborted = err && (err.name === 'AbortError' || /abort/i.test(String(err)));
    setMsg(aborted ? 'İstek zaman aşımına uğradı.' : 'Bağlantı hatası. İnternetini kontrol et.', true);
  } finally {
    clearTimeout(timer);
    abortCtl = null;
    busy = false;
    if (els) {
      els.go.textContent = 'Görseli analiz et';
      els.go.disabled = !imgData;
    }
  }
}

function renderResults(json) {
  const desc = typeof json.description === 'string' ? json.description.trim() : '';
  const texts = Array.isArray(json.texts) ? json.texts.filter((t) => typeof t === 'string') : [];
  let queries = Array.isArray(json.queries) ? json.queries.filter((t) => typeof t === 'string') : [];
  queries = queries.map((t) => t.trim()).filter(Boolean).slice(0, 6);

  if (!queries.length && texts.length) queries = texts.slice(0, 4);
  if (!queries.length) { setMsg('Sonuç bulunamadı, başka bir görsel dene.', true); return; }

  els.desc.textContent = desc || '';
  els.desc.hidden = !desc;
  els.chips.textContent = '';
  queries.forEach((q) => {
    const a = document.createElement('a');
    a.className = 'chip';
    a.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = q;
    a.innerHTML = LOGO;
    const s = document.createElement('span');
    s.textContent = q;
    a.appendChild(s);
    els.chips.appendChild(a);
  });
  els.results.hidden = false;
  setMsg(queries.length + ' arama sorgusu hazır.', false);
}

function openPanel() {
  buildPanel();
  open = true;
  els.panel.hidden = false;
  if (els.key) els.key.value = apiKey;
  const b = document.getElementById(BTN_ID);
  if (b) b.setAttribute('aria-expanded', 'true');
}
function closePanel() {
  open = false;
  if (els) els.panel.hidden = true;
  const b = document.getElementById(BTN_ID);
  if (b) b.setAttribute('aria-expanded', 'false');
}
function togglePanel() { if (open) closePanel(); else openPanel(); }

function applyEnabled() {
  const b = document.getElementById(BTN_ID);
  if (!b) return;
  b.style.display = extOn ? '' : 'none';
  if (!extOn && open) closePanel();
}

function headerHost() {
  return document.getElementById('buttons-inner')
    || document.querySelector('#masthead #buttons')
    || document.querySelector('ytd-masthead #buttons');
}

function ensureButton() {
  if (document.getElementById(BTN_ID)) return;
  const hostEl = headerHost();
  if (!hostEl) return;
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.type = 'button';
  btn.className = 'rgtube-lens-btn';
  btn.title = 'YT Lens — görselle ara';
  btn.setAttribute('aria-label', 'YT Lens — görselle ara');
  btn.innerHTML = ICON;
  const create = document.querySelector('#create-icon') || document.querySelector('ytd-button-renderer#create');
  if (create && create.parentElement === hostEl) hostEl.insertBefore(btn, create.nextSibling);
  else hostEl.insertBefore(btn, hostEl.firstChild);
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
  btn.setAttribute('aria-expanded', 'false');
  applyEnabled();

  if (!document.getElementById('rgtube-lens-btn-css')) {
    const st = document.createElement('style');
    st.id = 'rgtube-lens-btn-css';
    st.textContent = `
#${BTN_ID} { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; margin: 0 2px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--yt-spec-icon-inactive, #aaa); cursor: pointer; transition: background .15s, color .15s; }
#${BTN_ID}:hover { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.1)); color: var(--yt-spec-icon-active-other, #fff); }
#${BTN_ID} svg { width: 22px; height: 22px; }
#${BTN_ID}[aria-expanded="true"] { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.1)); color: var(--yt-spec-icon-active-other, #fff); }
@media (max-width: 700px) { #${BTN_ID} { display: none; } }
`;
    document.head.appendChild(st);
  }
}

function watchHeader() {
  const hostEl = headerHost();
  if (!hostEl) { if (++btnTries < 600) requestAnimationFrame(watchHeader); return; }
  ensureButton();
  if (btnObserver) return;
  btnObserver = new MutationObserver(() => {
    const b = document.getElementById(BTN_ID);
    if (!b) { ensureButton(); return; }
    const cur = document.getElementById('rgtube-lens-btn-css');
    if (!cur) ensureButton();
  });
  btnObserver.observe(hostEl, { childList: true, subtree: false });
}

document.addEventListener('click', (e) => {
  if (!open || !host) return;
  if (host.contains(e.target)) return;
  closePanel();
}, true);

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[K_KEY]) {
      apiKey = changes[K_KEY].newValue || '';
      if (els && els.key && document.activeElement !== els.key) els.key.value = apiKey;
    }
    if (changes.enabled) { extOn = changes.enabled.newValue !== false; applyEnabled(); }
  });
} catch { /* yok say */ }

(async () => {
  const v = await sget({ [K_KEY]: '', enabled: true });
  apiKey = typeof v[K_KEY] === 'string' ? v[K_KEY] : '';
  extOn = v.enabled !== false;
  watchHeader();
  window.addEventListener('yt-navigate-finish', () => { ensureButton(); applyEnabled(); }, true);
})();
})();
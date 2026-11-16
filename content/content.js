// RGTube content script: ayarları okur, YouTube sayfasına canlı uygular.
// Kanal Grupları: yönetim RGTube panelindedir; burada yalnızca kenar çubuğu görünümü işlenir.
(() => {
'use strict';

const D = globalThis.RGTUBE_DEFAULTS;
const ZEN_CSS = globalThis.RGTUBE_ZEN_CSS || '';
const root = document.documentElement;
const IDS = { theme: 'rgtube-theme', zen: 'rgtube-zen', bg: 'rgtube-bg', img: 'rgtube-bg-img', cleany: 'rgtube-cleany-css', ctl: 'rgtube-cleany-ctl' };
const CACHE_KEY = 'rgtube:cache';

let s = { ...D };
let loaded = false;
let pendingImg = false;

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const hex = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
const byId = (id) => document.getElementById(id);
const hasImg = () => !!s.bgImage || pendingImg;
const hasGrad = () => !!s.bgColorOn && !!s.bgGradOn;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    if (!all || typeof all !== 'object') return null;
    const out = { _hasImg: !!all._hasImg };
    for (const k in D) {
      if (!(k in all)) continue;
      const v = all[k], dv = D[k];
      if (typeof dv === 'boolean') out[k] = typeof v === 'boolean' ? v : dv;
      else if (typeof dv === 'number') out[k] = Number.isFinite(v) ? v : dv;
      else if (typeof dv === 'string') out[k] = typeof v === 'string' ? v : dv;
    }
    return out;
  } catch { return null; }
}

let cacheTimer = null;
function cacheNow() {
  if (cacheTimer) { clearTimeout(cacheTimer); cacheTimer = null; }
  try {
    const { bgImage, ...rest } = s;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...rest, _hasImg: !!bgImage }));
  } catch { /* kota dolu olabilir */ }
}
function writeCache() {
  if (cacheTimer) return;
  cacheTimer = setTimeout(() => { cacheTimer = null; cacheNow(); }, 400);
}
window.addEventListener('pagehide', () => { if (loaded) cacheNow(); });

function setStyle(id, text) {
  let el = byId(id);
  if (!text) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    root.appendChild(el);
  }
  if (el.textContent !== text) el.textContent = text;
}

function buildThemeCss() {
  const img = hasImg();
  const bgc = s.bgColorOn ? hex(s.bgColor, '#0f0f0f') : null;
  const bgc2 = hex(s.bgColor2, '#3a1c71');
  const grad = hasGrad();
  const layerMode = img || grad;
  const vars = [];
  let css = '';

  if (img || bgc) {
    const base = layerMode ? 'transparent' : bgc;
    vars.push(`--yt-spec-base-background:${base}`, `--yt-spec-general-background-a:${base}`);
    if (bgc) {
      const raised = `color-mix(in srgb, ${bgc} 90%, var(--yt-spec-text-primary) 10%)`;
      vars.push(`--yt-spec-raised-background:${raised}`, `--yt-spec-menu-background:${raised}`);
    }
    if (layerMode && bgc) vars.push(`--rgtube-bar:color-mix(in srgb, ${bgc} 82%, transparent)`);
    vars.push(`--rgtube-surface:${layerMode ? 'var(--rgtube-bar)' : bgc}`);
  }

  if (s.textColorOn) {
    const t = hex(s.textColor, '#ffffff');
    vars.push(
      `--yt-spec-text-primary:${t}`,
      `--yt-spec-text-secondary:color-mix(in srgb, ${t} 72%, transparent)`,
      `--yt-spec-icon-active-other:${t}`,
      `--yt-spec-icon-inactive:color-mix(in srgb, ${t} 72%, transparent)`,
      `--yt-spec-10-percent-layer:color-mix(in srgb, ${t} 12%, transparent)`
    );
  }

  if (vars.length) css += `html, html[dark], ytd-app { ${vars.map((v) => v + ' !important').join('; ')} }\n`;

  if (img || bgc) {
    const page = layerMode ? 'transparent' : bgc;
    const bar = layerMode ? 'var(--rgtube-bar)' : bgc;
    css += `
html, body, ytd-app, #content, #page-manager, ytd-page-manager, ytd-browse, ytd-search,
ytd-watch-flexy, ytd-two-column-browse-results-renderer { background: ${page} !important; }
ytd-masthead { background-color: ${bar} !important; }
ytd-masthead #background { background: transparent !important; }
#chips-wrapper, tp-yt-app-drawer #contentContainer, #guide-content { background-color: ${bar} !important; }
`;
  }

  if (layerMode) {
    css += `
html { --rgtube-bar: rgba(255,255,255,.72); }
html[dark] { --rgtube-bar: rgba(15,15,15,.72); }
#rgtube-bg { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
`;
    if (grad) css += `#rgtube-bg { background: linear-gradient(var(--rgtube-grad-angle, ${clamp(s.bgGradAngle, 0, 360)}deg), ${bgc}, ${bgc2}); }\n`;
    else if (bgc) css += `#rgtube-bg { background-color: ${bgc}; }\n`;
    else css += `html[dark] #rgtube-bg { background-color: #0f0f0f; } html:not([dark]) #rgtube-bg { background-color: #fff; }\n`;
    if (img) {
      css += `
#rgtube-bg { --rgtube-dim: rgba(0,0,0,var(--rgtube-dim-a, .35)); }
html:not([dark]) #rgtube-bg { --rgtube-dim: rgba(255,255,255,var(--rgtube-dim-a, .35)); }
#rgtube-bg-img { position: absolute; inset: calc(var(--rgtube-blur, 0px) * -2); filter: blur(var(--rgtube-blur, 0px)); transform: translateZ(0); }
#rgtube-bg::after { content: ""; position: absolute; inset: 0; background: var(--rgtube-dim); }
`;
    }
  }

  const cols = Math.round(clamp(s.gridCols, 0, 8));
  if (cols >= 2) css += `html ytd-rich-grid-renderer, html ytd-rich-grid-renderer ytd-rich-item-renderer[rendered-from-rich-grid] { --ytd-rich-grid-items-per-row: ${cols} !important; }\n`;

  if (s.barBottom) {
    css += `
ytd-app, #content { --ytd-toolbar-height: 0px !important; --ytd-toolbar-offset: 0px !important; --ytd-masthead-height: 0px !important; }
ytd-watch-flexy { --ytd-watch-flexy-masthead-height: 0px !important; }
#masthead-container, ytd-masthead { --ytd-toolbar-height: 56px !important; --ytd-masthead-height: 56px !important; }
#masthead-container { top: auto !important; bottom: 0 !important; z-index: 2100 !important; box-shadow: 0 -4px 18px rgba(0, 0, 0, .3); }
#page-manager { margin-top: 0 !important; margin-bottom: 56px !important; }
tp-yt-app-drawer { top: 0 !important; bottom: 56px !important; height: auto !important; }
tp-yt-app-drawer #contentContainer, ytd-mini-guide-renderer { height: calc(100vh - 56px) !important; }
html.rgtube-bb #masthead-container { transition: opacity .3s ease-in-out .5s, bottom .3s ease-in-out .5s !important; }
`;
    if (s.zen) {
      css += `
html.rgtube-bb.rgtube-zv:not(.rgtube-sf) #masthead-container { top: auto !important; bottom: -40px !important; transition: opacity .25s cubic-bezier(.445,.05,.55,.95), bottom .25s cubic-bezier(.445,.05,.55,.95) !important; }
html.rgtube-bb.rgtube-zv:not(.rgtube-sf) #masthead-container:hover { top: auto !important; bottom: 0 !important; }
html.rgtube-bb yt-searchbox { transition: transform .55s cubic-bezier(.22,1,.36,1) !important; }
html.rgtube-bb.rgtube-sf:not(.rgtube-cleany-center) yt-searchbox { position: relative !important; left: 0 !important; top: 0 !important; height: 40px !important; max-width: 700px !important; z-index: 3000 !important; transform: translate(var(--rgtube-sfx,0px), var(--rgtube-sfy,0px)) scale(1.1) !important; }
html.rgtube-bb.rgtube-sf:not(.rgtube-cleany-center) yt-searchbox #i0 { margin-top: 0 !important; }
html.rgtube-bb.rgtube-sf:not(.rgtube-cleany-center) .ytd-masthead #center { position: static !important; top: auto !important; left: auto !important; width: auto !important; height: auto !important; }
html.rgtube-bb.rgtube-sf:not(.rgtube-cleany-center) :is(#masthead-container, ytd-masthead, ytd-masthead #container, ytd-masthead #center) { overflow: visible !important; contain: none !important; }
`;
    } else {
      css += `html:not(.rgtube-cleany-center) yt-searchbox .ytSearchboxComponentSuggestionsContainer { top: auto !important; bottom: calc(100% + 6px) !important; }\n`;
    }
  }

  if (layerMode) css += `ytd-browse[page-subtype="channels"] ytd-tabbed-page-header { clip-path: inset(0 round 0 0 24px 24px); }\n`;

  if (s.sideLeft) {
    css += `@media (min-width: 1017px) {
ytd-watch-flexy:not([fullscreen]) #columns { flex-direction: row-reverse !important; column-gap: 12px; }
}\n`;
  }

  return css;
}

let lastImg = null;
function applyBgLayer() {
  let el = byId(IDS.bg);
  const wantLayer = s.enabled && (hasImg() || hasGrad());
  if (!wantLayer) { el?.remove(); lastImg = null; return; }
  if (!el) { el = document.createElement('div'); el.id = IDS.bg; root.appendChild(el); }
  let im = byId(IDS.img);
  if (!hasImg()) { im?.remove(); lastImg = null; return; }
  if (!im) { im = document.createElement('div'); im.id = IDS.img; el.appendChild(im); lastImg = null; }
  if (s.bgImage && lastImg !== s.bgImage) { im.style.backgroundImage = `url("${s.bgImage}")`; lastImg = s.bgImage; }
  const [size, repeat] = { cover: ['cover', 'no-repeat'], contain: ['contain', 'no-repeat'], repeat: ['auto', 'repeat'], center: ['auto', 'no-repeat'] }[s.bgFit] || ['cover', 'no-repeat'];
  im.style.backgroundSize = size;
  im.style.backgroundRepeat = repeat;
  im.style.backgroundPosition = 'center';
}

function applyImageVars() {
  root.style.setProperty('--rgtube-dim-a', String(clamp(s.bgDim, 0, 90) / 100));
  root.style.setProperty('--rgtube-blur', clamp(s.bgBlur, 0, 40) + 'px');
  root.style.setProperty('--rgtube-grad-angle', clamp(s.bgGradAngle, 0, 360) + 'deg');
}

const CLEANY_CSS = `
html.rgtube-cleany, html.rgtube-cleany body { overflow: hidden !important; }
html.rgtube-cleany ytd-browse[page-subtype="home"] { opacity: 0 !important; pointer-events: none !important; height: 100vh !important; overflow: hidden !important; transition: opacity .35s ease !important; }
html.rgtube-cleany-ui yt-searchbox { transition: transform .85s cubic-bezier(.22,1,.36,1) !important; }
html.rgtube-cleany-center ytd-masthead, html.rgtube-cleany-center ytd-masthead #container, html.rgtube-cleany-center ytd-masthead #center, html.rgtube-cleany-center #masthead-container { overflow: visible !important; }
html.rgtube-cleany-center yt-searchbox, html.rgtube-cleany-center.rgtube-sf yt-searchbox { position: relative !important; left: 0 !important; top: 0 !important; max-width: none !important; z-index: 3000 !important; transform: translate(var(--rgtube-dx,0px), var(--rgtube-dy,0px)) scale(1.3) !important; transition-delay: .3s !important; }
html.rgtube-cleany-center.rgtube-sf yt-searchbox { height: 40px !important; }
html.rgtube-cleany-center.rgtube-sf yt-searchbox #i0 { margin-top: 0 !important; }
html.rgtube-cleany-center.rgtube-sf .ytd-masthead #center { position: static !important; height: auto !important; width: auto !important; }
html.rgtube-cleany-center .ytSearchboxComponentInputBox { box-shadow: 0 12px 44px rgba(0,0,0,.35) !important; }
#rgtube-cleany-ctl { position: fixed; left: 20px; bottom: 20px; z-index: 2147483000; display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-radius: 14px; cursor: pointer; background: var(--yt-spec-raised-background,#212121); color: var(--yt-spec-text-primary,#fff); border: 1px solid var(--yt-spec-10-percent-layer,rgba(255,255,255,.15)); box-shadow: 0 8px 28px rgba(0,0,0,.35); font: 500 14px/1.2 Roboto,Arial,sans-serif; user-select: none; visibility: hidden; opacity: 0; transform: translateY(10px); transition: opacity .6s ease .7s, transform .6s ease .7s, visibility 0s linear .7s; }
html.rgtube-cleany-ui #rgtube-cleany-ctl { visibility: visible; opacity: 1; transform: none; }
#rgtube-cleany-ctl input { width: 18px; height: 18px; margin: 0; cursor: pointer; accent-color: var(--yt-spec-call-to-action,#3ea6ff); }
`;

const pathNow = () => location.pathname;
const isHome = () => pathNow() === '/';
const isSubs = () => pathNow().startsWith('/feed/subscriptions');
let centered = false, cur = { dx: 0, dy: 0 }, pollToken = 0;

function measureSearch(sb) {
  const r = sb.getBoundingClientRect();
  const cx = r.left + r.width / 2 - (centered ? cur.dx : 0);
  const cy = r.top + r.height / 2 - (centered ? cur.dy : 0);
  cur = { dx: Math.round(root.clientWidth / 2 - cx), dy: Math.round(window.innerHeight / 2 - cy) };
  root.style.setProperty('--rgtube-dx', cur.dx + 'px');
  root.style.setProperty('--rgtube-dy', cur.dy + 'px');
}
const findSearch = () => document.querySelector('ytd-masthead yt-searchbox') || document.querySelector('yt-searchbox');

function engageCenter() {
  if (centered) return;
  const token = ++pollToken;
  let tries = 0;
  const attempt = () => {
    if (token !== pollToken) return;
    const sb = findSearch();
    if (sb && sb.getBoundingClientRect().width > 0) { measureSearch(sb); centered = true; root.classList.add('rgtube-cleany-center'); return; }
    if (++tries < 600) requestAnimationFrame(attempt);
  };
  attempt();
}
function disengageCenter() { pollToken++; centered = false; root.classList.remove('rgtube-cleany-center'); }

function goTo(path) {
  const a = document.querySelector(`a[href="${path}"]`);
  if (a) { a.click(); setTimeout(() => { if (pathNow() !== path) location.assign(path); }, 1500); }
  else location.assign(path);
}

function ensureCtl() {
  let el = byId(IDS.ctl);
  if (el) return el;
  el = document.createElement('label');
  el.id = IDS.ctl;
  const text = document.createElement('span');
  text.textContent = 'Only videos from subscribed channels.';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => {
    s.cleanySubs = box.checked;
    try { const pr = chrome.storage.local.set({ cleanySubs: s.cleanySubs }); if (pr && typeof pr.catch === 'function') pr.catch(() => {}); } catch { /* yok say */ }
    syncCleany();
    if (!s.cleanySubs && isSubs()) goTo('/');
  });
  el.append(text, box);
  root.appendChild(el);
  return el;
}

let subsRedirecting = false;
function redirectToSubs() {
  if (subsRedirecting) return;
  let tries = 0;
  const attempt = () => {
    if (subsRedirecting) return;
    const a = document.querySelector('a[href="/feed/subscriptions"]');
    if (a) { subsRedirecting = true; a.click(); setTimeout(() => { subsRedirecting = false; }, 1200); return; }
    if (++tries < 120) requestAnimationFrame(attempt);
    else location.assign('/feed/subscriptions');
  };
  attempt();
}

function syncCleany() {
  const on = s.enabled && s.cleany;
  const ui = on && (isHome() || isSubs());
  const hide = on && isHome() && !s.cleanySubs;
  root.classList.toggle('rgtube-cleany-ui', ui);
  root.classList.toggle('rgtube-cleany', hide);
  if (ui) ensureCtl().querySelector('input').checked = !!s.cleanySubs;
  else byId(IDS.ctl)?.remove();
  if (hide) engageCenter(); else disengageCenter();
  if (on && s.cleanySubs && isHome()) redirectToSubs();
}

window.addEventListener('yt-navigate-finish', syncCleany, true);
window.addEventListener('popstate', () => setTimeout(syncCleany, 0));

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const sb = centered && findSearch();
    if (sb) measureSearch(sb);
    if (root.classList.contains('rgtube-sf')) measureSearchUp();
  }, 150);
});

let mhObserver = null, mhToken = 0, mhTarget = null;
function setViewClasses(flexy) {
  const th = !!(flexy && flexy.hasAttribute('theater'));
  const fs = !!(flexy && flexy.hasAttribute('fullscreen'));
  root.classList.toggle('rgtube-th', th);
  root.classList.toggle('rgtube-fs', fs);
  root.classList.toggle('rgtube-zv', th || fs);
}
function watchMasthead(on) {
  if (!on) { mhToken++; mhObserver?.disconnect(); mhObserver = null; mhTarget = null; setViewClasses(null); return; }
  if (mhObserver && mhTarget && mhTarget.isConnected) return;
  mhObserver?.disconnect(); mhObserver = null; mhTarget = null;
  const token = ++mhToken;
  let tries = 0;
  const attempt = () => {
    if (token !== mhToken || mhObserver) return;
    const flexy = document.querySelector('ytd-watch-flexy');
    if (flexy) {
      mhTarget = flexy; setViewClasses(flexy);
      mhObserver = new MutationObserver(() => setViewClasses(flexy));
      mhObserver.observe(flexy, { attributes: true, attributeFilter: ['theater', 'fullscreen'] });
      return;
    }
    if (location.pathname !== '/watch') { setViewClasses(null); return; }
    if (++tries < 900) requestAnimationFrame(attempt);
  };
  attempt();
}

function measureSearchUp() {
  const sb = findSearch();
  const r = sb && sb.getBoundingClientRect();
  if (!r || !r.width) return;
  root.style.setProperty('--rgtube-sfx', Math.round(root.clientWidth / 2 - (r.left + r.width / 2)) + 'px');
  root.style.setProperty('--rgtube-sfy', Math.round(window.innerHeight * 0.22 - (r.top + r.height / 2)) + 'px');
}
const syncSearchFocus = () => {
  const focused = !!document.activeElement?.closest?.('yt-searchbox');
  if (focused && !root.classList.contains('rgtube-sf') && s.enabled && s.barBottom && s.zen) measureSearchUp();
  root.classList.toggle('rgtube-sf', focused);
};
document.addEventListener('focusin', syncSearchFocus, true);
document.addEventListener('focusout', () => setTimeout(syncSearchFocus, 0), true);

const isWatch = () => location.pathname === '/watch';
function syncSplit() { root.classList.toggle('rgtube-ds', !!(s.enabled && s.zen && s.zenSplit && isWatch())); }
const onNavigate = () => { syncSplit(); watchMasthead(!!(s.enabled && s.zen)); };
window.addEventListener('yt-navigate-finish', onNavigate, true);
window.addEventListener('popstate', () => setTimeout(onNavigate, 0));

let scrollRaf = 0;
document.addEventListener('scroll', (e) => {
  if (!root.classList.contains('rgtube-ds')) return;
  const t = e.target;
  if (!(t instanceof Element) || !t.matches('#columns > #primary, #columns > #secondary')) return;
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; window.dispatchEvent(new Event('scroll')); });
}, true);

function apply() {
  if (!s.enabled) { Object.values(IDS).forEach((id) => byId(id)?.remove()); lastImg = null; }
  else {
    applyImageVars();
    setStyle(IDS.theme, buildThemeCss());
    applyBgLayer();
    setStyle(IDS.zen, s.zen ? ZEN_CSS : '');
    setStyle(IDS.cleany, s.cleany ? CLEANY_CSS : '');
  }
  root.classList.toggle('rgtube-bb', !!(s.enabled && s.barBottom));
  root.classList.toggle('rgtube-zen', !!(s.enabled && s.zen));
  watchMasthead(!!(s.enabled && s.zen));
  syncSplit();
  syncCleany();
  if (loaded) writeCache();
}

const cached = readCache();
if (cached) { s = { ...D, ...cached, bgImage: '' }; pendingImg = !!cached._hasImg; apply(); }

try {
  const req = chrome.storage.local.get(D);
  if (req && typeof req.then === 'function') {
    req.then((v) => { s = { ...D, ...v }; pendingImg = false; loaded = true; apply(); }).catch(() => { loaded = true; apply(); });
  } else { s = { ...D, ...(req || {}) }; pendingImg = false; loaded = true; apply(); }
} catch { loaded = true; apply(); }

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  let touched = false;
  for (const k of Object.keys(changes)) if (k in D) { s[k] = changes[k].newValue ?? D[k]; touched = true; }
  if (!touched) return;
  loaded = true; pendingImg = false; apply();
});
})();


// ============================================================================
// RGTube — Kanal Grupları (görünüm modülü)
// Yönetim popup panelindedir. Kenar çubuğunda gruplar rozet + isim olarak,
// Zen Mod'da yalnızca emoji/baş harf rozeti olarak görünür.
// ============================================================================
(() => {
'use strict';

const KG = 'rgtubeGroups', KO = 'rgtubeGroupsOn', KC = 'rgtubeGroupsOtherCollapsed', KM = 'rgtubeChannelMeta';
const OTHER = '__other';
const root = document.documentElement;
const PALETTE = ['#ff3d5a', '#2fd47a', '#3d8bff', '#ffb02e', '#ff5ad2', '#2fd4d4', '#9a6bff', '#b8e62e'];

const GROUPS_CSS = `
html.rgtube-g { --rgg-accent:#ff3d5a; }
html.rgtube-g #rgtube-g-root { padding:2px 0 6px; }
html.rgtube-g .rgtube-group { border-radius:10px; }
html.rgtube-g .rgtube-g-head { display:flex; align-items:center; gap:9px; padding:6px 12px; margin:2px 6px; border-radius:9px; cursor:pointer; user-select:none; color:var(--yt-spec-text-secondary,#aaa); transition:background .15s,color .15s; }
html.rgtube-g .rgtube-g-head:hover { background:var(--yt-spec-10-percent-layer,rgba(128,128,128,.18)); color:var(--yt-spec-text-primary,#fff); }
html.rgtube-g .rgg-badge { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; flex:none; border-radius:7px; font:700 12px/1 Roboto,Arial,sans-serif; background:color-mix(in srgb, var(--rgg-c,#9d97b3) 16%, transparent); border:1px solid color-mix(in srgb, var(--rgg-c,#9d97b3) 55%, transparent); color:var(--rgg-c,#9d97b3); }
html.rgtube-g .rgg-badge.rgg-emoji { font-size:13px; }
html.rgtube-g .rgg-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:600 13px/1.2 Roboto,Arial,sans-serif; }
html.rgtube-g .rgg-count { flex:none; font:600 11px/1 Roboto,Arial,sans-serif; padding:3px 7px; border-radius:20px; color:var(--yt-spec-text-secondary,#aaa); background:var(--yt-spec-10-percent-layer,rgba(128,128,128,.18)); font-variant-numeric:tabular-nums; }
html.rgtube-g .rgg-chev { flex:none; width:16px; height:16px; transition:transform .2s ease; transform:rotate(90deg); }
html.rgtube-g .rgtube-group.rgg-closed .rgg-chev { transform:rotate(0deg); }
html.rgtube-g .rgtube-g-body { padding-left:10px; }
html.rgtube-g .rgtube-group.rgg-closed .rgtube-g-body { display:none; }
html.rgtube-g .rgg-empty { display:block; padding:5px 14px 7px; font:400 11.5px/1.4 Roboto,Arial,sans-serif; color:var(--yt-spec-text-secondary,#888); opacity:.7; user-select:none; }
html.rgtube-g .rgg-hide-expander { display:none !important; }
html.rgtube-g tp-yt-app-drawer #guide-inner-content { scrollbar-width:thin; scrollbar-color:var(--yt-spec-10-percent-layer,rgba(128,128,128,.35)) transparent; }
html.rgtube-g tp-yt-app-drawer #guide-inner-content::-webkit-scrollbar { width:8px; }
html.rgtube-g tp-yt-app-drawer #guide-inner-content::-webkit-scrollbar-track { background:transparent; }
html.rgtube-g tp-yt-app-drawer #guide-inner-content::-webkit-scrollbar-thumb { background:var(--yt-spec-10-percent-layer,rgba(128,128,128,.35)); border-radius:8px; }
html.rgtube-g tp-yt-app-drawer #guide-inner-content::-webkit-scrollbar-thumb:hover { background:var(--rgg-accent); }
html.rgtube-g.rgtube-zen #rgtube-g-root { padding:0; }
html.rgtube-g.rgtube-zen .rgtube-group { width:fit-content; margin:0 auto; }
html.rgtube-g.rgtube-zen .rgtube-g-head { width:fit-content; justify-content:center; gap:0; padding:3px 0; margin:7px auto 3px; border-top:1px solid var(--yt-spec-10-percent-layer,rgba(128,128,128,.2)); border-radius:0; }
html.rgtube-g.rgtube-zen .rgg-name, html.rgtube-g.rgtube-zen .rgg-count, html.rgtube-g.rgtube-zen .rgg-chev { display:none; }
html.rgtube-g.rgtube-zen .rgg-badge { width:30px; height:30px; border-radius:9px; font-size:15px; box-shadow:0 0 10px color-mix(in srgb, var(--rgg-c,#9d97b3) 35%, transparent); }
html.rgtube-g.rgtube-zen .rgtube-g-body { padding-left:0; }
html.rgtube-g.rgtube-zen .rgg-empty { display:none; }
@media (prefers-reduced-motion: reduce) {
  html.rgtube-g .rgtube-g-head, html.rgtube-g .rgg-chev { transition:none !important; }
}
`;

let enabled = true, on = true, otherCollapsed = false, loaded = false;
let groups = [], meta = {}, lastSig = '', curSection = null;
let rootEl = null, otherEl = null;
const containers = new Map(), origPos = new WeakMap(), expanded = new WeakSet();
let schedTimer = null, guideMO = null, guideTarget = null, pollTries = 0;
let pendingW = {}, wTimer = null;

const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const validColor = (c) => /^#[0-9a-f]{6}$/i.test(c) ? c : PALETTE[0];
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
function badgeText(g) { const e = String(g.emoji || '').trim(); return e || initial(g.name); }

function sget(defs) {
  return new Promise((res) => {
    try { chrome.storage.local.get(defs, (v) => { void chrome.runtime?.lastError; res(v || defs); }); }
    catch { res(defs); }
  });
}
function flushW() {
  if (wTimer) { clearTimeout(wTimer); wTimer = null; }
  const p = pendingW; pendingW = {};
  if (!Object.keys(p).length) return;
  try { chrome.storage.local.set(p, () => { void chrome.runtime?.lastError; }); } catch { /* yok say */ }
}
function queueW(k, v) { pendingW[k] = v; if (!wTimer) wTimer = setTimeout(flushW, 220); }
function mutate(fn) { fn(); queueW(KG, groups); lastSig = ''; schedule(); }

function injectCss() {
  let st = document.getElementById('rgtube-groups-css');
  if (!st) { st = document.createElement('style'); st.id = 'rgtube-groups-css'; root.appendChild(st); }
  if (st.textContent !== GROUPS_CSS) st.textContent = GROUPS_CSS;
}
function removeCss() { document.getElementById('rgtube-groups-css')?.remove(); }

function channelKey(href) {
  try {
    const p = new URL(href, location.origin).pathname.replace(/\/$/, '');
    if (/^\/(@|channel\/|user\/|c\/)/.test(p)) return p;
  } catch { /* geçersiz */ }
  return null;
}
function entryAnchor(en) {
  return en.querySelector('a#endpoint[href]') || en.querySelector('#endpoint[href]') || en.querySelector('a[href]');
}
function entryInfo(en) {
  const a = entryAnchor(en);
  if (!a) return null;
  const href = a.getAttribute('href') || '';
  const key = channelKey(href);
  if (!key) return null;
  const title = (en.querySelector('yt-formatted-string')?.textContent || a.getAttribute('title') || en.querySelector('img')?.alt || key).trim();
  const img = en.querySelector('img')?.src || '';
  return { key, title, img, href };
}
function findSection() {
  let best = null, bestScore = 0;
  document.querySelectorAll('ytd-guide-section-renderer').forEach((sec) => {
    let score = 0;
    sec.querySelectorAll('ytd-guide-entry-renderer a#endpoint[href]').forEach((a) => { if (channelKey(a.getAttribute('href'))) score++; });
    if (!score) return;
    const headTxt = (sec.querySelector('#header, h3')?.textContent || '').toLowerCase();
    const headHref = sec.querySelector('#header a[href], h3 a[href]')?.getAttribute('href') || '';
    if (headHref.startsWith('/feed/subscriptions') || headHref.startsWith('/feed/channels') || /subscription|abonelik/.test(headTxt) || sec.querySelector('a[href="/feed/subscriptions"]')) score += 100;
    if (/more from youtube|youtube'dan daha fazla|explore|keşfet/.test(headTxt)) score -= 200;
    if (score > bestScore) { bestScore = score; best = sec; }
  });
  return best;
}
// Kanal öğelerini ve panelde gösterilecek meta bilgilerini tek geçişte toplar.
function scanGuide(sec) {
  const els = new Map();
  const info = {};
  sec.querySelectorAll('ytd-guide-entry-renderer').forEach((en) => {
    const i = entryInfo(en);
    if (!i || els.has(i.key)) return;
    els.set(i.key, en);
    info[i.key] = { t: i.title, h: i.href, i: i.img };
  });
  return { els, info };
}
function writeMeta(info) {
  if (!info || !Object.keys(info).length) return;   // kılavuz geçici olarak boşsa eski listeyi koru
  if (JSON.stringify(info) !== JSON.stringify(meta)) { meta = info; queueW(KM, meta); }
}

const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

function makeHead(badge, name, count, onToggle) {
  const head = el('div', 'rgtube-g-head');
  head.setAttribute('role', 'button'); head.tabIndex = 0;
  const b = el('span', 'rgg-badge', badge);
  const n = el('span', 'rgg-name', name);
  const c = el('span', 'rgg-count', String(count));
  const ch = el('span', 'rgg-chev'); ch.innerHTML = CHEV;
  head.append(b, n, c, ch);
  head.addEventListener('click', onToggle);
  head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } });
  return { head, b, n, c };
}
function buildGroup(g) {
  const gid = g.id;
  const c = el('div', 'rgtube-group'); c.dataset.gid = gid;
  const refs = makeHead(badgeText(g), g.name, g.channels.length, () => mutate(() => {
    const cur = groups.find((x) => x.id === gid);
    if (cur) cur.collapsed = !cur.collapsed;
  }));
  const body = el('div', 'rgtube-g-body');
  c.append(refs.head, body);
  c._refs = { ...refs, body };
  return c;
}
function buildOther() {
  const c = el('div', 'rgtube-group rgtube-other'); c.dataset.gid = OTHER;
  const refs = makeHead('⋯', 'Diğer kanallar', 0, () => { otherCollapsed = !otherCollapsed; queueW(KC, otherCollapsed); lastSig = ''; schedule(); });
  const body = el('div', 'rgtube-g-body');
  c.append(refs.head, body);
  c._refs = { ...refs, body };
  return c;
}
function moveEntry(en, body, index) {
  if (!origPos.has(en)) origPos.set(en, { parent: en.parentElement, next: en.nextElementSibling });
  if (body.children[index] !== en) body.insertBefore(en, body.children[index] || null);
}
function fillBody(c, keys, els, items) {
  const body = c._refs.body;
  const want = new Set(keys.map((k) => els.get(k)).filter(Boolean));
  Array.from(body.children).forEach((ch) => {
    if (ch.matches && ch.matches('ytd-guide-entry-renderer') && !want.has(ch)) {
      delete ch.dataset.rggKey;
      items.appendChild(ch);            // asla silme; kanal listesine geri koy
    }
  });
  body.querySelector('.rgg-empty')?.remove();
  let i = 0;
  keys.forEach((k) => { const en = els.get(k); if (!en) return; en.dataset.rggKey = k; moveEntry(en, body, i++); });
  if (!i) body.appendChild(el('span', 'rgg-empty', 'Boş grup — RGTube panelinden kanal ekle.'));
}

function organize(sec, els) {
  if (sec !== curSection) { curSection = sec; lastSig = ''; }
  sec.classList.add('rgtube-g-subs');
  const items = sec.querySelector('#items') || sec;
  if (!rootEl) rootEl = el('div'); rootEl.id = 'rgtube-g-root';
  if (!otherEl) otherEl = buildOther();
  if (rootEl.parentElement !== items) items.appendChild(rootEl);
  const native = [];
  els.forEach((en, k) => { if (!rootEl.contains(en)) native.push(k); });
  const sig = JSON.stringify([groups, otherCollapsed, native, rootEl.isConnected]);
  if (sig === lastSig) return;
  lastSig = sig;

  sec.querySelectorAll('ytd-guide-collapsible-entry-renderer, ytd-guide-collapsible-section-entry-renderer').forEach((w) => {
    const row = Array.from(w.querySelectorAll('ytd-guide-entry-renderer')).find((r) => /daha fazla|devamını gör|show more|see more/i.test(r.textContent || ''));
    if (row && !expanded.has(row)) { expanded.add(row); (row.querySelector('a#endpoint') || row).click(); }
  });

  const seen = new Set();
  groups.forEach((g, idx) => {
    let c = containers.get(g.id);
    if (!c) { c = buildGroup(g); containers.set(g.id, c); }
    if (rootEl.children[idx] !== c) rootEl.insertBefore(c, rootEl.children[idx] || null);
    const r = c._refs, col = validColor(g.color);
    r.b.textContent = badgeText(g);
    r.b.classList.toggle('rgg-emoji', !!String(g.emoji || '').trim());
    r.b.style.setProperty('--rgg-c', col);
    r.n.textContent = g.name;
    r.c.textContent = g.channels.length;
    r.head.title = g.name + ' · ' + g.channels.length + ' kanal';
    c.classList.toggle('rgg-closed', !!g.collapsed);
    fillBody(c, g.channels.filter((k) => els.has(k)), els, items);
    seen.add(g.id);
  });

  const assigned = new Set(groups.flatMap((g) => g.channels));
  const otherKeys = Array.from(els.keys()).filter((k) => !assigned.has(k));
  if (rootEl.lastElementChild !== otherEl) rootEl.appendChild(otherEl);
  otherEl._refs.c.textContent = otherKeys.length;
  otherEl._refs.head.title = 'Diğer kanallar · ' + otherKeys.length;
  otherEl.classList.toggle('rgg-closed', otherCollapsed);
  otherEl.style.display = otherKeys.length ? '' : 'none';
  fillBody(otherEl, otherKeys, els, items);

  for (const [id, c] of containers) if (!seen.has(id)) { c.remove(); containers.delete(id); }

  sec.querySelectorAll('ytd-guide-collapsible-entry-renderer, ytd-guide-collapsible-section-entry-renderer').forEach((w) => {
    const hasChannel = Array.from(w.querySelectorAll('ytd-guide-entry-renderer')).some((en) => channelKey(entryAnchor(en)?.getAttribute('href')));
    w.classList.toggle('rgg-hide-expander', !hasChannel);
  });
}

function teardown() {
  lastSig = '';
  const sec = findSection();
  const items = sec && sec.querySelector('#items');
  if (rootEl) {
    rootEl.querySelectorAll('ytd-guide-entry-renderer').forEach((en) => {
      delete en.dataset.rggKey;
      const o = origPos.get(en);
      if (items) { if (o && o.next && o.next.parentElement === items) items.insertBefore(en, o.next); else items.appendChild(en); }
    });
    rootEl.remove();
  }
  rootEl = null; otherEl = null; containers.clear(); curSection = null;
  document.querySelectorAll('.rgtube-g-subs').forEach((s2) => {
    s2.classList.remove('rgtube-g-subs');
    s2.querySelectorAll('.rgg-hide-expander').forEach((w) => w.classList.remove('rgg-hide-expander'));
  });
}

function sync() {
  if (!loaded) return;
  if (!enabled) { removeCss(); root.classList.remove('rgtube-g'); teardown(); return; }
  const sec = findSection();
  if (!sec) return;
  const { els, info } = scanGuide(sec);
  writeMeta(info);
  if (!els.size) return;                       // kılavuz henüz çizilmedi: DOM'a dokunma
  if (!on) { root.classList.remove('rgtube-g'); teardown(); return; }
  injectCss();
  root.classList.add('rgtube-g');
  organize(sec, els);
}

function schedule() {
  if (schedTimer) return;
  schedTimer = setTimeout(() => { schedTimer = null; try { sync(); } catch { /* sayfayı bozma */ } }, 120);
}
function attachGuideObserver() {
  const gr = document.querySelector('ytd-guide-renderer');
  const target = document.querySelector('tp-yt-app-drawer') || (gr && gr.parentElement);
  if (!target) { if (++pollTries < 900) requestAnimationFrame(attachGuideObserver); return; }
  if (guideTarget === target && guideMO && guideTarget.isConnected) return;
  guideMO && guideMO.disconnect();
  guideTarget = target;
  guideMO = new MutationObserver(schedule);
  guideMO.observe(target, { childList: true, subtree: true });
  schedule();
}

window.addEventListener('pagehide', flushW);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushW(); });
window.addEventListener('yt-navigate-finish', () => { pollTries = 0; attachGuideObserver(); schedule(); }, true);
window.addEventListener('popstate', () => setTimeout(schedule, 0));

try {
  chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'rgtube-groups-scan') {
    schedule();
    // Panel yanıtı beklemiyor (storage'dan okuyor). Portu açık bırakmıyoruz:
    // aksi halde panel kapanınca "message port closed" hatası oluşur.
    return false;
  }
  return false;
});
} catch { /* yok say */ }

function normGroups(arr) {
  return (Array.isArray(arr) ? arr : []).map((g) => ({
    id: String(g.id || ('g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6))),
    name: String(g.name || 'Grup').slice(0, 40),
    emoji: String(g.emoji || '').slice(0, 8),
    color: validColor(g.color),
    collapsed: !!g.collapsed,
    channels: Array.isArray(g.channels) ? [...new Set(g.channels.map(String))] : []
  }));
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let dirty = false;
    if (changes.enabled) { enabled = changes.enabled.newValue !== false; dirty = true; }
    if (changes[KO]) { const v = changes[KO].newValue !== false; if (v !== on) { on = v; dirty = true; } }
    if (changes[KC]) { const v = !!changes[KC].newValue; if (v !== otherCollapsed) { otherCollapsed = v; dirty = true; } }
    if (changes[KG]) {
      const v = normGroups(changes[KG].newValue);
      if (JSON.stringify(v) !== JSON.stringify(groups)) { groups = v; dirty = true; }
    }
    if (changes[KM] && changes[KM].newValue) meta = changes[KM].newValue;
    if (dirty) { lastSig = ''; schedule(); }
  });
} catch { /* yok say */ }

(async () => {
  const v = await sget({ [KG]: [], [KO]: true, [KC]: false, [KM]: {}, enabled: true });
  groups = normGroups(v[KG]);
  meta = v[KM] && typeof v[KM] === 'object' ? v[KM] : {};
  on = v[KO] !== false;
  otherCollapsed = !!v[KC];
  enabled = v.enabled !== false;
  loaded = true;
  attachGuideObserver();
  schedule();
})();
})();


// ============================================================================
// RGTube — Yer İmleri (video zaman damgaları)
// İzleme sayfasında "🔖 12:35" düğmesi: tıkla, o an kaydedilsin.
// Paneldeki listeden tek tıkla aynı saniyeye dönülür.
// ============================================================================
(() => {
'use strict';

const KB = 'rgtubeBookmarks';
const KO = 'rgtubeBmOn';
const MAX_MARKS = 1000;
const POP_ID = 'rgtube-bm-pop';
const BTN_ID = 'rgtube-bm-player';
const CSS_ID = 'rgtube-bm-css';
const BOOKMARK_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 2h12a2 2 0 0 1 2 2v18l-8-5-8 5V4a2 2 0 0 1 2-2z"/></svg>';
const root = document.documentElement;

const CSS = `
#rgtube-bm-player { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: #fff; cursor: pointer; opacity: .92; }
#rgtube-bm-player:hover { opacity: 1; }
#rgtube-bm-player svg { width: 24px; height: 24px; fill: currentColor; pointer-events: none; }
#rgtube-bm-player.rgtube-bm-active svg { fill: #ff3d5a; }
#rgtube-bm-pop { position: fixed; z-index: 2147483000; width: 268px; max-height: 320px; overflow-y: auto; padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(21,19,28,.97); box-shadow: 0 12px 34px rgba(0,0,0,.45); color: #f3f0fa; font-family: Roboto, Arial, sans-serif; }
#rgtube-bm-pop[hidden] { display: none !important; }
.rgtube-bm-head { padding: 5px 8px 7px; font: 600 11.5px/1.3 Roboto, Arial, sans-serif; color: #9d97b3; }
.rgtube-bm-addrow { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; margin: 0 0 4px; padding: 6px 9px; border: 1px solid rgba(255,61,90,.5); border-radius: 8px; background: rgba(255,61,90,.12); color: #ffb3bf; font: 600 12px/1.2 Roboto, Arial, sans-serif; cursor: pointer; }
.rgtube-bm-addrow:hover { background: rgba(255,61,90,.2); color: #fff; }
.rgtube-bm-addrow span { opacity: .85; font-variant-numeric: tabular-nums; }
.rgtube-bm-row { display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-radius: 8px; }
.rgtube-bm-row:hover { background: rgba(255,255,255,.07); }
.rgtube-bm-seek { flex: 1; text-align: left; padding: 5px 8px; border: 0; border-radius: 7px; background: transparent; color: #f3f0fa; font: 600 12.5px/1 Roboto, Arial, sans-serif; cursor: pointer; font-variant-numeric: tabular-nums; }
.rgtube-bm-seek:hover { background: rgba(255,255,255,.09); }
.rgtube-bm-del { width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: #9d97b3; font-size: 14px; cursor: pointer; }
.rgtube-bm-del:hover { background: rgba(255,61,90,.18); color: #ff6b81; }
#rgtube-bm-toast { position: fixed; left: 50%; bottom: 92px; transform: translate(-50%, 10px); z-index: 2147483000; display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: rgba(21,19,28,.96); color: #f3f0fa; font: 500 12.5px/1.3 Roboto, Arial, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.4); opacity: 0; pointer-events: none; transition: opacity .18s, transform .18s; }
#rgtube-bm-toast.rgtube-show { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
#rgtube-bm-toast button { padding: 4px 9px; border-radius: 7px; border: 1px solid rgba(255,61,90,.5); background: transparent; color: #ff8a9c; font: 600 12px/1 Roboto, Arial, sans-serif; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { #rgtube-bm-toast { transition: none !important; } }
`;

let on = true, marks = [], loaded = false;
let curVid = '', lastSec = -1, shownFor = '';
let saveTimer = null, toastTimer = null;

const $id = (id) => document.getElementById(id);
const videoEl = () => document.querySelector('video#movie_player') || document.querySelector('.html5-video-player video') || document.querySelector('video');
const clean = (v) => String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);

function fmt(t) {
  const n = Math.max(0, Math.floor(Number(t) || 0));
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
  const p = (x) => String(x).padStart(2, '0');
  return (h ? h + ':' + p(m) : String(m)) + ':' + p(s);
}
function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function normMarks(list) {
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
      id: String(b.id || uid()),
      vid,
      t,
      title: String(b.title || '').slice(0, 200),
      createdAt: Number(b.createdAt) || Date.now()
    });
    if (out.length >= MAX_MARKS) break;
  }
  return out;
}

function sget(defs) {
  return new Promise((res) => {
    try { chrome.storage.local.get(defs, (v) => { void chrome.runtime?.lastError; res(v || defs); }); }
    catch { res(defs); }
  });
}
function sset(obj) { try { chrome.storage.local.set(obj, () => { void chrome.runtime?.lastError; }); } catch { /* yok say */ } }
function queueSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; sset({ [KB]: marks }); }, 250);
}
function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (loaded) sset({ [KB]: marks });
}

function isWatchPath() {
  const p = location.pathname;
  return p === '/watch' || p.startsWith('/shorts/') || p.startsWith('/live/') || p.startsWith('/v/');
}
function watchInfo() {
  let vid = '';
  try {
    const u = new URL(location.href);
    vid = clean(u.searchParams.get('v') || '');
    if (!vid) {
      const m = u.pathname.match(/^\/(?:shorts|live|v|embed)\/([\w-]{6,})/);
      if (m) vid = clean(m[1]);
    }
    if (!vid && /(^|\.)youtu\.be$/.test(u.hostname)) vid = clean(u.pathname.split('/')[1] || '');
  } catch { /* geçersiz URL */ }
  let title = '';
  const h1 = document.querySelector('ytd-watch-metadata h1 yt-formatted-string, ytd-watch-metadata h1, #info-container h1');
  if (h1) title = h1.textContent || '';
  if (!title) title = (document.title || '').replace(/\s*[-–|]\s*YouTube\s*$/, '');
  return { vid, title: title.trim().slice(0, 200) };
}

function injectCss() {
  if ($id(CSS_ID)) return;
  const st = document.createElement('style');
  st.id = CSS_ID;
  st.textContent = CSS;
  root.appendChild(st);
}

function ensureUI() {
  if ($id(POP_ID)) { ensurePlayerButton(); return; }
  injectCss();
  const pop = document.createElement('div');
  pop.id = POP_ID;
  pop.hidden = true;
  root.appendChild(pop);
  syncFullscreenLayer();
  ensurePlayerButton();
}

// Yer imi düğmesi: oynatıcının sol kontrol grubunda, süre göstergesinin hemen yanında.
function ensurePlayerButton() {
  const controls = document.querySelector('.ytp-left-controls');
  if (!controls) return false;
  let btn = $id(BTN_ID);
  if (btn && btn.parentElement === controls) return true;
  if (btn) btn.remove();
  btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.type = 'button';
  btn.className = 'ytp-button';
  btn.title = 'Yer imi';
  btn.setAttribute('aria-label', 'Yer imi');
  btn.innerHTML = BOOKMARK_SVG;
  const time = controls.querySelector('.ytp-time-display');
  if (time && time.nextSibling) controls.insertBefore(btn, time.nextSibling);
  else controls.appendChild(btn);
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onBookmarkClick(); });
  return true;
}

function hideBookmarkUI() {
  const b = $id(BTN_ID);
  if (b) b.remove();
  closePop();
}

// Tek düğme: her tıklamada anı kaydeder ve kayıt listesini açar.
function onBookmarkClick() {
  addMark();
  openPop();
}

function updateButtonState() {
  const btn = $id(BTN_ID);
  if (!btn) return;
  const n = listFor(curVid).length;
  btn.classList.toggle('rgtube-bm-active', n > 0);
  const v = videoEl();
  const t = Math.floor(Number(v && v.currentTime) || 0);
  btn.title = n ? 'Yeni yer imi ekle · ' + fmt(t) + ' · ' + n + ' kayıt' : 'Yer imi ekle · ' + fmt(t);
}

function showToast(msg, undoId) {
  let el = $id('rgtube-bm-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rgtube-bm-toast';
    root.appendChild(el);
    syncFullscreenLayer();
  }
  el.textContent = '';
  const span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);
  if (undoId) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Geri al';
    b.addEventListener('click', () => { removeMark(undoId); hideToast(); });
    el.appendChild(b);
  }
  el.classList.add('rgtube-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undoId ? 4000 : 2200);
}
function hideToast() {
  clearTimeout(toastTimer);
  $id('rgtube-bm-toast')?.classList.remove('rgtube-show');
}

// Tam ekranda yalnızca fullscreen öğesinin alt ağacı çizilir; açılır liste ve
// bildirim o öğenin içine taşınmazsa görünmez olur.
function syncFullscreenLayer() {
  const host = document.fullscreenElement || root;
  [POP_ID, 'rgtube-bm-toast'].forEach((id) => {
    const el = $id(id);
    if (el && el.parentElement !== host) host.appendChild(el);
  });
}
document.addEventListener('fullscreenchange', () => {
  syncFullscreenLayer();
  const pop = $id(POP_ID);
  if (pop && !pop.hidden) placePop();
});

function listFor(vid) { return marks.filter((b) => b.vid === vid).sort((a, b) => a.t - b.t); }

function renderPop() {
  const pop = $id(POP_ID);
  if (!pop) return;
  const list = listFor(curVid);
  pop.textContent = '';
  const head = document.createElement('div');
  head.className = 'rgtube-bm-head';
  head.textContent = list.length ? list.length + ' kayıt · tıkla ve dön' : 'Bu videoda kayıt yok';
  pop.appendChild(head);
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'rgtube-bm-addrow';
  add.appendChild(document.createTextNode('＋ Bu anı kaydet'));
  const tm = document.createElement('span');
  const vv = videoEl();
  tm.textContent = fmt(Math.floor(Number(vv && vv.currentTime) || 0));
  add.appendChild(tm);
  add.addEventListener('click', () => addMark());
  pop.appendChild(add);
  list.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'rgtube-bm-row';
    const seek = document.createElement('button');
    seek.type = 'button';
    seek.className = 'rgtube-bm-seek';
    seek.textContent = fmt(b.t);
    seek.title = b.title || '';
    seek.addEventListener('click', () => { seekTo(b.t); closePop(); });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'rgtube-bm-del';
    del.textContent = '×';
    del.title = 'Bu kaydı sil';
    del.addEventListener('click', () => { removeMark(b.id); });
    row.append(seek, del);
    pop.appendChild(row);
  });
  updateButtonState();
}
function placePop() {
  const p = $id(POP_ID), btn = $id(BTN_ID);
  if (!p || !btn) return;
  const r = btn.getBoundingClientRect();
  const w = p.offsetWidth || 268;
  const left = Math.min(Math.max(8, window.innerWidth - w - 8), Math.max(8, r.right - w));
  p.style.left = left + 'px';
  p.style.bottom = Math.max(8, window.innerHeight - r.top + 10) + 'px';
}
function openPop() {
  const p = $id(POP_ID);
  if (!p) return;
  renderPop();
  p.hidden = false;
  placePop();
}
function closePop() { const p = $id(POP_ID); if (p) p.hidden = true; }
function togglePop() { const p = $id(POP_ID); if (p && !p.hidden) closePop(); else openPop(); }

function seekTo(t) {
  const v = videoEl();
  if (!v) return;
  try {
    v.currentTime = Math.max(0, Number(t) || 0);
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch { /* yok say */ }
}

function addMark() {
  const v = videoEl();
  const info = watchInfo();
  if (!v || !info.vid) { showToast('Video bulunamadı.'); return; }
  const t = Math.max(0, Math.floor(Number(v.currentTime) || 0));
  const exists = marks.find((b) => b.vid === info.vid && Math.abs(b.t - t) < 2);
  if (exists) { showToast(fmt(exists.t) + ' zaten kayıtlı.'); openPop(); return; }
  const mark = { id: uid(), vid: info.vid, t, title: info.title || 'Video', createdAt: Date.now() };
  marks.unshift(mark);
  if (marks.length > MAX_MARKS) marks.length = MAX_MARKS;
  queueSave();
  curVid = info.vid;
  renderPop();
  const btn = $id(BTN_ID);
  if (btn) btn.classList.add('rgtube-bm-active');
  showToast(fmt(t) + ' kaydedildi.', mark.id);
}
function removeMark(id) {
  const i = marks.findIndex((b) => b.id === id);
  if (i < 0) return;
  marks.splice(i, 1);
  queueSave();
  renderPop();
}

let tickTimer = null;
function tick() {
  if (!loaded || !on) return;
  if (!isWatchPath()) {                       // ana sayfa/arama: gereksiz sorgu yapma
    if (shownFor) { shownFor = ''; hideBookmarkUI(); }
    return;
  }
  const info = watchInfo();
  const v = videoEl();
  const show = !!info.vid && !!v;
  if (!show) { if (shownFor) { shownFor = ''; hideBookmarkUI(); } return; }
  shownFor = info.vid;
  if (!ensurePlayerButton()) return;
  if (info.vid !== curVid) { curVid = info.vid; lastSec = -1; renderPop(); }
  const sec = Math.floor(Number(v.currentTime) || 0);
  if (sec !== lastSec) { lastSec = sec; updateButtonState(); }
}

document.addEventListener('click', (e) => {
  const pop = $id(POP_ID);
  if (!pop || pop.hidden) return;
  const onBtn = e.target.closest && e.target.closest('#' + BTN_ID);
  if (!pop.contains(e.target) && !onBtn) closePop();
}, true);

window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
window.addEventListener('yt-navigate-finish', () => { closePop(); setTimeout(tick, 0); }, true);
window.addEventListener('popstate', () => setTimeout(tick, 0));

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[KO]) {
      on = changes[KO].newValue !== false;
      if (!on) { hideBookmarkUI(); hideToast(); }
    }
    if (changes[KB]) {
      marks = normMarks(changes[KB].newValue);
      renderPop();
    }
  });
} catch { /* yok say */ }

(async () => {
  const v = await sget({ [KB]: [], [KO]: true });
  marks = normMarks(v[KB]);
  on = v[KO] !== false;
  loaded = true;
  ensureUI();
  tick();
  if (!tickTimer) tickTimer = setInterval(tick, 500);
})();
})();
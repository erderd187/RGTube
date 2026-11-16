// Zen Mod: Zen Internet (sameerasw/my-internet) youtube.com.css'in optimize edilmiş,
// blur/saydamlık içermeyen, üçüncü taraf eklenti/TV stillerinden arındırılmış portu.
// Zen Mod açıkken content.js bunu sayfaya enjekte eder.
// Not: ağır :has() seçicileri content.js'in yönettiği html sınıflarına çevrildi
// (rgtube-zv/th/fs: izleme görünümü, rgtube-sf: arama kutusu odakta).
// --rgtube-surface: kullanıcı özel arka plan seçtiyse panel zeminleri ona uyar.
globalThis.RGTUBE_ZEN_CSS = `
/* ---------- Side guide ---------- */
ytd-mini-guide-renderer,
[theater=""] #contentContainer::after {
  display: none !important;
}
tp-yt-app-drawer > #contentContainer:not([opened=""]),
#contentContainer:not([opened=""]) #guide-content,
ytd-mini-guide-renderer,
ytd-mini-guide-entry-renderer {
  background-color: var(--rgtube-surface, var(--yt-spec-text-primary-inverse)) !important;
  background: var(--rgtube-surface, var(--yt-spec-text-primary-inverse)) !important;
}
#content:not(:has(#contentContainer[opened=""])) #page-manager {
  margin-left: 0 !important;
}
ytd-app:not([guide-persistent-and-visible=""]) tp-yt-app-drawer > #contentContainer {
  background-color: var(--rgtube-surface, var(--yt-spec-text-primary-inverse)) !important;
}

/* ---------- Guide temizliği (EN + TR başlıklar) ---------- */
ytd-guide-section-renderer:has(
  [title="YouTube Studio"],
  [title="Sport"], [title="Sports"], [title="Spor"],
  [title="Settings"], [title="Ayarlar"]
),
ytd-guide-renderer #footer {
  display: none !important;
}
ytd-guide-section-renderer,
ytd-guide-collapsible-section-entry-renderer {
  border: none !important;
}
ytd-alert-with-button-renderer {
  align-items: center !important;
  justify-content: center !important;
}

/* ---------- Mini guide (ikon-only sidebar) ---------- */
ytd-app #endpoint.ytd-guide-entry-renderer yt-formatted-string,
ytd-app h3.ytd-guide-section-renderer,
ytd-app #newness-dot,
ytd-app tp-yt-paper-item:not(:hover) yt-icon.guide-entry-badge {
  display: none !important;
}
ytd-app #endpoint.ytd-guide-entry-renderer,
ytd-app ytd-guide-entry-renderer,
ytd-app ytd-guide-collapsible-section-entry-renderer,
ytd-app .ytd-guide-section-renderer,
ytd-app ytd-guide-section-renderer,
ytd-app ytd-guide-renderer > #sections,
ytd-app ytd-guide-renderer,
ytd-app #guide-inner-content,
ytd-app #guide-content,
ytd-app #guide-wrapper,
ytd-app tp-yt-app-drawer,
ytd-app #tabsContent,
ytd-app yt-tab-group-shape,
ytd-app yt-tab-group-shape > [role="tablist"] {
  width: fit-content !important;
}
ytd-app tp-yt-paper-item {
  padding: 2px 10px !important;
}
ytd-app yt-icon.ytd-guide-entry-renderer,
ytd-app yt-img-shadow.ytd-guide-entry-renderer {
  margin: 0 !important;
}
ytd-app tp-yt-paper-tabs {
  margin: auto 0 !important;
}
ytd-app #page-manager {
  margin-left: 80px !important;
}
ytd-app #tabsContainer.tp-yt-paper-tabs {
  display: flex;
  justify-content: center;
  justify-items: center;
}
ytd-two-column-browse-results-renderer[page-subtype="playlist"] {
  width: fit-content !important;
}

/* ---------- Voice search kapalı ---------- */
#voice-search-button {
  display: none !important;
}

/* ---------- Filter chips ---------- */
#chips-wrapper {
  top: 0 !important;
}
[page-subtype="home"] .ytd-two-column-browse-results-renderer #header {
  display: none !important;
}
#chips {
  display: flex !important;
}
#chips > yt-chip-cloud-chip-renderer:nth-last-child(1) {
  order: 1 !important;
  margin-right: 12px !important;
}
#chips > yt-chip-cloud-chip-renderer:not(:nth-last-child(1)) {
  order: 2 !important;
}

/* ---------- Compact feed ---------- */
ytd-rich-item-renderer {
  margin-bottom: 15px !important;
  content-visibility: auto !important;
  contain-intrinsic-size: auto 400px !important;
}
ytd-rich-item-renderer [rendered-from-rich-grid] {
  --ytd-rich-item-row-usable-width: calc(100% - var(--ytd-rich-grid-gutter-margin) * 1) !important;
}
ytd-rich-item-renderer #metadata.ytd-video-meta-block {
  flex-direction: row !important;
}
ytd-rich-item-renderer #metadata.ytd-video-meta-block #metadata-line span:nth-child(3) {
  height: 1em !important;
  margin-left: 1em !important;
}
ytd-rich-grid-media {
  border-radius: 1.2em;
  height: 100% !important;
}
ytd-rich-grid-media ytd-menu-renderer #button {
  opacity: 0 !important;
  transition: opacity 0.2s ease-in-out !important;
}
ytd-rich-grid-media:hover ytd-menu-renderer #button {
  opacity: 1 !important;
}

/* ---------- Thumbnail hover zoom ---------- */
#inline-preview-player {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1s !important;
  transform: scale(1) !important;
}
#video-preview-container:has(#inline-preview-player) {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  border-radius: 1.2em !important;
  overflow: hidden !important;
  transform: scale(1) !important;
}
#video-preview-container:has(#inline-preview-player):hover {
  transform: scale(1.25) !important;
  box-shadow: #0008 0px 0px 30px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 2s !important;
}

/* ---------- Ambient mode kapalı ---------- */
#cinematics-container {
  display: none !important;
}

/* ---------- Theater / Zen view ---------- */
html.rgtube-th #full-bleed-container {
  height: 100vh !important;
  max-height: 100vh !important;
  top: 0 !important;
}
#masthead-container,
#columns #secondary {
  transition: opacity 0.3s ease-in-out 0.5s, top 0.3s ease-in-out 0.5s !important;
}
html.rgtube-zv:not(.rgtube-sf) #masthead-container {
  top: -40px !important;
  opacity: 0 !important;
  transition: opacity 0.25s cubic-bezier(0.445, 0.05, 0.55, 0.95), top 0.25s cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;
}
html.rgtube-zv:not(.rgtube-sf) #masthead-container:hover {
  opacity: 1 !important;
  top: 0 !important;
}
html.rgtube-zv #content {
  --ytd-toolbar-height: 0px !important;
}
html.rgtube-zv #content #page-manager {
  margin: 0 !important;
}

/* ---------- Zen view yorumlar ---------- */
html.rgtube-zv #content #columns #secondary {
  display: none !important;
}
ytd-comments {
  transition: opacity 0.4s ease-in-out, left 0.4s ease-in-out, right 0.4s ease-in-out !important;
  contain: layout style !important;
}
html.rgtube-zv #content ytd-comments {
  background-color: var(--rgtube-surface, var(--yt-spec-text-primary-inverse)) !important;
  padding: 0 2em !important;
  border-radius: 0 2em 2em 0 !important;
  max-height: calc(100vh - 175px) !important;
  overflow-y: scroll !important;
  position: fixed !important;
  z-index: 1000 !important;
  top: 3vh !important;
  left: -40em !important;
  width: 40em !important;
  height: 90vh !important;
  opacity: 0 !important;
}
html.rgtube-zv #content ytd-comments:hover {
  opacity: 1 !important;
  left: 0 !important;
}

/* ---------- Ayrı kaydırma: video alanı (yorumlar dahil) ve öneri listesi ----------
   html.rgtube-ds: content.js yalnızca /watch sayfasında, Zen + zenSplit açıkken ekler.
   Yalnızca geniş (iki sütunlu) düzende, tiyatro ve tam ekran dışında geçerlidir. */
@media (min-width: 1017px) {
  html.rgtube-ds:not(.rgtube-zv),
  html.rgtube-ds:not(.rgtube-zv) body {
    overflow: hidden !important;
  }
  html.rgtube-ds:not(.rgtube-zv) ytd-watch-flexy:not([theater]):not([fullscreen]):not([miniplayer]) #columns {
    height: calc(100vh - 56px) !important;
    min-height: 0 !important;
    align-items: stretch !important;
  }
  html.rgtube-ds:not(.rgtube-zv) ytd-watch-flexy:not([theater]):not([fullscreen]):not([miniplayer]) #columns > #primary,
  html.rgtube-ds:not(.rgtube-zv) ytd-watch-flexy:not([theater]):not([fullscreen]):not([miniplayer]) #columns > #secondary {
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    position: relative !important;
    top: 0 !important;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--yt-spec-text-primary, #fff) 35%, transparent) transparent;
  }
}

/* ---------- Misc ---------- */
#content #dismissible:hover ytd-video-meta-block {
  opacity: 1 !important;
}
html.rgtube-th:not(.rgtube-fs) #panels-full-bleed-container {
  width: 0 !important;
}

/* ---------- Altyazılar: blur yok, düz koyu zemin ---------- */
.caption-window {
  background-color: #000a !important;
  border-radius: 1em !important;
  padding: 1em !important;
  box-shadow: #0006 0 0 12px !important;
  width: fit-content !important;
}
.ytp-caption-segment {
  background: none !important;
}

/* ---------- Player gölgesi ---------- */
.ytp-gradient-bottom {
  display: initial !important;
}

/* ---------- Yeni feed layout: 4/5/6 sütun ---------- */
@media only screen and (min-width: 1400px) {
  ytd-rich-item-renderer[rendered-from-rich-grid] {
    --ytd-rich-grid-items-per-row: 4 !important;
  }
}
@media only screen and (min-width: 1700px) {
  ytd-rich-item-renderer[rendered-from-rich-grid] {
    --ytd-rich-grid-items-per-row: 5 !important;
  }
}
@media only screen and (min-width: 2180px) {
  ytd-rich-item-renderer[rendered-from-rich-grid] {
    --ytd-rich-grid-items-per-row: 6 !important;
  }
}
ytd-rich-item-renderer[is-in-first-column=""] {
  margin-left: calc(var(--ytd-rich-grid-item-margin) / 2) !important;
}

/* ---------- Immersive search (blur yok, sadece dim) ---------- */
#page-manager,
yt-searchbox {
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out !important;
}
#masthead yt-searchbox button[aria-label="Search"] {
  display: none !important;
}
.ytSearchboxComponentInputBox {
  border-radius: 2em !important;
}
html.rgtube-sf yt-searchbox {
  position: relative !important;
  left: 0vw !important;
  top: -30vh !important;
  height: 40px !important;
  max-width: 600px !important;
  transform: scale(1) !important;
}
html.rgtube-sf yt-searchbox .ytSearchboxComponentInputBox,
html.rgtube-sf yt-searchbox #i0 {
  background-color: #fff !important;
  box-shadow: black 0 0 20px !important;
}
html.rgtube-sf yt-searchbox #i0 {
  margin-top: 10px !important;
}
html[dark].rgtube-sf yt-searchbox .ytSearchboxComponentInputBox,
html[dark].rgtube-sf yt-searchbox #i0 {
  background-color: #000 !important;
}
@media only screen and (min-width: 1400px) {
  html.rgtube-sf yt-searchbox {
    height: 60px !important;
    max-width: 700px !important;
    transform: scale(1.1) !important;
  }
  html.rgtube-sf yt-searchbox #i0 {
    margin-top: 30px !important;
  }
}
html.rgtube-sf .ytd-masthead #center {
  height: 100vh !important;
  width: 100vw !important;
  left: 0 !important;
  top: 0 !important;
  position: fixed !important;
  justify-content: center !important;
}
html.rgtube-sf #page-manager {
  opacity: 0.35 !important;
}

/* ---------- Player kontrolleri ---------- */
.ytp-left-controls .ytp-play-button,
.ytp-left-controls .ytp-volume-area,
.ytp-left-controls .ytp-time-display.notranslate > span,
.ytp-left-controls .ytp-chapter-container > button,
.ytp-left-controls .ytp-prev-button,
.ytp-left-controls .ytp-next-button {
  background-color: #0003 !important;
}
.ytp-right-controls,
.ytp-time-wrapper {
  background-color: #0003 !important;
}
.ytp-popup {
  background-color: #000c !important;
}

/* ---------- Frosted glass kısaltma ---------- */
#frosted-glass {
  max-height: 44px !important;
  height: 44px !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* ---------- Azaltılmış hareket tercihi ---------- */
@media (prefers-reduced-motion: reduce) {
  #masthead-container,
  #columns #secondary,
  yt-searchbox,
  #rgtube-cleany-ctl,
  ytd-rich-grid-media ytd-menu-renderer #button,
  #inline-preview-player,
  #video-preview-container,
  ytd-rich-item-renderer {
    transition: none !important;
    animation: none !important;
  }
}
`;
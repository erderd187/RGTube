// Popup ve content script tarafından ortak kullanılan varsayılan ayarlar.
globalThis.RGTUBE_DEFAULTS = {
  enabled: true,

  zen: false,          // Zen Mod
  zenSplit: true,      // Zen Mod: izleme sayfasında video alanı ve öneri listesi ayrı kayar

  cleany: false,       // Cleany Menu Modu: ana sayfa videoları gizli, arama çubuğu ortada
  cleanySubs: false,   // "Only videos from subscribed channels." kutucuğu

  bgImage: '',         // data URL (popup'ta küçültülüp JPEG'e çevrilir)
  bgFit: 'cover',      // cover | contain | repeat | center
  bgDim: 35,           // 0-90, görsel üstündeki örtü yüzdesi
  bgBlur: 0,           // 0-40 px, görsel bulanıklığı

  bgColorOn: false,
  bgColor: '#0f0f0f',
  bgGradOn: false,     // arka plan renginde gradient (ikinci renk)
  bgColor2: '#3a1c71',
  bgGradAngle: 135,

  textColorOn: false,
  textColor: '#ffffff',

  gridCols: 0,         // ana sayfada yan yana video sayısı (0 = otomatik)
  sideLeft: false,     // izleme sayfasında öneri listesi solda
  barBottom: false     // üst menüyü (logo, arama, butonlar) ekranın altına al
};

// Önceki sürümlerden kalan, artık kullanılmayan ayarlar (popup açılınca temizlenir).
globalThis.RGTUBE_OBSOLETE_KEYS = [
  'cubeAuto', 'cubePreview', 'cubeFeed',
  'borderOn', 'borderR', 'borderG', 'borderB', 'borderGradOn', 'borderColor2', 'borderAngle',
  'borderWidth', 'borderRadius', 'bThumbs', 'bPlayer', 'bSearch', 'bChips', 'bComments', 'bFrame', 'frameWidth'
];

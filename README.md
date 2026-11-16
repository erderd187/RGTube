# RGTube

YouTube'u daha akıcı ve pratik hale getiren sade bir tarayıcı eklentisi.

**Sürüm:** 2.2.1 · **Manifest:** V3 · **Lisans:** MIT

## Özellikler

- **Zen Mod:** YouTube arayüzünü sadeleştirir. İzleme sayfasında video alanı ve öneri listesi ayrı kayabilir.
- **Cleany Menu Modu:** Ana sayfadaki videoları gizler, arama çubuğunu ortaya alır. İstersen sadece abone olunan kanalların videolarını gösterir.
- **Kanal Grupları:** Kanallarını emojili gruplara ayırıp kenar çubuğunda düzenli görürsün.
- **Yer İmleri:** Oynatıcıdaki 🔖 düğmesiyle videonun o anını kaydedersin.
- **Görünüm özelleştirme:** Arka plan görseli (bulanıklık ve karartma ayarlı), düz renk veya gradient arka plan, yazı rengi.
- **Sayfa düzeni:** Ana sayfada yan yana video sayısı, öneri listesini sola alma, üst menüyü ekranın altına taşıma.
- **Lens:** Bir görsel yüklersin, Groq'un çok modlu modeli görseli yorumlar ve YouTube arama önerileri sunar (isteğe bağlı, Groq API anahtarı gerekir).

## Kurulum

Eklenti henüz mağazada yayında değil, elle yüklenir:

1. Bu depoyu indir: **Code → Download ZIP** (veya [Releases](../../releases) sayfasından son sürümü al) ve klasöre çıkar.
2. Tarayıcında `chrome://extensions` adresini aç (Edge için `edge://extensions`).
3. Sağ üstten **Geliştirici modu**'nu aç.
4. **Paketlenmemiş öğe yükle**'ye tıkla ve `manifest.json` dosyasının bulunduğu klasörü seç.
5. Eklenti simgesine tıklayıp ayarları aç, YouTube'u yenile.

## Lens özelliği ve gizlilik

- Lens'i kullanmak için kendi **Groq API anahtarına** ihtiyacın var: [console.groq.com/keys](https://console.groq.com/keys)
- Anahtar yalnızca senin tarayıcında (`chrome.storage.local`) saklanır, kodda yer almaz.
- Lens'e yüklediğin görseller yorumlanmak üzere **Groq'a gönderilir**. Hassas görseller yüklemeden önce bunu aklında tut.
- Lens'i kullanmazsan Groq'a hiçbir veri gönderilmez.

## İzinler

| İzin | Neden |
| --- | --- |
| `storage`, `unlimitedStorage` | Ayarları, grupları, yer imlerini ve arka plan görselini saklamak |
| `https://www.youtube.com/*` | Eklentinin YouTube sayfalarında çalışması |

## Proje yapısı

```
manifest.json
content/   YouTube sayfasına uygulanan betikler (içerik, Lens, Zen CSS)
popup/     Ayar paneli (HTML, CSS, JS)
shared/    Ortak varsayılan ayarlar
icons/     Eklenti simgeleri
```

## Katkı

Hata bildirimi ve önerileriniz için [Issues](../../issues) bölümünü kullanabilirsiniz.

## Lisans

[MIT](LICENSE)

---

RGTube, YouTube veya Google ile bağlantılı değildir.
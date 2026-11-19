# Night Constellation — Windows Canlı Duvar Kağıdı, Ekran Koruyucu & Müzik Arayüzü

Windows'ta müzik çalarken (Spotify, YouTube Music, Apple Music, tarayıcı vb.) masaüstü arka planını veya ekran koruyucuyu basla şişip inen neon çerçeveli, yıldızlı ve takımyıldızı şarkı sözlü canlı bir sahneye dönüştürür.

## Özellikler

* **Üç Çalışma Modu:**
  * **Canlı Duvar Kağıdı (`wallpaper.bat` / `py main.py --wallpaper`):** Windows 10 ve Windows 11 (24H2+) masaüstü simgelerinin arkasına yerleşir.
  * **Masaüstü / Standby Modu (`run.bat` / `py main.py --desktop`):** Tam ekran etkileşimli müzik ekranı olarak açılır.
  * **Windows Ekran Koruyucu (`.scr`):** `/s`, `/c`, `/p` argümanlarını destekler.
* **Albüm Kapağından Otomatik Renk Teması:** Şarkı değiştikçe kapağın baskın rengi çıkarılır; kenar ışıkları, pençeler ve yıldız parıltıları o renge yumuşakça geçer.
* **Sistem Tepsisi (Tray) Menüsü:** Sağ alt sistem tepsisinden tek tıkla **Tema** (`Otomatik`, `Klasik Şampanya`, `Buz Mavisi`, `Kızıl Gece`), **Söz Senkronu (`-250 ms` / `+250 ms`)**, **Windows ile Başlat** ve **Çıkış** kontrolü.
* **Yıldız Alanı & Fare Paralaksı:** Arka planda titreşen yıldızlar, kayan yıldızlar ve fare hareketine duyarlı derinlik efekti.
* **Windows Medya (SMTC) + WASAPI Ses Analizi + LRCLIB:** Çalan şarkıyı, kapağını ve senkronize sözlerini otomatik çeker; otomatik kazançlı (AGC) bas algılayıcı ile her ses seviyesinde ritme tepki verir.

## Kurulum ve Çalıştırma

```cmd
py -m pip install -r requirements.txt
```

* **Canlı Duvar Kağıdı olarak başlat:** `wallpaper.bat` (veya `py main.py --wallpaper`)
* **Masaüstü Modunda başlat:** `run.bat` (veya `py main.py --desktop`)
* **Ekran Koruyucu (`.scr`) derle:** `build_screensaver.bat`

## Kısayollar (Masaüstü Modu)

* `T` — Tema değiştir (`adaptive` / `champagne` / `cyber_ice` / `crimson_night`)
* `[` / `]` — Şarkı sözü senkronunu `-250 ms` / `+250 ms` kaydır
* `D` — Demo modunu aç / kapat
* `Space` — Oynat / Duraklat
* `Sağ / Sol Ok` — Sonraki / Önceki şarkı
* `Esc` veya `Q` — Çıkış

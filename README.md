# Night Constellation — Windows Ekran Koruyucu ve Masaüstü Müzik Arayüzü

Windows'ta müzik çalarken (Spotify, YouTube Music, Apple Music, tarayıcı vb.) ekranı koyu, dumanlı ışık hüzmeleriyle kaplayan ve şarkı sözlerini **takımyıldızı (constellation) düğüm ağı** olarak canlı senkronize eden masaüstü ve ekran koruyucu (`.scr`) uygulaması.

## Özellikler

* **Windows Medya Entegrasyonu (SMTC):** Arka planda hangi uygulamadan müzik çalarsa çalsın şarkı adı, sanatçı, albüm kapağı ve anlık süre bilgisini otomatik alır.
* **Takımyıldızı Şarkı Sözü Motoru:** [LRCLIB](https://lrclib.net) üzerinden senkronize `.lrc` şarkı sözlerini otomatik çeker; her kelimeyi yıldız düğümleri ve ince bağlantı çizgileriyle ekrana çizer, aktif kelimenin üzerinde nişangah (reticle) gösterir.
* **Ses Duyarlı Görselleştirici:** Windows WASAPI Loopback ile sistem sesini gerçek zamanlı analiz eder; radyal spektrum halkasını, kenar ışık hüzmelerini ve üst ışık huzmelerini müziğin ritmine göre hareketlendirir.
* **Çift Çalışma Modu:**
  * **Masaüstü / Standby Modu (`python main.py`):** Tam ekran gece modu olarak çalışır, medya kartından oynat/duraklat ve şarkı geçişi yapılabilir.
  * **Windows Ekran Koruyucu Modu (`.scr`):** `/s`, `/c`, `/p` Windows ekran koruyucu argümanlarını destekler. Fare hareketinde veya tuş basımında kapanır.
* **Dahili Demo Modu:** Müzik çalmadan da görünümü test etmek için `D` tuşuna basabilir veya `frontend/index.html` dosyasını doğrudan tarayıcıda açabilirsiniz.

## Kurulum

### Hazır Windows uygulaması (CMD gerekmez)

1. GitHub'daki **Releases** bölümünden `NightConstellation.exe` dosyasını indirin.
2. İndirilen dosyaya çift tıklayarak uygulamayı açın. Python kurmanız veya CMD kullanmanız gerekmez.
3. Duvar kâğıdı için `NightConstellationWallpaper.exe` dosyasına çift tıklayın. Bu sürüm de Python veya CMD gerektirmez.

### Kaynak koddan çalıştırma

1. **Python 3.10+** kurulu olduğundan emin olun.
2. Bağımlılıkları yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
3. Uygulamayı Masaüstü Modunda başlatın:
   ```bash
   python main.py
   ```
   *(veya `run.bat` dosyasına çift tıklayın)*

## Windows Ekran Koruyucu (`.scr`) Olarak Derleme

1. `build_screensaver.bat` dosyasını çalıştırın. Bu işlem `dist\NightConstellation.scr` dosyasını oluşturur.
2. `NightConstellation.scr` dosyasına sağ tıklayıp **Yükle (Install)** diyebilir veya `install_screensaver.ps1` betiğini Yönetici olarak çalıştırabilirsiniz.

## Kısayollar (Masaüstü Modu)

* `D` — Demo modunu aç / kapat
* `F11` — Tam ekran / pencere geçişi
* `Space` — Oynat / Duraklat
* `Sağ / Sol Ok` — Sonraki / Önceki şarkı
* `Esc` veya `Q` — Çıkış

## Proje Yapısı

```text
night-constellation/
├── main.py                    # Uygulama giriş noktası (Masaüstü & .scr modları)
├── config.json                # Saat, tema, dil ve hassasiyet ayarları
├── requirements.txt           # Python bağımlılıkları
├── run.bat                    # Hızlı başlatma betiği
├── build_screensaver.bat      # PyInstaller ile .scr derleme betiği
├── install_screensaver.ps1    # Windows ekran koruyucu kurulum betiği
├── backend/
│   ├── media_smtc.py          # Windows SMTC medya okuyucu ve kontrolcü
│   ├── lyrics_client.py       # LRCLIB + yerel .lrc senkronize söz istemcisi
│   └── audio_reactive.py      # WASAPI Loopback FFT ses spektrum analizörü
└── frontend/
    ├── index.html             # Ana arayüz
    ├── styles.css             # Saat, medya kartı ve ışık efektleri
    ├── constellation.js       # Takımyıldızı şarkı sözü, duman ve ışık motoru
    └── app.js                 # Backend köprüsü ve demo simülatörü
```

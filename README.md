# Night Constellation — Windows Canlı Duvar Kağıdı, Ekran Koruyucu & Müzik Arayüzü

Windows 10/11 masaüstünü veya ekran koruyucusunu gerçek zamanlı ses analizine duyarlı, MacBook kilit ekranı tarzı kalın saatli, 3D perspektif kapaklı ve takımyıldızı şarkı sözlü canlı bir gece sahnesine dönüştüren açık kaynaklı proje.

## Öne Çıkan Özellikler

* **Üç Çalışma Modu:** Canlı Duvar Kağıdı (`NightConstellationWallpaper.exe` / `wallpaper.bat`), Masaüstü Modu (`NightConstellation.exe` / `run.bat`) ve Windows Ekran Koruyucu (`.scr`).
* **MacBook Tarzı Saat & Tipografi Seçici:** Kalın ve uzun MacBook kilit ekranı saati, Klasik Serif ve Dijital Neon yazı tipi seçenekleri + saate göre otomatik selamlama / kişisel motto.
* **Lüks Dinamik Medya Kapsülü & Plak Modu:** Cam efektli medya kartı, canlı mini ekolayzır çubukları, süre göstergesi, albüm kapağı ambient bulanık arka plan ve dönen plak (vinyl) animasyonu.
* **3D Perspektifli Önceki / Sonraki Kapak Akışı:** Yerel geçmişten gelen gerçek kapaklarla dolu, tıklanabilir 3D yan kapak kartları.
* **Görsel Efekt Motoru:** 3D Parçacık Galaksisi (Nebula), Manyetik Fare Fiziği, Aurora Kuzey Işıkları, Alt Cam Ekolayzır, Yıldız / Kar / Matrix modları, Beat Şok Dalgaları ve Gece Kehribar Göz Koruma Modu.
* **Akıllı Masaüstü Araçları:** Anlık Hava Durumu rozeti, Pomodoro Odak Sayacı (`P`), HUD Telemetri (BPM, CPU, RAM, Pil/Şarj, Osiloskop), Türkçe Söz Çevirisi ve Tam Ekran Oyun Algılama (**Auto-Eco**).
* **Sistem Tepsisi & Global Kısayol:** `Ctrl + Alt + N` ile herhangi bir uygulamadan efektleri duraklatma ve sağ alt tepsiden **Windows ile Başlat** kontrolü.

## Kurulum ve Kullanım

### Seçenek 1: Hazır Sürüm (`.exe` — Python Gerektirmez)
1. Sağ taraftaki **\[suspicious link removed\]** bölümünden `NightConstellation-win64.zip` dosyasını indirip klasöre çıkarın.
2. Canlı duvar kağıdı olarak başlatmak için **`NightConstellationWallpaper.exe`**, tam ekran masaüstü modu için **`NightConstellation.exe`** dosyasına çift tıklayın.

> **Windows Güvenlik Notu:**
> * **"Windows bilgisayarınızı korudu (SmartScreen)"** uyarısı çıkarsa **Ek bilgi → Yine de çalıştır** seçeneğine tıklayın.
> * Windows 11 **Akıllı Uygulama Denetimi (Smart App Control)** açık sistemlerde imzasız `.exe` engellenirse aşağıdaki **Seçenek 2 (`setup.bat`)** yöntemini kullanın.

### Seçenek 2: Kaynak Koddan Tek Tıkla Kurulum (Python 3.10+)
Repoyu indirdikten sonra **`setup.bat`** dosyasına çift tıklayın veya terminalden çalıştırın:

```cmd
py -m pip install -r requirements.txt
wallpaper.bat
```

## Kısayollar

* `S` — Canlı Ayarlar Panelini aç / kapat
* `T` — Tema değiştir (`adaptive` / `champagne` / `cyber_ice` / `crimson_night`)
* `P` — Pomodoro Odak Sayacını başlat / duraklat
* `H` / `N` — HUD Telemetri / 3D Galaksi aç-kapat
* `[` / `]` — Şarkı sözü senkronunu `-250 ms` / `+250 ms` kaydır
* `Ctrl + Alt + N` — Herhangi bir oyundan/uygulamadan efektleri duraklat / devam ettir

## Lisans

Bu proje [MIT Lisansı](https://www.google.com/search?q=LICENSE) altında yayınlanmıştır.

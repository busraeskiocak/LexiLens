# PRD: LexiLens – Kişiselleştirilmiş Okuma Asistanı

**Sürüm:** 1.0.0
**Durum:** Taslak / Planlama
**Hedef Kitle:** Disleksili lise ve üniversite öğrencileri, öğretmenler ve veliler.

## 1. Vizyon ve Amaç

LexiLens, disleksili bireylerin dijital dünyadaki okuma deneyimini "standart" olmaktan çıkarıp "kişisel" hale getirmeyi amaçlar. Her kullanıcının karıştığı harf grupları ve rahat ettiği görsel düzen farklıdır. LexiLens, bu farkı bir UPP (User Personal Profile) yani "Dijital Okuma Parmak İzi"ne dönüştürür.

## 2. Kullanıcı Akışı (User Journey)

1. **Hoş Geldin:** Uygulamanın ne işe yaradığını anlar.
2. **Kalibrasyon:** 2 dakikalık eğlenceli bir testle okuma tercihlerini belirler.
3. **Profil:** Test sonucunda oluşan dijital profilini görür.
4. **Okuma:** Kendi dökümanlarını yükleyerek "iyileştirilmiş" metni okur.
5. **Paylaşma:** Bu ayarları başkalarına gönderir.

## 3. Ekran Detayları ve Fonksiyonlar

### 🟢 E1: Karşılama Ekranı (Welcome Screen)
- Kısa, disleksi dostu bir animasyon.
- "Testi Başlat" butonu.
- Daha önce testi yaptıysa "Profilime Git" seçeneği.

### 🟡 E2: Kalibrasyon Testi Ekranı (Calibration Test)
- Kullanıcıya farklı fontlarda kısa metinler gösterilir.
- Hangi harfler karışıyor? (b-d, p-q, m-n vb.)
- Hangi arka plan renginde gözü daha az yoruluyor? (Krem, açık mavi, gri vb.)
- Harf ve satır arası boşluk tercihi.

### 🔵 E3: Profil Özeti Ekranı (Profile Summary)
- Görsel Kart: "Senin en rahat okuma fontun: OpenDyslexic".
- UPP JSON arka planda oluşturulur.
- Veriler tarayıcının hafızasına (localStorage) otomatik yazılır.

### 🟣 E4: Okuma Modu Ekranı (Reader Mode)
- Metin kutusu (Yapıştır) veya Dosya Yükleme (PDF/DOCX).
- Yüklenen metin kullanıcının profiline göre anında dönüştürülür.
- Örnek: "b" harfleri mavi, "d" harfleri kırmızı gösterilir.

### 🔴 E5: Paylaşım Ekranı (Sharing)
- Profil verilerini içeren benzersiz URL veya QR Kod oluşturma.
- Öğrenci QR kodu öğretmenine okutur, metinler otomatik öğrencinin ihtiyacına göre şekillenir.

## 4. Teknik Altyapı

| Katman | Teknoloji | Neden? |
|---|---|---|
| Frontend | React.js | Hızlı ve modern |
| Tasarım | Tailwind CSS | Renk ve boşluk ayarı kolay |
| Depolama | localStorage | Giriş yapmadan ayarlar kalır |
| Dosya İşleme | react-pdf / mammoth.js | PDF ve Word okuma |
| Paylaşım | qrcode.react | QR kod üretimi |

### UPP JSON Örneği
```json
{
  "fontSize": "18px",
  "fontFamily": "OpenDyslexic",
  "backgroundColor": "#F5F5DC",
  "letterSpacing": "2px",
  "confusedLetters": ["b", "d"],
  "highlightColor": "rgba(255, 255, 0, 0.3)"
}
```

## 5. Başarı Kriterleri (MVP)

- Testin 2 dakikadan kısa sürede tamamlanması.
- PDF yüklendiğinde formatın bozulmadan fontun değişmesi.
- Sayfa yenilendiğinde profil ayarlarının kaybolmaması.

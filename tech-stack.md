# LexiLens — Teknoloji Seçimi (tech-stack.md)

## Kullanılan Teknolojiler

| Katman | Teknoloji | Neden Seçildi? |
|---|---|---|
| Frontend | React.js | Hızlı, component bazlı yapı |
| Tasarım | Tailwind CSS | Kolay renk ve boşluk yönetimi |
| Depolama | localStorage | Giriş yapmadan profil saklanır |
| Font | OpenDyslexic | Disleksi dostu özel font |
| PDF Okuma | react-pdf | PDF dosyalarını tarayıcıda okur |
| DOCX Okuma | mammoth.js | Word dosyalarını HTML'e çevirir |
| QR Kod | qrcode.react | Profil paylaşımı için QR üretir |

## Neden Bu Stack?

### React.js
Uygulamanın 5 farklı ekranı var ve ekranlar arası veri taşımak gerekiyor.
React bu iş için ideal — component yapısı sayesinde her ekran ayrı ayrı geliştirilebilir.

### Tailwind CSS
Disleksi dostu tasarım için renk, boşluk ve font ayarları çok kritik.
Tailwind ile bu ayarları hızlıca yapmak mümkün.

### localStorage
Kullanıcı hesap açmak zorunda kalmasın. Profil direkt tarayıcıda saklanır.
Sayfa yenilenince bile ayarlar kaybolmaz.

### mammoth.js + react-pdf
Kullanıcı hem PDF hem DOCX yükleyebilmeli.
Bu iki kütüphane ücretsiz ve kurulumu kolay.

## Kurulum Komutları
```bash
npx create-react-app lexilens
cd lexilens
npm install tailwindcss
npm install react-pdf
npm install mammoth
npm install qrcode.react
```

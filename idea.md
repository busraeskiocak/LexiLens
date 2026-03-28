# LexiLens — Kişisel Okuma Profili Asistanı

**Vizyon:** Disleksi spektrumundaki her öğrenci için "tek tip" çözümleri bir kenara bırakıp, yapay zeka ile kişiselleştirilmiş bir okuma deneyimi inşa etmek.

## 1. Problem Tanımı

Mevcut disleksi destek araçları (Nessy, OpenDyslexic vb.) "one-size-fits-all" yaklaşımını benimsemektedir. Ancak disleksi kişiye özeldir; bir öğrenci "b" ve "d" harflerini karıştırırken, bir diğeri düşük kontrastlı zeminlerde satır takibi yapmakta zorlanabilir. Mevcut araçların esneklikten yoksun olması, lise ve üniversite düzeyindeki ağır akademik içeriklerin takibini imkansız hale getirmektedir.

## 2. Hedef Kitle

- **Birincil Kullanıcı:** Disleksi tanısı konmuş veya okuma güçlüğü çeken lise öğrencileri.
- **İkincil Kullanıcı:** Akademik makale ve yoğun PDF okuması yapmak zorunda olan üniversite öğrencileri.
- **Paydaşlar:** Özel eğitim öğretmenleri ve veliler.

## 3. Çözüm: LexiLens (AI-Powered Personalization)

LexiLens, statik bir font değiştiriciden ziyade, kullanıcının bilişsel ihtiyaçlarını analiz eden bir Kişisel Okuma Profili (UPP) asistanıdır.

### 🤖 Yapay Zekanın Rolü

AI, kalibrasyon aşamasında kullanıcının etkileşimlerini analiz eder ve:
1. Hangi harflerin (örn: p-q, b-d) görsel olarak ayrıştırılması gerektiğini belirler.
2. Kullanıcının nöro-çeşitliliğine en uygun renk paletini ve satır aralığını saptar.
3. Dinamik bir User Personal Profile (UPP) oluşturur.

## 4. Temel Özellikler (MVP)

| Özellik | Açıklama |
|---|---|
| Kalibrasyon Testi | Harf karışıklığı, font tercihi ve renk kontrastı tespiti yapan 2 dakikalık interaktif test. |
| UPP Motoru | Test sonuçlarını kalıcı bir dijital profile dönüştürür ve localStorage'a kaydeder. |
| Akıllı Okuma Modu | PDF, DOCX yükleme veya metin yapıştırma desteği. UPP'ye göre anlık görsel manipülasyon. |
| Görsel Düzenleme | OpenDyslexic desteği, harf/satır aralığı optimizasyonu ve odak modu (satır vurgulama). |
| Sosyal Entegrasyon | Oluşturulan profilin (UPP) öğretmen veya veli ile QR kod/link üzerinden paylaşılması. |

## 5. Rekabet Analizi & Farklılaşma

- **Nessy:** Eğitim odaklı ama çocuklara yönelik.
- **OpenDyslexic:** Sadece bir font.
- **Lexie:** Genel araçlar sunar.
- **LexiLens Farkı:** Diğer araçlar "ayarları kendin yap" derken, LexiLens AI ile "senin için en iyisini ben buldum" der.

## 6. Başarı Kriterleri

- **Time-to-Value:** Uygulamayı açıp kişisel okuma moduna geçme süresi < 5 dakika.
- **Okuma Verimliliği:** Standart metin ile LexiLens modundaki okuma hızı ve anlama skorunda %20+ artış.
- **Retention:** Haftalık aktif kullanıcı (WAU) oranı.

## 7. Yol Haritası

- **Faz 1 (MVP):** Kalibrasyon testi ve PDF okuyucu.
- **Faz 2:** Browser extension (web üzerindeki her metni UPP'ye göre dönüştürme).
- **Faz 3:** Text-to-Speech entegrasyonu ve göz takip ile dinamik odaklanma.

# MVP Yol Haritası

## Felsefe
Her faz tek başına değer üretiyor. Bir sonraki fazı başlatmak için öncekini
bitirmeye gerek yok ama öncekinin stabil olması şart.

---

## FAZ 1 — Kognitif Çekirdek (6-8 hafta)
**Hedef:** Kullanıcı açsın, test yapsın, ELO'su güncellensin, yarın daha uygun
bir oyun gelsin. Bu döngü çalışıyorsa Faz 1 bitti.

**Yapılacaklar:**
- [ ] Kullanıcı auth (JWT + refresh token)
- [ ] Onboarding anketi (mod seçimi, risk faktörleri, baseline test)
- [ ] `cognitive_ratings` ve `cognitive_sessions` tabloları
- [ ] 3 domain, toplam 8 oyun (working_memory, attention, processing_speed)
- [ ] ELO algoritması implementasyonu
- [ ] Günlük program ekranı (hangi domain'i oynayacak, sırasıyla)
- [ ] Basit dashboard (ELO grafiği, streak sayacı)

**Teknik notlar:**
- Oyunlar React Native Reanimated 3 ile yapılıyor (tepki süresi ölçümü hassas olsun)
- Response time ölçümü: `Date.now()` değil `performance.now()` kullan
- ELO hesabı backend'de, client sadece raw trial verisi gönderiyor

---

## FAZ 2 — Sağlık Entegrasyonu (4-5 hafta)
**Hedef:** Apple Health / Google Fit bağlanıyor, uyku ve egzersiz verileri
çekiliyor, Brain Health Index hesaplanıyor.

**Yapılacaklar:**
- [ ] Apple HealthKit entegrasyonu (react-native-health)
- [ ] Google Fit API entegrasyonu
- [ ] `health_metrics` ingestion pipeline
- [ ] Uyku skoru ve egzersiz skoru fonksiyonları
- [ ] BHI nightly worker (BullMQ)
- [ ] Dashboard'a BHI widget ekleme

**Teknik notlar:**
- HealthKit izinleri granular — sadece gerekli metric type'ları iste
- Background fetch: iOS'ta HealthKit observer query ile passive sync

---

## FAZ 3 — MIND Diyet Takipçisi (3-4 hafta)
**Hedef:** Kullanıcı o gün ne yediğini 30 saniyede loglayabiliyor.
MIND skoru hesaplanıyor, haftalık özet var.

**Yapılacaklar:**
- [ ] `diet_logs` ve `diet_daily_scores` tabloları
- [ ] Hızlı checkbox UI (10 pozitif kategori, 5 negatif)
- [ ] MIND diyet skoru hesabı (0-15 → normalize)
- [ ] Haftalık diyet raporu ekranı
- [ ] MIND diyeti rehber içeriği (beyin dostu tarifler, PubMed referanslı)

---

## FAZ 4 — Sesli Günlük & Fluency Score (5-6 hafta)
**Hedef:** Kullanıcı günde 2-3 dakika konuşuyor, Zihinsel Akıcılık Skoru
hesaplanıyor, trendi görebiliyor.

**Yapılacaklar:**
- [ ] Expo Audio ile ses kayıt UI
- [ ] S3 geçici upload (işlem sonrası silinecek)
- [ ] Whisper API transkript pipeline
- [ ] Feature extraction (pause, rate, vocabulary richness)
- [ ] Claude API coherence analizi
- [ ] `voice_sessions` ve `fluency_score_history` tabloları
- [ ] Fluency score trend grafiği
- [ ] Yasal disclaimer implementasyonu (onboarding + her session altında)

**Teknik notlar:**
- Ham ses S3'te max 1 saat, sonra otomatik silinecek (S3 lifecycle policy)
- Transcript hash'i sakla, metnin kendisini değil
- NLP worker BullMQ'da ayrı queue (ses işleme zaman alıyor, non-blocking olmalı)

---

## FAZ 5 — Caregiver Sistemi (4-5 hafta)
**Hedef:** Hasta profili bakıcıya paylaşılıyor, günlük rapor geliyor,
kritik düşüşte anlık bildirim var.

**Yapılacaklar:**
- [ ] `caregiver_relationships` invite sistemi (link veya QR kod)
- [ ] İzin yönetimi (granular permissions JSONB)
- [ ] Caregiver dashboard (hasta günlük özeti)
- [ ] Alert Worker implementasyonu (daily cron)
- [ ] Firebase FCM push notification entegrasyonu
- [ ] WebSocket real-time sync (opsiyonel, sonraki versiyona ertelenebilir)

---

## FAZ 6 — Sosyal & Gamification (3-4 hafta)
**Hedef:** Kullanıcılar birbirleriyle yarışabiliyor, topluluk meydan okumaları var.

**Yapılacaklar:**
- [ ] Arkadaş ekleme (discovery veya link ile)
- [ ] Haftalık domain leaderboard (Redis sorted set)
- [ ] Topluluk challenge'ları ("Bu hafta 5 gün egzersiz" gibi)
- [ ] Streak ve badge sistemi
- [ ] Multiplayer kelime oyunları (async, turn-based)

---

## Öncelik Tablosu

| Özellik | Faz | Kullanıcı Değeri | Teknik Zorluk |
|---|---|---|---|
| Adaptif kognitif oyunlar | 1 | Yüksek | Orta |
| ELO sistemi | 1 | Yüksek | Düşük |
| Apple Health senkronizasyonu | 2 | Yüksek | Orta |
| Brain Health Index | 2 | Yüksek | Düşük |
| MIND diyeti takibi | 3 | Orta | Düşük |
| Sesli günlük / Fluency Score | 4 | Yüksek | Yüksek |
| Caregiver paneli | 5 | Yüksek (patient mode) | Orta |
| Sosyal özellikler | 6 | Orta | Orta |

---

## Açık Kalan Kararlar (Başlamadan Önce Netleştirilecek)

1. **Backend hosting:** Railway (daha kolay) vs AWS ECS (daha ölçeklenebilir)
2. **Ses analizi maliyeti:** Whisper + Claude API maliyeti kullanıcı başına hesaplanacak → premium feature mi, herkese açık mı?
3. **Monetization modeli:** Freemium (Faz 1-2 ücretsiz, Faz 4-5 premium) önerisi
4. **İlk hedef platform:** iOS first (HealthKit daha olgun) → Android ikinci

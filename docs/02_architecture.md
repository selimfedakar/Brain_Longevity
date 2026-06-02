# Sistem Mimarisi

## Tech Stack

### Mobile (Client)
- **React Native + Expo** — cross-platform, iOS + Android
- **Expo Audio** — sesli günlük kayıt
- **React Native Health** — Apple HealthKit bridge
- **Google Fit SDK** — Android sağlık verisi
- **Reanimated 3** — kognitif oyunlar için akıcı animasyon
- **Zustand** — global state management
- **React Query (TanStack)** — server state, caching, background sync

### Backend
- **Node.js + Fastify** — REST API (Fastify, Express'ten ~2x daha hızlı)
- **PostgreSQL** — ana veri tabanı (relational data + JSONB)
- **Redis** — session cache, leaderboard, real-time skorlar
- **BullMQ** — async job queue (NLP analizi, badge hesaplamaları, caregiver alert'leri)
- **WebSockets (Socket.io)** — caregiver real-time sync

### AI / NLP (Fluency Score Engine)
- **Whisper API (OpenAI)** — ses → transkript
- **Claude API (Anthropic)** — transkript analizi, coherence skoru, kelime çeşitliliği
- **Custom feature extraction** — pause detection, speech rate hesabı (server-side)

### Infrastructure
- **AWS ECS (Fargate)** veya **Railway** — container deployment
- **AWS S3** — geçici ses dosyası buffer (işlendikten sonra silinir)
- **Firebase Cloud Messaging** — push notification (caregiver alert'leri)
- **Supabase** veya **AWS RDS** — managed PostgreSQL

## Servis Mimarisi

```
Mobile App
    │
    ├── REST API (Fastify)
    │       ├── /auth          — JWT + refresh token
    │       ├── /cognitive     — oyun session'ları, ELO güncellemeleri
    │       ├── /health        — Apple Health / Google Fit veri ingestion
    │       ├── /diet          — MIND diyet logları
    │       ├── /voice         — ses upload, fluency score
    │       ├── /caregiver     — ilişki yönetimi, izin kontrolü
    │       └── /dashboard     — composite Brain Health Index
    │
    ├── WebSocket Server
    │       └── caregiver real-time sync
    │
    └── BullMQ Workers
            ├── NLP Worker     — ses analizi (Whisper + Claude)
            ├── Alert Worker   — caregiver koşul kontrolü (daily cron)
            └── Index Worker   — Brain Health Index hesabı (nightly)
```

## Onboarding Flow

```
Başlangıç Ekranı
    ├── [Biohacker Modu]
    │       → Hızlı kognitif baseline testi (5 dk)
    │       → Risk faktörleri anketi
    │       → Apple Health izin isteği
    │       → İlk program oluşturma
    │
    └── [Longevity / Destek Modu]
            → Yaşlı dostu sade form
            → Aile/bakıcı bağlama
            → İlaç hatırlatıcı kurulumu
            → Sessiz, sakin onboarding
```

## Caregiver Sync Mimarisi

```
Patient App ──── API ──── PostgreSQL
                              │
                          BullMQ Alert Worker (daily cron)
                              │
                    Koşul kontrolü:
                    - 3 gün ardışık session yok → alert
                    - Uyku skoru < 40 → alert  
                    - 7 günlük fluency trendi -10 → HIGH alert
                              │
                    Firebase FCM ──── Caregiver App
                                          │
                                    Real-time dashboard
                                    (WebSocket)
```

-- ============================================================
-- BrainLongevity — PostgreSQL Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- KULLANICI & PROFİL
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  mode          VARCHAR(20) CHECK (mode IN ('biohacker', 'patient')) NOT NULL,
  timezone      VARCHAR(50) DEFAULT 'UTC',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_active   TIMESTAMPTZ DEFAULT NOW()
);

-- Risk faktörleri ve baseline — onboarding anketinden doldurulur
CREATE TABLE user_profiles (
  user_id                   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age                       SMALLINT,
  sex                       VARCHAR(10) CHECK (sex IN ('male', 'female', 'other')),
  cardiovascular_risk       SMALLINT CHECK (cardiovascular_risk BETWEEN 1 AND 5),
  has_hearing_loss          BOOLEAN DEFAULT FALSE,
  has_diabetes              BOOLEAN DEFAULT FALSE,
  has_hypertension          BOOLEAN DEFAULT FALSE,
  social_isolation_score    SMALLINT CHECK (social_isolation_score BETWEEN 1 AND 10),
  education_years           SMALLINT,
  baseline_cognitive_score  DECIMAL(5,2), -- onboarding testi sonucu
  disclaimer_accepted_at    TIMESTAMPTZ,  -- yasal feragatname timestamp'i
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KOGNİTİF ANTRENMAN
-- ============================================================

-- Her domain için ELO rating
CREATE TABLE cognitive_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain      VARCHAR(40) CHECK (domain IN (
                'attention', 'working_memory', 'multitasking',
                'spatial', 'processing_speed', 'executive_function'
              )),
  elo_rating  INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Bireysel oyun session'ları
CREATE TABLE cognitive_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type           VARCHAR(50) NOT NULL, -- 'n_back_2', 'stroop_classic', 'flanker', 'dual_task', 'spatial_rotation'
  domain              VARCHAR(40) NOT NULL,
  difficulty_rating   INTEGER NOT NULL,     -- bu session'ın ELO zorluğu
  total_trials        SMALLINT NOT NULL,
  correct_trials      SMALLINT NOT NULL,
  accuracy            DECIMAL(5,2) GENERATED ALWAYS AS (correct_trials::DECIMAL / total_trials * 100) STORED,
  avg_response_ms     INTEGER,              -- ortalama tepki süresi
  elo_before          INTEGER,
  elo_after           INTEGER,
  elo_delta           SMALLINT,             -- bu session sonrası değişim
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Günlük kognitif özet (nightly worker tarafından hesaplanır)
CREATE TABLE cognitive_daily_summary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  overall_score       DECIMAL(5,2),
  sessions_completed  SMALLINT DEFAULT 0,
  best_domain         VARCHAR(40),
  worst_domain        VARCHAR(40),
  UNIQUE(user_id, date)
);

-- ============================================================
-- SAĞLIK METRİKLERİ (Apple Health / Google Fit)
-- ============================================================

CREATE TABLE health_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type  VARCHAR(50) CHECK (metric_type IN (
                 'steps', 'active_minutes_moderate', 'active_minutes_vigorous',
                 'deep_sleep_min', 'rem_sleep_min', 'total_sleep_min', 'sleep_efficiency',
                 'hrv_ms', 'resting_heart_rate', 'vo2_max',
                 'systolic_bp', 'diastolic_bp', 'weight_kg'
               )) NOT NULL,
  value        DECIMAL(10,3) NOT NULL,
  source       VARCHAR(30) CHECK (source IN ('apple_health', 'google_fit', 'manual')) DEFAULT 'manual',
  recorded_at  TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, metric_type, recorded_at)
);

-- ============================================================
-- MIND DİYETİ TAKIBI
-- ============================================================

-- MIND diyeti 10 beyin dostu + 5 kaçınılması gereken grup içerir
CREATE TABLE diet_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  food_category  VARCHAR(50) CHECK (food_category IN (
                   -- Pozitif (beyin dostu)
                   'leafy_greens', 'other_vegetables', 'nuts', 'berries',
                   'beans', 'whole_grains', 'fish', 'poultry', 'olive_oil', 'wine',
                   -- Negatif (kaçınılacak)
                   'red_meat', 'butter_margarine', 'cheese', 'pastries_sweets', 'fried_fast_food'
                 )) NOT NULL,
  servings       DECIMAL(3,1) NOT NULL,
  is_negative    BOOLEAN DEFAULT FALSE,
  logged_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Günlük MIND skoru (0-15 arası, her pozitif kategori max 1 puan)
CREATE TABLE diet_daily_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  mind_score  DECIMAL(4,2),  -- 0-15 arası MIND diet skoru
  UNIQUE(user_id, date)
);

-- ============================================================
-- SESLİ GÜNLÜK & ZİHİNSEL AKICILIK SKORU
-- ============================================================

CREATE TABLE voice_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_type             VARCHAR(50) CHECK (prompt_type IN (
                            'image_narration', 'story_recall', 'free_journal', 'word_association'
                          )) NOT NULL,
  duration_seconds        SMALLINT,
  word_count              SMALLINT,
  unique_word_count       SMALLINT,
  unique_word_ratio       DECIMAL(4,3),   -- vocabulary richness: unique/total
  avg_pause_ms            INTEGER,        -- ortalama duraksama süresi
  speech_rate_wpm         DECIMAL(5,1),   -- kelime/dakika
  grammar_complexity      DECIMAL(4,2),   -- NLP'den gelen karmaşıklık skoru (0-100)
  coherence_score         DECIMAL(4,2),   -- LLM'den gelen tutarlılık skoru (0-100)
  fluency_score           DECIMAL(5,2),   -- composite skor (0-100)
  transcript_hash         VARCHAR(64),    -- ham transkript saklamıyoruz, sadece hash
  nlp_features            JSONB,          -- raw feature vektörü (ihtiyaç duyulursa)
  recorded_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Trend takibi için tarihsel skor
CREATE TABLE fluency_score_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  score       DECIMAL(5,2),
  trend_7d    DECIMAL(5,2),   -- 7 günlük rolling trend (negatif = gerileme)
  trend_30d   DECIMAL(5,2),
  UNIQUE(user_id, date)
);

-- ============================================================
-- KOMPOZİT BEYİN SAĞLIĞI ENDEKSİ
-- ============================================================

-- Ağırlıklar: Kognitif %30, Uyku %25, Egzersiz %20, Diyet %15, Akıcılık %10
CREATE TABLE brain_health_index (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  cognitive_score  DECIMAL(5,2) DEFAULT 0,
  sleep_score      DECIMAL(5,2) DEFAULT 0,
  exercise_score   DECIMAL(5,2) DEFAULT 0,
  diet_score       DECIMAL(5,2) DEFAULT 0,
  fluency_score    DECIMAL(5,2) DEFAULT 0,
  composite_index  DECIMAL(5,2),
  UNIQUE(user_id, date)
);

-- ============================================================
-- CAREGIVER (BAKIM VERENİ) SİSTEMİ
-- ============================================================

CREATE TABLE caregiver_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship      VARCHAR(30) CHECK (relationship IN ('spouse', 'child', 'sibling', 'professional', 'friend')),
  permissions       JSONB DEFAULT '{
                      "view_cognitive": true,
                      "view_health": true,
                      "view_diet": true,
                      "view_fluency": true,
                      "receive_alerts": true
                    }',
  status            VARCHAR(20) CHECK (status IN ('pending', 'active', 'revoked')) DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_user_id, caregiver_user_id)
);

CREATE TABLE caregiver_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id   UUID NOT NULL REFERENCES users(id),
  caregiver_user_id UUID NOT NULL REFERENCES users(id),
  alert_type        VARCHAR(60) CHECK (alert_type IN (
                      'missed_cognitive_session', 'poor_sleep', 'low_activity',
                      'cognitive_decline_trend', 'fluency_decline_trend',
                      'missed_medication', 'geofence_alert'
                    )) NOT NULL,
  severity          VARCHAR(10) CHECK (severity IN ('low', 'medium', 'high')) NOT NULL,
  payload           JSONB,         -- alert'e özgü ek veri
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  read_at           TIMESTAMPTZ
);

-- Davet kodu tablosu (24 saat geçerli)
CREATE TABLE caregiver_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code          CHAR(6) UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- İNDEKSLER
-- ============================================================

CREATE INDEX idx_cognitive_sessions_user_date    ON cognitive_sessions(user_id, created_at DESC);
CREATE INDEX idx_cognitive_sessions_domain       ON cognitive_sessions(user_id, domain, created_at DESC);
CREATE INDEX idx_health_metrics_user_type_date   ON health_metrics(user_id, metric_type, recorded_at DESC);
CREATE INDEX idx_diet_logs_user_date             ON diet_logs(user_id, date DESC);
CREATE INDEX idx_voice_sessions_user_date        ON voice_sessions(user_id, recorded_at DESC);
CREATE INDEX idx_fluency_history_user_date       ON fluency_score_history(user_id, date DESC);
CREATE INDEX idx_brain_health_user_date          ON brain_health_index(user_id, date DESC);
CREATE INDEX idx_caregiver_alerts_patient        ON caregiver_alerts(patient_user_id, sent_at DESC);
CREATE INDEX idx_caregiver_alerts_caregiver      ON caregiver_alerts(caregiver_user_id, read_at);

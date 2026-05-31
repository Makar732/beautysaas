-- Расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица мастеров
CREATE TABLE IF NOT EXISTS masters (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id   VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255) UNIQUE NOT NULL,
    slug        VARCHAR(100) UNIQUE,
    tg_chat_id  VARCHAR(100),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_masters_google_id ON masters(google_id);
CREATE INDEX IF NOT EXISTS idx_masters_slug ON masters(slug);

-- Таблица услуг
CREATE TABLE IF NOT EXISTS services (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id   UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    price       INTEGER NOT NULL DEFAULT 0,
    duration    INTEGER NOT NULL DEFAULT 60
);

CREATE INDEX IF NOT EXISTS idx_services_master_id ON services(master_id);

-- Таблица записей
CREATE TABLE IF NOT EXISTS appointments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id     UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    service_id    UUID REFERENCES services(id) ON DELETE SET NULL,
    client_name   VARCHAR(255) NOT NULL,
    client_phone  VARCHAR(20) NOT NULL,
    date_time     TIMESTAMP WITH TIME ZONE NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_master_id ON appointments(master_id);

-- Таблица сессий (для хранения входа пользователя)
CREATE TABLE IF NOT EXISTS "session" (
    "sid"    VARCHAR NOT NULL COLLATE "default",
    "sess"   JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL
) WITH (OIDS = FALSE);

ALTER TABLE "session" 
    ADD CONSTRAINT "session_pkey" 
    PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
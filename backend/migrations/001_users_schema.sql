-- ============================================================
-- Schéma : utilisateurs et authentification (JWT)
-- À intégrer au même Postgres que les métadonnées des observations/photos
-- ============================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- email insensible à la casse

-- ----------------------------
-- Table : users
-- ----------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,          -- bcrypt ($2b$...) ou argon2id ($argon2id$...) : l'algo est encodé dans le hash lui-même
    display_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garde updated_at à jour automatiquement
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------
-- Table : refresh_tokens
-- Permet la révocation (logout, changement de mdp, compte compromis)
-- Le JWT d'accès (courte durée, ex. 15 min) reste stateless et n'est PAS stocké ici.
-- ----------------------------
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,            -- ne jamais stocker le refresh token en clair, hasher (sha256 suffit ici)
    device_info TEXT,                     -- optionnel : utile avec Capacitor pour lister/révoquer par appareil
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ----------------------------
-- Exemple d'intégration avec les autres tables du projet
-- (à créer dans une migration séparée, montré ici juste pour référence)
-- ----------------------------
-- CREATE TABLE observations (
--     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     photo_path  TEXT NOT NULL,          -- référence vers le fichier (filesystem / object storage), pas le fichier lui-même
--     latitude    DOUBLE PRECISION NOT NULL,
--     longitude   DOUBLE PRECISION NOT NULL,
--     category    TEXT,
--     title       TEXT,
--     description TEXT,
--     group_id    UUID REFERENCES groups(id),  -- NULL = observation personnelle
--     created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
-- );

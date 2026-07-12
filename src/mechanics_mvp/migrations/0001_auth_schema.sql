CREATE TABLE IF NOT EXISTS roles (
    name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1))
);

INSERT INTO roles (name, description, is_admin) VALUES
    ('free', '基础用户', 0),
    ('plus', 'Plus 用户', 0),
    ('pro', 'Pro 用户', 0),
    ('internal_tester', '内部测试用户', 0),
    ('admin', '系统管理员', 1)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS entitlements (
    name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO subscription_plans (name, display_name, is_active, created_at, updated_at)
VALUES ('free', 'Free', 1, '2026-07-12T00:00:00Z', '2026-07-12T00:00:00Z')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_path TEXT,
    role TEXT NOT NULL DEFAULT 'free',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    FOREIGN KEY (role) REFERENCES roles(name)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    csrf_token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_entitlements (
    user_id TEXT NOT NULL,
    entitlement TEXT NOT NULL,
    source TEXT NOT NULL,
    granted_at TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    PRIMARY KEY (user_id, entitlement, source),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (entitlement) REFERENCES entitlements(name) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    subject_hash TEXT NOT NULL,
    address_hash TEXT NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0, 1)),
    attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_subject
    ON login_attempts(kind, subject_hash, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_address
    ON login_attempts(kind, address_hash, attempted_at);

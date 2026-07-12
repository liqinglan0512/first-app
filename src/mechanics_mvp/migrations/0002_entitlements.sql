ALTER TABLE subscription_plans ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE subscription_plans ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1));

INSERT INTO subscription_plans (
    name, display_name, is_active, created_at, updated_at, description, sort_order, is_public
) VALUES
    ('plus', 'Plus', 1, '2026-07-12T00:00:00Z', '2026-07-12T00:00:00Z', '高级导出规划权益；购买暂未开放。', 20, 1),
    ('pro', 'Pro', 1, '2026-07-12T00:00:00Z', '2026-07-12T00:00:00Z', '正式报告与高级导出规划权益；购买暂未开放。', 30, 1)
ON CONFLICT (name) DO NOTHING;

UPDATE subscription_plans
SET description = '基础静力学、动力学和基础报告。', sort_order = 10, is_public = 1
WHERE name = 'free';

INSERT INTO entitlements (name, description, created_at) VALUES
    ('solve.static', '静力学基础求解', '2026-07-12T00:00:00Z'),
    ('solve.dynamics', '动力学基础求解', '2026-07-12T00:00:00Z'),
    ('report.basic', '基础计算报告', '2026-07-12T00:00:00Z'),
    ('export.advanced', '高级导出', '2026-07-12T00:00:00Z'),
    ('report.formal', '正式计算报告', '2026-07-12T00:00:00Z'),
    ('pinn.waitlist', 'PINN 等待名单', '2026-07-12T00:00:00Z'),
    ('preview.internal', '内部预览功能', '2026-07-12T00:00:00Z'),
    ('admin.entitlements', '权益管理', '2026-07-12T00:00:00Z')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_entitlements (
    role TEXT NOT NULL,
    entitlement TEXT NOT NULL,
    PRIMARY KEY (role, entitlement),
    FOREIGN KEY (role) REFERENCES roles(name) ON DELETE CASCADE,
    FOREIGN KEY (entitlement) REFERENCES entitlements(name) ON DELETE CASCADE
);

INSERT INTO role_entitlements (role, entitlement) VALUES
    ('free', 'solve.static'),
    ('free', 'solve.dynamics'),
    ('free', 'report.basic'),
    ('free', 'pinn.waitlist'),
    ('plus', 'solve.static'),
    ('plus', 'solve.dynamics'),
    ('plus', 'report.basic'),
    ('plus', 'export.advanced'),
    ('plus', 'pinn.waitlist'),
    ('pro', 'solve.static'),
    ('pro', 'solve.dynamics'),
    ('pro', 'report.basic'),
    ('pro', 'export.advanced'),
    ('pro', 'report.formal'),
    ('pro', 'pinn.waitlist'),
    ('internal_tester', 'solve.static'),
    ('internal_tester', 'solve.dynamics'),
    ('internal_tester', 'report.basic'),
    ('internal_tester', 'export.advanced'),
    ('internal_tester', 'report.formal'),
    ('internal_tester', 'pinn.waitlist'),
    ('internal_tester', 'preview.internal'),
    ('admin', 'solve.static'),
    ('admin', 'solve.dynamics'),
    ('admin', 'report.basic'),
    ('admin', 'export.advanced'),
    ('admin', 'report.formal'),
    ('admin', 'pinn.waitlist'),
    ('admin', 'preview.internal'),
    ('admin', 'admin.entitlements')
ON CONFLICT (role, entitlement) DO NOTHING;

CREATE TABLE IF NOT EXISTS internal_access_grants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    code_fingerprint TEXT NOT NULL,
    previous_role TEXT NOT NULL,
    granted_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_used_at TEXT,
    revoked_at TEXT,
    revoked_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_role) REFERENCES roles(name),
    FOREIGN KEY (revoked_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_internal_access_expiry
    ON internal_access_grants(expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS pinn_waitlist (
    user_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'waiting',
    joined_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.auth import AuthConfig, AuthService
from mechanics_mvp.database import Database
from mechanics_mvp.entitlements import (
    EntitlementConfig,
    EntitlementRequiredError,
    EntitlementService,
    InternalAccessInvalidError,
    InternalAccessRateLimitError,
)


class MutableClock:
    def __init__(self) -> None:
        self.value = datetime(2026, 7, 12, 4, 0, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        return self.value

    def advance(self, delta: timedelta) -> None:
        self.value += delta


class EntitlementServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.database = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
        self.database.migrate()
        self.clock = MutableClock()
        secret = b"entitlement-test-audit-secret-with-entropy"
        self.auth = AuthService(
            self.database,
            AuthConfig(avatar_root=root / "avatars", audit_secret=secret),
            now=self.clock,
        )
        self.service = EntitlementService(
            self.database,
            EntitlementConfig(
                audit_secret=secret,
                internal_invite_code="test-only-invite",
                internal_access_ttl=timedelta(days=30),
                attempt_window=timedelta(hours=1),
                user_attempt_limit=2,
                address_attempt_limit=10,
            ),
            now=self.clock,
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _register(self, username: str):
        return self.auth.register(
            username=username,
            password="correct-horse-battery",
            display_name=username,
            remote_address="127.0.0.1",
        ).user

    def _set_role(self, user_id: str, role: str) -> None:
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE users SET role = ? WHERE id = ?",
                (role, user_id),
            )

    def test_migration_seeds_role_matrix_and_public_plans(self) -> None:
        free = self._register("free-user")
        view = self.service.view_for_user(free.id)
        self.assertEqual(view.role, "free")
        self.assertEqual(view.label, "Free")
        self.assertIn("solve.static", view.entitlements)
        self.assertIn("report.basic", view.entitlements)
        self.assertNotIn("report.formal", view.entitlements)
        self.assertEqual([plan.name for plan in view.plans], ["free", "plus", "pro"])
        self.assertTrue(view.plans[0].current)
        self.assertTrue(all(not plan.purchase_available for plan in view.plans))

        tables = {
            row["name"]
            for row in self.database.fetch_all(
                "SELECT name FROM sqlite_master WHERE type = ?",
                ("table",),
            )
        }
        self.assertTrue(
            {"role_entitlements", "internal_access_grants", "pinn_waitlist"}.issubset(tables)
        )

    def test_plus_pro_and_admin_are_server_authoritative(self) -> None:
        user = self._register("role-user")
        expectations = {
            "plus": ("Plus", False, True, False),
            "pro": ("Pro", True, True, False),
            "admin": ("Admin", True, True, True),
        }
        for role, (label, formal, advanced, admin) in expectations.items():
            with self.subTest(role=role):
                self._set_role(user.id, role)
                view = self.service.view_for_user(user.id)
                self.assertEqual(view.label, label)
                self.assertEqual("report.formal" in view.entitlements, formal)
                self.assertEqual("export.advanced" in view.entitlements, advanced)
                self.assertEqual("admin.entitlements" in view.entitlements, admin)

    def test_internal_redeem_stores_only_fingerprint_and_never_grants_admin(self) -> None:
        user = self._register("internal-user")
        view = self.service.redeem_internal_access(
            user_id=user.id,
            invite_code="test-only-invite",
            remote_address="198.51.100.10",
        )
        self.assertEqual(view.role, "internal_tester")
        self.assertEqual(view.label, "Internal Tester")
        self.assertIn("preview.internal", view.entitlements)
        self.assertNotIn("admin.entitlements", view.entitlements)
        self.assertIsNotNone(view.internal_expires_at)

        grant = self.database.fetch_one(
            "SELECT code_fingerprint, last_used_at FROM internal_access_grants WHERE user_id = ?",
            (user.id,),
        )
        self.assertNotEqual(grant["code_fingerprint"], "test-only-invite")
        self.assertIsNotNone(grant["last_used_at"])
        serialized = repr(
            self.database.fetch_all(
                "SELECT subject_hash, address_hash FROM login_attempts WHERE kind = ?",
                ("internal_invite",),
            )
        )
        self.assertNotIn("test-only-invite", serialized)
        self.assertNotIn("198.51.100.10", serialized)

    def test_internal_attempts_are_rate_limited_with_generic_errors(self) -> None:
        user = self._register("limited-user")
        messages = []
        for _ in range(2):
            with self.assertRaises(InternalAccessInvalidError) as captured:
                self.service.redeem_internal_access(
                    user_id=user.id,
                    invite_code="wrong-test-value",
                    remote_address="203.0.113.4",
                )
            messages.append(str(captured.exception))
        self.assertEqual(messages[0], messages[1])
        with self.assertRaises(InternalAccessRateLimitError):
            self.service.redeem_internal_access(
                user_id=user.id,
                invite_code="test-only-invite",
                remote_address="203.0.113.4",
            )

    def test_expiry_restores_previous_role(self) -> None:
        user = self._register("expiring-user")
        self._set_role(user.id, "plus")
        self.service.redeem_internal_access(
            user_id=user.id,
            invite_code="test-only-invite",
            remote_address="127.0.0.1",
        )
        self.clock.advance(timedelta(days=31))
        view = self.service.view_for_user(user.id)
        self.assertEqual(view.role, "plus")
        self.assertEqual(view.label, "Plus")
        self.assertIsNone(view.internal_expires_at)

    def test_only_admin_can_revoke_internal_access(self) -> None:
        target = self._register("revoke-target")
        ordinary = self._register("ordinary-user")
        admin = self._register("admin-user")
        self._set_role(target.id, "pro")
        self._set_role(admin.id, "admin")
        self.service.redeem_internal_access(
            user_id=target.id,
            invite_code="test-only-invite",
            remote_address="127.0.0.1",
        )

        with self.assertRaises(EntitlementRequiredError):
            self.service.revoke_internal_access(
                actor_user_id=ordinary.id,
                target_user_id=target.id,
            )
        view = self.service.revoke_internal_access(
            actor_user_id=admin.id,
            target_user_id=target.id,
        )
        self.assertEqual(view.role, "pro")
        grant = self.database.fetch_one(
            "SELECT revoked_at, revoked_by FROM internal_access_grants WHERE user_id = ?",
            (target.id,),
        )
        self.assertIsNotNone(grant["revoked_at"])
        self.assertEqual(grant["revoked_by"], admin.id)

    def test_pinn_waitlist_is_idempotent_and_does_not_grant_solver_access(self) -> None:
        user = self._register("pinn-user")
        first = self.service.join_pinn_waitlist(user.id)
        second = self.service.join_pinn_waitlist(user.id)
        self.assertEqual(first.pinn_status, "waiting")
        self.assertEqual(second.pinn_status, "waiting")
        self.assertEqual(
            self.database.fetch_one("SELECT COUNT(*) AS count FROM pinn_waitlist")["count"],
            1,
        )
        self.assertNotIn("solve.pinn", second.entitlements)


if __name__ == "__main__":
    unittest.main()

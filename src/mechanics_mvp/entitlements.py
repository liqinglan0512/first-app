"""Server-authoritative plans, entitlements, internal access, and PINN waitlist."""

from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from .database import Database


class EntitlementError(RuntimeError):
    code = "ENTITLEMENT_ERROR"
    status = 400

    def __init__(self, message: str, *, retry_after: int | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class EntitlementRequiredError(EntitlementError):
    code = "ENTITLEMENT_REQUIRED"
    status = 403


class EntitlementValidationError(EntitlementError):
    code = "ENTITLEMENT_VALIDATION"
    status = 422


class InternalAccessUnavailableError(EntitlementError):
    code = "INTERNAL_ACCESS_UNAVAILABLE"
    status = 503


class InternalAccessInvalidError(EntitlementError):
    code = "INTERNAL_ACCESS_INVALID"
    status = 403


class InternalAccessRateLimitError(EntitlementError):
    code = "INTERNAL_ACCESS_RATE_LIMITED"
    status = 429


@dataclass(frozen=True)
class EntitlementConfig:
    audit_secret: bytes
    internal_invite_code: str | None = None
    internal_access_ttl: timedelta = timedelta(days=90)
    attempt_window: timedelta = timedelta(hours=1)
    user_attempt_limit: int = 5
    address_attempt_limit: int = 20

    def __post_init__(self) -> None:
        if len(self.audit_secret) < 16:
            raise ValueError("audit_secret must contain at least 16 bytes")
        if self.internal_access_ttl.total_seconds() <= 0:
            raise ValueError("internal_access_ttl must be positive")
        if self.attempt_window.total_seconds() <= 0:
            raise ValueError("attempt_window must be positive")


@dataclass(frozen=True)
class PlanView:
    name: str
    display_name: str
    description: str
    current: bool
    purchase_available: bool = False


@dataclass(frozen=True)
class EntitlementView:
    user_id: str
    role: str
    label: str
    entitlements: tuple[str, ...]
    plans: tuple[PlanView, ...]
    internal_expires_at: str | None
    pinn_status: str | None


ROLE_LABELS = {
    "free": "Free",
    "plus": "Plus",
    "pro": "Pro",
    "internal_tester": "Internal Tester",
    "admin": "Admin",
}


class EntitlementService:
    def __init__(
        self,
        database: Database,
        config: EntitlementConfig,
        *,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self.database = database
        self.config = config
        self._now = now or (lambda: datetime.now(timezone.utc))

    def view_for_user(self, user_id: str) -> EntitlementView:
        user_id = str(user_id or "")
        if not user_id:
            raise EntitlementValidationError("用户标识无效。")
        self._refresh_internal_status(user_id)
        now = _iso(self._now())
        user = self.database.fetch_one(
            "SELECT id, role FROM users WHERE id = ? AND is_active = 1",
            (user_id,),
        )
        if user is None:
            raise EntitlementValidationError("账户不存在或已停用。")
        role = str(user["role"])

        role_rows = self.database.fetch_all(
            "SELECT entitlement FROM role_entitlements WHERE role = ?",
            (role,),
        )
        explicit_rows = self.database.fetch_all(
            """
            SELECT entitlement FROM user_entitlements
            WHERE user_id = ? AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > ?)
            """,
            (user_id, now),
        )
        entitlement_names = sorted(
            {str(row["entitlement"]) for row in role_rows + explicit_rows}
        )

        plan_rows = self.database.fetch_all(
            """
            SELECT name, display_name, description FROM subscription_plans
            WHERE is_active = 1 AND is_public = 1
            ORDER BY sort_order, name
            """
        )
        plans = tuple(
            PlanView(
                name=str(row["name"]),
                display_name=str(row["display_name"]),
                description=str(row.get("description") or ""),
                current=str(row["name"]) == role,
            )
            for row in plan_rows
        )

        grant = self.database.fetch_one(
            """
            SELECT expires_at FROM internal_access_grants
            WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
            """,
            (user_id, now),
        )
        internal_expires_at = str(grant["expires_at"]) if grant and role == "internal_tester" else None
        if internal_expires_at:
            with self.database.transaction() as connection:
                self.database.execute_on(
                    connection,
                    "UPDATE internal_access_grants SET last_used_at = ? WHERE user_id = ?",
                    (now, user_id),
                )

        waitlist = self.database.fetch_one(
            "SELECT status FROM pinn_waitlist WHERE user_id = ?",
            (user_id,),
        )
        return EntitlementView(
            user_id=user_id,
            role=role,
            label=ROLE_LABELS.get(role, "Free"),
            entitlements=tuple(entitlement_names),
            plans=plans,
            internal_expires_at=internal_expires_at,
            pinn_status=str(waitlist["status"]) if waitlist else None,
        )

    def require(self, user_id: str, entitlement: str) -> EntitlementView:
        view = self.view_for_user(user_id)
        if entitlement not in view.entitlements:
            display_name = {
                "report.formal": "正式报告",
                "export.advanced": "高级导出",
                "admin.entitlements": "权益管理",
                "pinn.waitlist": "PINN 等待名单",
            }.get(entitlement, "该功能")
            raise EntitlementRequiredError(f"当前账户不包含{display_name}权益。")
        return view

    def redeem_internal_access(
        self,
        *,
        user_id: str,
        invite_code: str,
        remote_address: str,
    ) -> EntitlementView:
        configured = (self.config.internal_invite_code or "").strip()
        if not configured or configured.casefold() == "change-me":
            raise InternalAccessUnavailableError("内部测试通道当前未开放。")
        provided = str(invite_code or "").strip()
        if not provided or len(provided) > 256:
            raise InternalAccessInvalidError("内部测试凭据无效或已过期。")

        user = self.database.fetch_one(
            "SELECT id, role FROM users WHERE id = ? AND is_active = 1",
            (user_id,),
        )
        if user is None:
            raise EntitlementValidationError("账户不存在或已停用。")
        if str(user["role"]) == "admin":
            raise EntitlementValidationError("管理员账户不需要内部测试资格。")

        user_hash = self._audit_hash("internal-user", user_id)
        address_hash = self._audit_hash("internal-address", remote_address or "unknown")
        self._check_attempt_limit(user_hash, address_hash)
        expected_fingerprint = self._invite_fingerprint(configured)
        provided_fingerprint = self._invite_fingerprint(provided)
        if not hmac.compare_digest(expected_fingerprint, provided_fingerprint):
            self._record_attempt(user_hash, address_hash, False)
            raise InternalAccessInvalidError("内部测试凭据无效或已过期。")

        now_dt = self._now()
        now = _iso(now_dt)
        expires_at = _iso(now_dt + self.config.internal_access_ttl)
        existing = self.database.fetch_one(
            "SELECT previous_role FROM internal_access_grants WHERE user_id = ?",
            (user_id,),
        )
        current_role = str(user["role"])
        previous_role = (
            str(existing["previous_role"])
            if current_role == "internal_tester" and existing
            else current_role
        )
        if previous_role not in {"free", "plus", "pro"}:
            previous_role = "free"

        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                """
                INSERT INTO internal_access_grants (
                    id, user_id, code_fingerprint, previous_role, granted_at,
                    expires_at, last_used_at, revoked_at, revoked_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
                ON CONFLICT (user_id) DO UPDATE SET
                    code_fingerprint = excluded.code_fingerprint,
                    previous_role = excluded.previous_role,
                    granted_at = excluded.granted_at,
                    expires_at = excluded.expires_at,
                    last_used_at = excluded.last_used_at,
                    revoked_at = NULL,
                    revoked_by = NULL
                """,
                (
                    str(uuid.uuid4()),
                    user_id,
                    expected_fingerprint,
                    previous_role,
                    now,
                    expires_at,
                    now,
                ),
            )
            self.database.execute_on(
                connection,
                "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
                ("internal_tester", now, user_id),
            )
        self._record_attempt(user_hash, address_hash, True)
        return self.view_for_user(user_id)

    def revoke_internal_access(
        self,
        *,
        actor_user_id: str,
        target_user_id: str,
    ) -> EntitlementView:
        self.require(actor_user_id, "admin.entitlements")
        now = _iso(self._now())
        grant = self.database.fetch_one(
            "SELECT previous_role, revoked_at FROM internal_access_grants WHERE user_id = ?",
            (target_user_id,),
        )
        if grant is None or grant["revoked_at"] is not None:
            raise EntitlementValidationError("该账户没有可撤销的内部测试资格。")
        previous_role = str(grant["previous_role"])
        if previous_role not in {"free", "plus", "pro"}:
            previous_role = "free"
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                """
                UPDATE internal_access_grants
                SET revoked_at = ?, revoked_by = ?
                WHERE user_id = ? AND revoked_at IS NULL
                """,
                (now, actor_user_id, target_user_id),
            )
            self.database.execute_on(
                connection,
                """
                UPDATE users SET role = ?, updated_at = ?
                WHERE id = ? AND role = 'internal_tester'
                """,
                (previous_role, now, target_user_id),
            )
        return self.view_for_user(target_user_id)

    def join_pinn_waitlist(self, user_id: str) -> EntitlementView:
        self.require(user_id, "pinn.waitlist")
        now = _iso(self._now())
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                """
                INSERT INTO pinn_waitlist (user_id, status, joined_at, updated_at)
                VALUES (?, 'waiting', ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET updated_at = excluded.updated_at
                """,
                (user_id, now, now),
            )
        return self.view_for_user(user_id)

    def _refresh_internal_status(self, user_id: str) -> None:
        now = _iso(self._now())
        user = self.database.fetch_one(
            "SELECT role FROM users WHERE id = ?",
            (user_id,),
        )
        if user is None or str(user["role"]) != "internal_tester":
            return
        grant = self.database.fetch_one(
            """
            SELECT previous_role, expires_at, revoked_at
            FROM internal_access_grants WHERE user_id = ?
            """,
            (user_id,),
        )
        if grant and grant["revoked_at"] is None and str(grant["expires_at"]) > now:
            return
        previous_role = str(grant["previous_role"]) if grant else "free"
        if previous_role not in {"free", "plus", "pro"}:
            previous_role = "free"
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE users SET role = ?, updated_at = ? WHERE id = ? AND role = 'internal_tester'",
                (previous_role, now, user_id),
            )

    def _check_attempt_limit(self, user_hash: str, address_hash: str) -> None:
        since = _iso(self._now() - self.config.attempt_window)
        user_count = self._attempt_count("subject_hash", user_hash, since)
        address_count = self._attempt_count("address_hash", address_hash, since)
        if (
            user_count >= self.config.user_attempt_limit
            or address_count >= self.config.address_attempt_limit
        ):
            raise InternalAccessRateLimitError(
                "尝试次数过多，请稍后再试。",
                retry_after=max(1, int(self.config.attempt_window.total_seconds())),
            )

    def _attempt_count(self, column: str, value: str, since: str) -> int:
        if column not in {"subject_hash", "address_hash"}:
            raise ValueError("Invalid audit column")
        row = self.database.fetch_one(
            f"""
            SELECT COUNT(*) AS count FROM login_attempts
            WHERE kind = ? AND success = 0 AND {column} = ? AND attempted_at >= ?
            """,
            ("internal_invite", value, since),
        )
        return int(row["count"] if row else 0)

    def _record_attempt(self, user_hash: str, address_hash: str, success: bool) -> None:
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                """
                INSERT INTO login_attempts (
                    id, kind, subject_hash, address_hash, success, attempted_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    "internal_invite",
                    user_hash,
                    address_hash,
                    1 if success else 0,
                    _iso(self._now()),
                ),
            )

    def _audit_hash(self, category: str, value: str) -> str:
        return hmac.new(
            self.config.audit_secret,
            f"{category}:{value}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _invite_fingerprint(self, value: str) -> str:
        return self._audit_hash("internal-invite", value)


def create_entitlement_service(
    database: Database,
    audit_secret: bytes,
) -> EntitlementService:
    invite_code = os.environ.get("CMS_INTERNAL_INVITE_CODE", "").strip() or None
    ttl_days = _bounded_integer_env("CMS_INTERNAL_INVITE_TTL_DAYS", 90, 1, 3650)
    user_limit = _bounded_integer_env("CMS_INTERNAL_INVITE_USER_LIMIT", 5, 1, 100)
    address_limit = _bounded_integer_env("CMS_INTERNAL_INVITE_ADDRESS_LIMIT", 20, 1, 1000)
    return EntitlementService(
        database,
        EntitlementConfig(
            audit_secret=audit_secret,
            internal_invite_code=invite_code,
            internal_access_ttl=timedelta(days=ttl_days),
            user_attempt_limit=user_limit,
            address_attempt_limit=address_limit,
        ),
    )


def entitlement_view_payload(view: EntitlementView) -> dict[str, Any]:
    return {
        "role": view.role,
        "label": view.label,
        "entitlements": list(view.entitlements),
        "internalExpiresAt": view.internal_expires_at,
        "pinnStatus": view.pinn_status,
        "plans": [
            {
                "name": plan.name,
                "displayName": plan.display_name,
                "description": plan.description,
                "current": plan.current,
                "purchaseAvailable": plan.purchase_available,
            }
            for plan in view.plans
        ],
    }


def entitlement_error_payload(error: EntitlementError) -> dict[str, Any]:
    return {"error": {"code": error.code, "message": str(error)}}


def _bounded_integer_env(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(f"{name} must be an integer.") from None
    if not minimum <= value <= maximum:
        raise RuntimeError(f"{name} must be between {minimum} and {maximum}.")
    return value


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

"""Server-side account, session, CSRF, rate-limit, and avatar services."""

from __future__ import annotations

import hashlib
import hmac
import io
import secrets
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from PIL import Image, UnidentifiedImageError

from .database import Database


class AuthError(RuntimeError):
    code = "AUTH_ERROR"
    status = 400

    def __init__(self, message: str, *, retry_after: int | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class AuthValidationError(AuthError):
    code = "AUTH_VALIDATION"
    status = 422


class AuthConflictError(AuthError):
    code = "AUTH_ACCOUNT_UNAVAILABLE"
    status = 409


class AuthInvalidCredentialsError(AuthError):
    code = "AUTH_INVALID_CREDENTIALS"
    status = 401


class AuthUnauthorizedError(AuthError):
    code = "AUTH_REQUIRED"
    status = 401


class AuthCsrfError(AuthError):
    code = "AUTH_CSRF_INVALID"
    status = 403


class AuthRateLimitError(AuthError):
    code = "AUTH_RATE_LIMITED"
    status = 429


@dataclass(frozen=True)
class AvatarUpload:
    filename: str
    content_type: str
    data: bytes


@dataclass(frozen=True)
class PublicUser:
    id: str
    username: str
    display_name: str
    avatar_path: str | None
    role: str
    created_at: str


@dataclass(frozen=True)
class IssuedSession:
    session_token: str
    csrf_token: str
    expires_at: str
    user: PublicUser


@dataclass(frozen=True)
class SessionView:
    csrf_token: str
    expires_at: str
    user: PublicUser


@dataclass(frozen=True)
class AuthConfig:
    avatar_root: Path
    audit_secret: bytes
    session_ttl: timedelta = timedelta(days=7)
    login_window: timedelta = timedelta(minutes=15)
    login_username_limit: int = 8
    login_address_limit: int = 30
    registration_window: timedelta = timedelta(hours=1)
    registration_address_limit: int = 5
    max_avatar_bytes: int = 2 * 1024 * 1024
    max_avatar_dimension: int = 4096
    password_min_length: int = 10
    password_max_length: int = 128

    def __post_init__(self) -> None:
        if len(self.audit_secret) < 16:
            raise ValueError("audit_secret must contain at least 16 bytes")
        if self.session_ttl.total_seconds() <= 0:
            raise ValueError("session_ttl must be positive")


class AuthService:
    def __init__(
        self,
        database: Database,
        config: AuthConfig,
        *,
        now: Callable[[], datetime] | None = None,
        password_hasher: PasswordHasher | None = None,
    ) -> None:
        self.database = database
        self.config = config
        self._now = now or (lambda: datetime.now(timezone.utc))
        self._hasher = password_hasher or PasswordHasher()
        self._dummy_password_hash = self._hasher.hash(secrets.token_urlsafe(32))
        self.config.avatar_root.mkdir(parents=True, exist_ok=True)

    def register(
        self,
        *,
        username: str,
        password: str,
        display_name: str,
        remote_address: str,
        avatar: AvatarUpload | None = None,
    ) -> IssuedSession:
        normalized_username = _normalize_username(username)
        normalized_display_name = _normalize_display_name(display_name)
        self._validate_password(password, normalized_username)
        address_hash = self._audit_hash("address", remote_address or "unknown")
        subject_hash = self._audit_hash("username", normalized_username)
        self._check_registration_limit(address_hash)

        avatar_content = self._validate_avatar(avatar) if avatar is not None else None
        user_id = str(uuid.uuid4())
        now = _iso(self._now())
        avatar_path: str | None = None
        if avatar_content is not None:
            extension, data = avatar_content
            avatar_path = f"{user_id}{extension}"
            self._write_avatar(avatar_path, data)

        try:
            with self.database.transaction() as connection:
                self.database.execute_on(
                    connection,
                    """
                    INSERT INTO users (
                        id, username, password_hash, display_name, avatar_path,
                        role, created_at, updated_at, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        normalized_username,
                        self._hasher.hash(password),
                        normalized_display_name,
                        avatar_path,
                        "free",
                        now,
                        now,
                        1,
                    ),
                )
        except Exception as exc:
            if avatar_path:
                self.avatar_file(avatar_path).unlink(missing_ok=True)
            self._record_attempt("register", subject_hash, address_hash, False)
            if self.database.is_integrity_error(exc):
                raise AuthConflictError("该账户名不可用。") from None
            raise

        self._record_attempt("register", subject_hash, address_hash, True)
        return self._issue_session(user_id)

    def login(
        self,
        *,
        username: str,
        password: str,
        remote_address: str,
    ) -> IssuedSession:
        normalized_username = _normalize_username(username)
        if not isinstance(password, str) or not password:
            raise AuthInvalidCredentialsError("用户名或密码错误。")
        subject_hash = self._audit_hash("username", normalized_username)
        address_hash = self._audit_hash("address", remote_address or "unknown")
        self._check_login_limit(subject_hash, address_hash)
        user = self.database.fetch_one(
            "SELECT * FROM users WHERE username = ?",
            (normalized_username,),
        )

        stored_hash = user["password_hash"] if user else self._dummy_password_hash
        verified = False
        try:
            verified = self._hasher.verify(stored_hash, password)
        except (VerifyMismatchError, InvalidHashError):
            verified = False

        if not user or not verified or not bool(user["is_active"]):
            self._record_attempt("login", subject_hash, address_hash, False)
            raise AuthInvalidCredentialsError("用户名或密码错误。")

        if self._hasher.check_needs_rehash(stored_hash):
            with self.database.transaction() as connection:
                self.database.execute_on(
                    connection,
                    "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                    (self._hasher.hash(password), _iso(self._now()), user["id"]),
                )
        self._record_attempt("login", subject_hash, address_hash, True)
        return self._issue_session(str(user["id"]))

    def session(self, session_token: str) -> SessionView | None:
        record = self._active_session(session_token)
        if record is None:
            return None
        csrf_token = self._csrf_token(session_token)
        now = _iso(self._now())
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE sessions SET last_seen_at = ? WHERE id = ?",
                (now, record["session_id"]),
            )
        return SessionView(
            csrf_token=csrf_token,
            expires_at=str(record["expires_at"]),
            user=_public_user(record),
        )

    def logout(self, session_token: str, csrf_token: str) -> None:
        record = self._require_session(session_token, csrf_token)
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE sessions SET revoked_at = ? WHERE id = ?",
                (_iso(self._now()), record["session_id"]),
            )

    def update_profile(
        self,
        session_token: str,
        csrf_token: str,
        *,
        display_name: str,
    ) -> PublicUser:
        record = self._require_session(session_token, csrf_token)
        display_name = _normalize_display_name(display_name)
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?",
                (display_name, _iso(self._now()), record["user_id"]),
            )
        return self._user_by_id(str(record["user_id"]))

    def change_password(
        self,
        session_token: str,
        csrf_token: str,
        *,
        current_password: str,
        new_password: str,
    ) -> IssuedSession:
        record = self._require_session(session_token, csrf_token)
        self._validate_password(new_password, str(record["username"]))
        try:
            valid = self._hasher.verify(str(record["password_hash"]), current_password)
        except (VerifyMismatchError, InvalidHashError):
            valid = False
        if not valid:
            raise AuthInvalidCredentialsError("原密码不正确。")

        now = _iso(self._now())
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (self._hasher.hash(new_password), now, record["user_id"]),
            )
            self.database.execute_on(
                connection,
                "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
                (now, record["user_id"]),
            )
        return self._issue_session(str(record["user_id"]))

    def update_avatar(
        self,
        session_token: str,
        csrf_token: str,
        avatar: AvatarUpload,
    ) -> PublicUser:
        record = self._require_session(session_token, csrf_token)
        extension, data = self._validate_avatar(avatar)
        new_name = f"{record['user_id']}{extension}"
        self._write_avatar(new_name, data)
        old_name = record.get("avatar_path")
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE users SET avatar_path = ?, updated_at = ? WHERE id = ?",
                (new_name, _iso(self._now()), record["user_id"]),
            )
        if old_name and old_name != new_name:
            self.avatar_file(str(old_name)).unlink(missing_ok=True)
        return self._user_by_id(str(record["user_id"]))

    def avatar_file(self, avatar_path: str) -> Path:
        normalized = str(avatar_path).replace("\\", "/")
        if not normalized or "/" in normalized or normalized in {".", ".."}:
            raise AuthValidationError("头像路径无效。")
        root = self.config.avatar_root.resolve()
        target = (root / normalized).resolve()
        if not target.is_relative_to(root):
            raise AuthValidationError("头像路径无效。")
        return target

    def _issue_session(self, user_id: str) -> IssuedSession:
        session_token = secrets.token_urlsafe(48)
        csrf_token = self._csrf_token(session_token)
        now_dt = self._now()
        now = _iso(now_dt)
        expires_at = _iso(now_dt + self.config.session_ttl)
        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                """
                INSERT INTO sessions (
                    id, user_id, token_hash, csrf_token_hash, created_at,
                    expires_at, last_seen_at, revoked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    str(uuid.uuid4()),
                    user_id,
                    _digest(session_token),
                    _digest(csrf_token),
                    now,
                    expires_at,
                    now,
                ),
            )
        return IssuedSession(
            session_token=session_token,
            csrf_token=csrf_token,
            expires_at=expires_at,
            user=self._user_by_id(user_id),
        )

    def _active_session(self, session_token: str) -> dict[str, Any] | None:
        if not session_token:
            return None
        record = self.database.fetch_one(
            """
            SELECT
                s.id AS session_id, s.user_id, s.csrf_token_hash,
                s.expires_at, s.revoked_at,
                u.username, u.password_hash, u.display_name, u.avatar_path,
                u.role, u.created_at, u.is_active
            FROM sessions AS s
            JOIN users AS u ON u.id = s.user_id
            WHERE s.token_hash = ?
            """,
            (_digest(session_token),),
        )
        if record is None or record["revoked_at"] is not None or not bool(record["is_active"]):
            return None
        if _parse_iso(str(record["expires_at"])) <= self._now():
            with self.database.transaction() as connection:
                self.database.execute_on(
                    connection,
                    "UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL",
                    (_iso(self._now()), record["session_id"]),
                )
            return None
        return record

    def _require_session(self, session_token: str, csrf_token: str) -> dict[str, Any]:
        record = self._active_session(session_token)
        if record is None:
            raise AuthUnauthorizedError("请先登录。")
        if not csrf_token or not hmac.compare_digest(
            str(record["csrf_token_hash"]),
            _digest(csrf_token),
        ):
            raise AuthCsrfError("安全令牌无效，请刷新页面后重试。")
        return record

    def _user_by_id(self, user_id: str) -> PublicUser:
        row = self.database.fetch_one(
            "SELECT id, username, display_name, avatar_path, role, created_at FROM users WHERE id = ?",
            (user_id,),
        )
        if row is None:
            raise AuthUnauthorizedError("请先登录。")
        return _public_user(row)

    def _check_login_limit(self, subject_hash: str, address_hash: str) -> None:
        since = _iso(self._now() - self.config.login_window)
        subject_failures = self._attempt_count("login", "subject_hash", subject_hash, since)
        address_failures = self._attempt_count("login", "address_hash", address_hash, since)
        if (
            subject_failures >= self.config.login_username_limit
            or address_failures >= self.config.login_address_limit
        ):
            retry_after = max(1, int(self.config.login_window.total_seconds()))
            raise AuthRateLimitError("尝试次数过多，请稍后再试。", retry_after=retry_after)

    def _check_registration_limit(self, address_hash: str) -> None:
        since = _iso(self._now() - self.config.registration_window)
        count = self.database.fetch_one(
            """
            SELECT COUNT(*) AS count FROM login_attempts
            WHERE kind = ? AND address_hash = ? AND attempted_at >= ?
            """,
            ("register", address_hash, since),
        )
        if int(count["count"] if count else 0) >= self.config.registration_address_limit:
            retry_after = max(1, int(self.config.registration_window.total_seconds()))
            raise AuthRateLimitError("创建账户过于频繁，请稍后再试。", retry_after=retry_after)

    def _attempt_count(self, kind: str, column: str, value: str, since: str) -> int:
        if column not in {"subject_hash", "address_hash"}:
            raise ValueError("Invalid audit column")
        row = self.database.fetch_one(
            f"""
            SELECT COUNT(*) AS count FROM login_attempts
            WHERE kind = ? AND success = 0 AND {column} = ? AND attempted_at >= ?
            """,
            (kind, value, since),
        )
        return int(row["count"] if row else 0)

    def _record_attempt(
        self,
        kind: str,
        subject_hash: str,
        address_hash: str,
        success: bool,
    ) -> None:
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
                    kind,
                    subject_hash,
                    address_hash,
                    1 if success else 0,
                    _iso(self._now()),
                ),
            )

    def _audit_hash(self, category: str, value: str) -> str:
        message = f"{category}:{value}".encode("utf-8")
        return hmac.new(self.config.audit_secret, message, hashlib.sha256).hexdigest()

    def _csrf_token(self, session_token: str) -> str:
        return hmac.new(
            self.config.audit_secret,
            f"csrf:{session_token}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _validate_password(self, password: str, username: str) -> None:
        if not isinstance(password, str):
            raise AuthValidationError("密码格式无效。")
        if not self.config.password_min_length <= len(password) <= self.config.password_max_length:
            raise AuthValidationError(
                f"密码长度必须为 {self.config.password_min_length} 至 {self.config.password_max_length} 个字符。"
            )
        if password.casefold() == username.casefold():
            raise AuthValidationError("密码不能与账户名相同。")

    def _validate_avatar(self, avatar: AvatarUpload) -> tuple[str, bytes]:
        filename = avatar.filename.replace("\\", "/")
        if not filename or "/" in filename or filename in {".", ".."}:
            raise AuthValidationError("头像文件名无效。")
        if len(avatar.data) > self.config.max_avatar_bytes:
            raise AuthValidationError("头像文件不能超过 2 MiB。")

        extension = Path(filename).suffix.lower()
        allowed = {
            ".png": ("PNG", "image/png"),
            ".jpg": ("JPEG", "image/jpeg"),
            ".jpeg": ("JPEG", "image/jpeg"),
            ".webp": ("WEBP", "image/webp"),
        }
        if extension not in allowed:
            raise AuthValidationError("头像只支持 PNG、JPEG 或 WebP。")
        expected_format, expected_mime = allowed[extension]
        if avatar.content_type.lower().split(";", 1)[0].strip() != expected_mime:
            raise AuthValidationError("头像 MIME 与扩展名不匹配。")

        try:
            with Image.open(io.BytesIO(avatar.data)) as image:
                image.verify()
            with Image.open(io.BytesIO(avatar.data)) as image:
                if image.format != expected_format:
                    raise AuthValidationError("头像内容与扩展名不匹配。")
                if max(image.size) > self.config.max_avatar_dimension:
                    raise AuthValidationError("头像尺寸过大。")
                image.load()
                output = io.BytesIO()
                if expected_format == "JPEG":
                    image.convert("RGB").save(output, format="JPEG", quality=90, optimize=True)
                    safe_extension = ".jpg"
                elif expected_format == "PNG":
                    image.save(output, format="PNG", optimize=True)
                    safe_extension = ".png"
                else:
                    image.save(output, format="WEBP", quality=90, method=6)
                    safe_extension = ".webp"
                return safe_extension, output.getvalue()
        except AuthValidationError:
            raise
        except (UnidentifiedImageError, OSError, ValueError):
            raise AuthValidationError("头像文件已损坏或不是有效图片。") from None

    def _write_avatar(self, avatar_path: str, data: bytes) -> None:
        target = self.avatar_file(avatar_path)
        temporary = target.with_suffix(target.suffix + f".{secrets.token_hex(6)}.tmp")
        temporary.write_bytes(data)
        temporary.replace(target)


def _normalize_username(value: str) -> str:
    username = unicodedata.normalize("NFKC", str(value or "")).strip().casefold()
    if not 3 <= len(username) <= 32:
        raise AuthValidationError("账户名长度必须为 3 至 32 个字符。")
    if not all(character.isalnum() or character in "._-" for character in username):
        raise AuthValidationError("账户名只能包含文字、数字、点、下划线或短横线。")
    return username


def _normalize_display_name(value: str) -> str:
    display_name = unicodedata.normalize("NFKC", str(value or "")).strip()
    if not 1 <= len(display_name) <= 40:
        raise AuthValidationError("昵称长度必须为 1 至 40 个字符。")
    if any(unicodedata.category(character).startswith("C") for character in display_name):
        raise AuthValidationError("昵称包含不可用控制字符。")
    return display_name


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _public_user(row: dict[str, Any]) -> PublicUser:
    return PublicUser(
        id=str(row.get("id") or row["user_id"]),
        username=str(row["username"]),
        display_name=str(row["display_name"]),
        avatar_path=str(row["avatar_path"]) if row.get("avatar_path") else None,
        role=str(row["role"]),
        created_at=str(row["created_at"]),
    )

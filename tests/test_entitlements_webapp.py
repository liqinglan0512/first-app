from __future__ import annotations

import http.cookiejar
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.auth import AuthConfig, AuthService
from mechanics_mvp.database import Database
from mechanics_mvp.entitlements import EntitlementConfig, EntitlementService
from mechanics_mvp.webapp import MechanicsWebHandler


class EntitlementWebAppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.database = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
        self.database.migrate()
        secret = b"entitlement-http-test-secret-with-entropy"
        self.auth_service = AuthService(
            self.database,
            AuthConfig(avatar_root=root / "avatars", audit_secret=secret),
        )
        self.entitlement_service = EntitlementService(
            self.database,
            EntitlementConfig(
                audit_secret=secret,
                internal_invite_code="test-http-invite",
                user_attempt_limit=3,
            ),
        )
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), MechanicsWebHandler)
        self.server.auth_service = self.auth_service
        self.server.entitlement_service = self.entitlement_service
        self.server.auth_cookie_secure = False
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        host, port = self.server.server_address
        self.base_url = f"http://{host}:{port}"
        self.origin = self.base_url
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )
        _status, _headers, registered = self._request(
            "/api/auth/register",
            method="POST",
            headers={"Origin": self.origin},
            payload={
                "username": "entitlement-user",
                "password": "correct-horse-battery",
                "passwordConfirm": "correct-horse-battery",
                "displayName": "权益测试",
                "acceptedTerms": True,
                "acceptedPrivacy": True,
            },
        )
        self.user_id = registered["user"]["id"]
        self.csrf = registered["csrfToken"]

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp_dir.cleanup()

    def _request(
        self,
        path: str,
        *,
        method: str = "GET",
        payload: dict | None = None,
        headers: dict[str, str] | None = None,
    ):
        request_headers = dict(headers or {})
        data = None
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            headers=request_headers,
            method=method,
        )
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        content_type = response.headers.get("Content-Type", "")
        parsed = json.loads(body.decode("utf-8")) if "application/json" in content_type else body
        return response.status, response.headers, parsed

    def _mutation(self, path: str, payload: dict):
        return self._request(
            path,
            method="POST",
            headers={"Origin": self.origin, "X-CSRF-Token": self.csrf},
            payload=payload,
        )

    def test_free_entitlements_and_public_plans_are_server_generated(self) -> None:
        status, _headers, payload = self._request("/api/entitlements")
        self.assertEqual(status, 200)
        self.assertEqual(payload["role"], "free")
        self.assertEqual(payload["label"], "Free")
        self.assertIn("report.basic", payload["entitlements"])
        self.assertNotIn("report.formal", payload["entitlements"])
        self.assertEqual([plan["name"] for plan in payload["plans"]], ["free", "plus", "pro"])
        self.assertTrue(all(not plan["purchaseAvailable"] for plan in payload["plans"]))
        self.assertEqual(payload["user"]["role"], "free")

    def test_forged_role_cannot_unlock_formal_report(self) -> None:
        status, _headers, payload = self._request(
            "/api/report",
            method="POST",
            payload={
                "role": "pro",
                "entitlements": ["report.formal"],
                "report_options": ["formal"],
            },
        )
        self.assertEqual(status, 403)
        self.assertEqual(payload["error"]["code"], "ENTITLEMENT_REQUIRED")

        with self.database.transaction() as connection:
            self.database.execute_on(
                connection,
                "UPDATE users SET role = ? WHERE id = ?",
                ("pro", self.user_id),
            )
        status, _headers, payload = self._request(
            "/api/report",
            method="POST",
            payload={"report_options": ["formal"]},
        )
        self.assertEqual(status, 422)
        error = payload.get("error")
        error_code = error.get("code") if isinstance(error, dict) else None
        self.assertNotEqual(error_code, "ENTITLEMENT_REQUIRED")

    def test_internal_redeem_requires_csrf_and_never_echoes_credential(self) -> None:
        status, _headers, payload = self._request(
            "/api/entitlements/internal/redeem",
            method="POST",
            headers={"Origin": self.origin},
            payload={"inviteCode": "test-http-invite"},
        )
        self.assertEqual(status, 403)
        self.assertEqual(payload["error"]["code"], "AUTH_CSRF_INVALID")

        status, _headers, payload = self._mutation(
            "/api/entitlements/internal/redeem",
            {"inviteCode": "wrong-test-value"},
        )
        self.assertEqual(status, 403)
        self.assertEqual(payload["error"]["code"], "INTERNAL_ACCESS_INVALID")
        self.assertNotIn("wrong-test-value", json.dumps(payload, ensure_ascii=False))

        status, _headers, payload = self._mutation(
            "/api/entitlements/internal/redeem",
            {"inviteCode": "test-http-invite"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["role"], "internal_tester")
        self.assertEqual(payload["label"], "Internal Tester")
        self.assertNotIn("admin.entitlements", payload["entitlements"])
        self.assertEqual(payload["user"]["role"], "internal_tester")
        serialized = json.dumps(payload, ensure_ascii=False)
        self.assertNotIn("test-http-invite", serialized)
        grant = self.database.fetch_one(
            "SELECT code_fingerprint FROM internal_access_grants WHERE user_id = ?",
            (self.user_id,),
        )
        self.assertNotEqual(grant["code_fingerprint"], "test-http-invite")

    def test_pinn_waitlist_records_status_without_enabling_solver(self) -> None:
        status, _headers, payload = self._mutation("/api/pinn/waitlist", {})
        self.assertEqual(status, 200)
        self.assertEqual(payload["pinnStatus"], "waiting")
        self.assertNotIn("solve.pinn", payload["entitlements"])


if __name__ == "__main__":
    unittest.main()

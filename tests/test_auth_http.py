from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.auth_http import create_auth_service


class AuthHttpConfigurationTests(unittest.TestCase):
    def test_development_secret_is_persistent_and_sessions_survive_restart(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            environment = {
                "CMS_ENV": "development",
                "CMS_DATA_DIR": str(root / "data"),
                "CMS_DATABASE_URL": f"sqlite:///{(root / 'data' / 'auth.db').as_posix()}",
            }
            with patch.dict(os.environ, environment, clear=True):
                first, secure = create_auth_service(root)
                issued = first.register(
                    username="restart-test",
                    password="correct-horse-battery",
                    display_name="重启测试",
                    remote_address="127.0.0.1",
                )
                second, second_secure = create_auth_service(root)

            self.assertFalse(secure)
            self.assertFalse(second_secure)
            self.assertTrue((root / "data" / ".auth-secret").is_file())
            self.assertIsNotNone(second.session(issued.session_token))

    def test_production_requires_secret_and_secure_cookie(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            database_url = f"sqlite:///{(root / 'auth.db').as_posix()}"
            with patch.dict(
                os.environ,
                {
                    "CMS_ENV": "production",
                    "CMS_DATA_DIR": str(root / "data"),
                    "CMS_DATABASE_URL": database_url,
                },
                clear=True,
            ):
                with self.assertRaisesRegex(RuntimeError, "CMS_AUTH_SECRET"):
                    create_auth_service(root)

            with patch.dict(
                os.environ,
                {
                    "CMS_ENV": "production",
                    "CMS_DATA_DIR": str(root / "data"),
                    "CMS_DATABASE_URL": database_url,
                    "CMS_AUTH_SECRET": "a-production-secret-with-at-least-32-bytes",
                    "CMS_COOKIE_SECURE": "false",
                },
                clear=True,
            ):
                with self.assertRaisesRegex(RuntimeError, "cannot be disabled"):
                    create_auth_service(root)

            with patch.dict(
                os.environ,
                {
                    "CMS_ENV": "production",
                    "CMS_DATA_DIR": str(root / "data"),
                    "CMS_DATABASE_URL": database_url,
                    "CMS_AUTH_SECRET": "a-production-secret-with-at-least-32-bytes",
                },
                clear=True,
            ):
                _service, secure = create_auth_service(root)
            self.assertTrue(secure)


if __name__ == "__main__":
    unittest.main()

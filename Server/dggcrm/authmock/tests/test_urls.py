import os
import subprocess
import sys

import pytest
from django.urls import NoReverseMatch, reverse


def test_mock_oauth_routes_disabled_by_default():
    with pytest.raises(NoReverseMatch, match="mock-discord_login"):
        reverse("mock-discord_login")


def test_mock_oauth_routes_enabled_in_local_settings():
    env = os.environ | {
        "DJANGO_SETTINGS_MODULE": "config.settings.local",
        "SECRET_KEY": "test-secret",
        "DATABASE_URL": "sqlite:///:memory:",
    }
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            ("import django; from django.urls import reverse; django.setup(); print(reverse('mock-discord_login'))"),
        ],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )

    assert result.stdout.strip().endswith("/accounts/mock-discord/login/")

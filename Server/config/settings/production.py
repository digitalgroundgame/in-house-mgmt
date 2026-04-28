# ruff: noqa: F403
import sentry_sdk

from .base import *

DEBUG = True  # TODO: Change

CORS_ALLOW_ALL_ORIGINS = False

CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = False  # TODO: Move to true

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[],
)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

ACCOUNT_SIGNUP_FIELDS = ["email*", "username*"]
ACCOUNT_EMAIL_VERIFICATION = "optional"

INSTALLED_APPS += [
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.discord",
]

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID"),
            "secret": env("GOOGLE_CLIENT_SECRET"),
            "key": "",
        },
        "SCOPE": ["openid", "email", "profile"],
        "AUTH_PARAMS": {
            "access_type": "online",
        },
    },
    "discord": {
        "APP": {
            "client_id": env("DISCORD_CLIENT_ID"),
            "secret": env("DISCORD_CLIENT_SECRET"),
            "key": "",
        },
        "SCOPE": ["identify", "email"],
    },
}

SITE_ID = 1
ACCOUNT_DEFAULT_HTTP_PROTOCOL = "https"

SENTRY_DSN = env("SENTRY_DSN", default="")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment="production",
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.2),
    )

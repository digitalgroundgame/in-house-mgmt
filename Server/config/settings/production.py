# ruff: noqa: F403


from .base import *

DEBUG = False

CORS_ALLOW_ALL_ORIGINS = False

CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = False  # TODO: Move to true

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

ACCOUNT_SIGNUP_FIELDS = ["email", "username"]
ACCOUNT_EMAIL_VERIFICATION = "optional"

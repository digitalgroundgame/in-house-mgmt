# ruff: noqa: F403
from .base import *

DEBUG = False

APPEND_SLASH = True

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CORS_ALLOW_ALL_ORIGINS = True

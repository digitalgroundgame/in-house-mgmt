"""
Base Django settings for dggcrm.

Shared across all environments.
"""

import os
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)

# Read .env if present
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# ------------------------------------------------------------------------------
# Core
# ------------------------------------------------------------------------------

SECRET_KEY = env("SECRET_KEY")

DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1"],
)

# ------------------------------------------------------------------------------
# Applications
# ------------------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "auditlog",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "health_check",
]

LOCAL_APPS = [
    "dggcrm.contacts",
    "dggcrm.tickets",
    "dggcrm.events",
    "dggcrm.accounts",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ------------------------------------------------------------------------------
# Middleware
# ------------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "auditlog.middleware.AuditlogMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

# ------------------------------------------------------------------------------
# URLs / Templates
# ------------------------------------------------------------------------------

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------

DATABASES = {
    "default": env.db("DATABASE_URL"),
}
DATABASES["default"]["ATOMIC_REQUESTS"] = True

# ------------------------------------------------------------------------------
# Auth / Allauth
# ------------------------------------------------------------------------------

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

ACCOUNT_LOGIN_METHODS = {"email", "username"}
ACCOUNT_SIGNUP_FIELDS = ["email", "username"]
ACCOUNT_EMAIL_VERIFICATION = "none"

ACCOUNT_ADAPTER = "dggcrm.accounts.adapters.NoNewUsersAccountAdapter"
SOCIALACCOUNT_ADAPTER = "dggcrm.accounts.adapters.SocialAccountAdapter"

LOGIN_URL = "/login"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/login?logout"

SOCIALACCOUNT_QUERY_EMAIL = True
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_REQUIRED = True
SOCIALACCOUNT_EMAIL_VERIFICATION = "optional"

# ------------------------------------------------------------------------------
# REST Framework
# ------------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    # "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
}

REST_AUTH = {
    "USER_DETAILS_SERIALIZER": "dggcrm.accounts.serializers.CustomUserDetailsSerializer",
}

# ------------------------------------------------------------------------------
# Password validation
# ------------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Static files
# ------------------------------------------------------------------------------

STATIC_URL = "django/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ------------------------------------------------------------------------------
# Proxy / forwarding
# ------------------------------------------------------------------------------

USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

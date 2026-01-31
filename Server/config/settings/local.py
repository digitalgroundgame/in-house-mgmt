from .base import *

DEBUG = True

ALLOWED_HOSTS += ["server", "inhouse_suite_server"]

CORS_ALLOW_ALL_ORIGINS = True

INSTALLED_APPS += [
    "dggcrm.authmock.apps.AuthMockConfig",
]

SOCIALACCOUNT_PROVIDERS = {
    "mock-google": {
        "APP": {
            "client_id": "mock-google",
            "secret": "google-secret",
            "key": "",
        },
        "SCOPE": ["openid", "email", "profile"],
    },
    "mock-discord": {
        "APP": {
            "client_id": "mock-discord",
            "secret": "discord-secret",
            "key": "",
        },
        "SCOPE": ["openid", "identify", "email"],
    },
}

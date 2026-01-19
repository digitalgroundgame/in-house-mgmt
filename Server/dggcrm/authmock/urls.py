# dggcrm/authmock/urls.py
from django.urls import path
from .mock import mock_google_login, mock_google_callback, mock_discord_login, mock_discord_callback

urlpatterns = [
    path("mock-google/login/", mock_google_login, name="mock-google_login"),
    path("mock-google/login/callback/", mock_google_callback, name="mock-google_callback"),
    path("mock-discord/login/", mock_discord_login, name="mock-discord_login"),
    path("mock-discord/login/callback/", mock_discord_callback, name="mock-discord_callback"),
]

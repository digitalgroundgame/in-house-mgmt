import requests
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider
from allauth.socialaccount.providers.oauth2.views import OAuth2Adapter, OAuth2LoginView, OAuth2CallbackView


class BaseMockOAuth2Adapter(OAuth2Adapter):
    """
    Base adapter for mock OAuth2 providers.
    Subclasses should define `provider_id`, `authorize_url`, `access_token_url`, `profile_url`.
    """

    def complete_login(self, request, app, token, **kwargs):
        # Fetch user info from the mock provider
        resp = requests.get(
            self.profile_url,
            headers={"Authorization": f"Bearer {token.token}"},
            timeout=5,
        )
        resp.raise_for_status()
        extra_data = resp.json()
        print(f"USER INFO ({self.provider_id})", extra_data, flush=True)
        return self.get_provider().sociallogin_from_response(request, extra_data)


class MockGoogleOAuth2Adapter(BaseMockOAuth2Adapter):
    provider_id = "mock-google"
    authorize_url = "http://localhost:9000/mock-google/authorize"
    access_token_url = "http://mock_oauth:9000/mock-google/token"
    profile_url = "http://mock_oauth:9000/mock-google/userinfo"


class MockDiscordOAuth2Adapter(BaseMockOAuth2Adapter):
    provider_id = "mock-discord"
    authorize_url = "http://localhost:9000/mock-discord/authorize"
    access_token_url = "http://mock_oauth:9000/mock-discord/token"
    profile_url = "http://mock_oauth:9000/mock-discord/userinfo"


# Providers
class MockGoogleProvider(OAuth2Provider):
    id = "mock-google"
    name = "Mock Google"
    adapter_class = MockGoogleOAuth2Adapter

    def extract_uid(self, data):
        return data.get("sub")

    def extract_common_fields(self, data):
        return {
            "email": data.get("email"),
            "first_name": data.get("name"),
        }


class MockDiscordProvider(OAuth2Provider):
    id = "mock-discord"
    name = "Mock Discord"
    adapter_class = MockDiscordOAuth2Adapter

    def extract_uid(self, data):
        return data.get("sub")

    def extract_common_fields(self, data):
        return {
            "email": data.get("email"),
            "first_name": data.get("username"),
        }


# Views
mock_google_login = OAuth2LoginView.adapter_view(MockGoogleOAuth2Adapter)
mock_google_callback = OAuth2CallbackView.adapter_view(MockGoogleOAuth2Adapter)

mock_discord_login = OAuth2LoginView.adapter_view(MockDiscordOAuth2Adapter)
mock_discord_callback = OAuth2CallbackView.adapter_view(MockDiscordOAuth2Adapter)

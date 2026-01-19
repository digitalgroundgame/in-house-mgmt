from django.apps import AppConfig

class AuthMockConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dggcrm.authmock"

    def ready(self):
        print("AuthMock ready: registering mock providers")
        from .mock import MockGoogleProvider, MockGoogleOAuth2Adapter, MockDiscordProvider, MockDiscordOAuth2Adapter
        from allauth.socialaccount import providers

        MockGoogleProvider.oauth2_adapter_class = MockGoogleOAuth2Adapter
        MockDiscordProvider.oauth2_adapter_class = MockDiscordOAuth2Adapter

        # Register the mock provider with allauth
        providers.registry.register(MockGoogleProvider)
        providers.registry.register(MockDiscordProvider)

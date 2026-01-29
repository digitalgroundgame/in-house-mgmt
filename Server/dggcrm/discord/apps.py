from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class DiscordConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dggcrm.discord"
    verbose_name = "Discord Integration"

    def ready(self):
        from . import client
        client.initialize()

from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dggcrm.events"
    verbose_name = "CRM.events"

    def ready(self):
        from auditlog.registry import auditlog

        from .models import EventParticipation

        auditlog.register(EventParticipation)

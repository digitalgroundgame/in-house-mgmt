from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class DiscordID(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="discord_ids",
    )
    discord_id = models.CharField(max_length=64, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Discord IDs"

    def __str__(self):
        return f"{self.discord_id} ({self.user})"


class UserPreferences(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences",
        primary_key=True,
    )
    timezone = models.CharField(max_length=50, default="", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Preferences"

    def __str__(self):
        return f"Preferences for {self.user}"

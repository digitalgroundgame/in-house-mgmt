from django.contrib import admin

from .models import DiscordID


class DiscordIDAdmin(admin.ModelAdmin):
    list_display = ["discord_id", "user", "active"]
    list_filter = ["active"]
    search_fields = ["discord_id", "user__username", "user__email"]
    ordering = ["discord_id"]


admin.site.register(DiscordID, DiscordIDAdmin)

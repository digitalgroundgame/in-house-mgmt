from rest_framework.permissions import BasePermission

from dggcrm.accounts.models import DiscordID

DISCORD_BOT_GROUP = "DISCORD_BOT"


class CanRecordAttendance(BasePermission):
    """
    Two-layer check for the Discord attendance endpoint.

    1. The caller (bound to the request token/session) must be the bot
       service account or a superuser — keeps a non-bot token holder
       from impersonating the bot.
    2. The Discord user named as `event_tracker` in the body must be
       linked via DiscordID (active=True) to a CRM user that holds
       `events.record_attendance`. This is the per-user authorization
       the bot is acting on behalf of.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        is_bot_or_admin = user.is_superuser or user.groups.filter(name=DISCORD_BOT_GROUP).exists()
        if not is_bot_or_admin:
            return False

        tracker_id = request.data.get("event_tracker")
        if not tracker_id:
            return False

        try:
            link = DiscordID.objects.select_related("user").get(discord_id=tracker_id, active=True)
        except DiscordID.DoesNotExist:
            return False

        return link.user.has_perm("events.record_attendance")

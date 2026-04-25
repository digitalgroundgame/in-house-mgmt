from rest_framework.permissions import BasePermission

from dggcrm.accounts.models import DiscordID

DISCORD_BOT_GROUP = "DISCORD_BOT"

# Reason codes returned by check_record_attendance_permission. Stable strings
# the bot can switch on to render user-facing messages.
REASON_OK = "ok"
REASON_MISSING_TRACKER = "missing_tracker"
REASON_UNLINKED_DISCORD_ID = "unlinked_discord_id"
REASON_NOT_AUTHORIZED = "not_authorized"


def check_record_attendance_permission(tracker_discord_id: str) -> tuple[bool, str]:
    """
    Decide whether the Discord user identified by tracker_discord_id is allowed
    to record attendance.

    Returns (authorized, reason_code) so callers can render specific feedback
    instead of just rejecting with a generic 403.
    """
    if not tracker_discord_id:
        return False, REASON_MISSING_TRACKER

    try:
        link = DiscordID.objects.select_related("user").get(discord_id=tracker_discord_id, active=True)
    except DiscordID.DoesNotExist:
        return False, REASON_UNLINKED_DISCORD_ID

    if not link.user.has_perm("events.record_attendance"):
        return False, REASON_NOT_AUTHORIZED

    return True, REASON_OK


def is_bot_caller(user) -> bool:
    """The request principal must be the bot service account or a superuser."""
    if not user.is_authenticated:
        return False
    return user.is_superuser or user.groups.filter(name=DISCORD_BOT_GROUP).exists()


class IsBotCaller(BasePermission):
    """
    Caller (bound to the request token/session) must be the bot service
    account or a superuser. Used by endpoints that the bot calls on
    behalf of a Discord user but where the per-user authorization is
    the response payload, not a precondition.
    """

    def has_permission(self, request, view):
        return is_bot_caller(request.user)


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
        if not is_bot_caller(request.user):
            return False
        authorized, _ = check_record_attendance_permission(request.data.get("event_tracker"))
        return authorized

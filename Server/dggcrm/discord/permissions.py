from rest_framework.permissions import BasePermission

DISCORD_BOT_GROUP = "DISCORD_BOT"


class IsAdminOrDiscordBot(BasePermission):
    """
    Allows access to superusers or users in the DISCORD_BOT group.

    Uses `is_superuser` rather than `is_staff` intentionally: this endpoint
    is for trusted service accounts + top-level admins only, not for anyone
    with Django-admin-site access.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(name=DISCORD_BOT_GROUP).exists()

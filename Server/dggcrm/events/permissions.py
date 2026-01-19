from rest_framework.permissions import BasePermission

class CanViewEvent(BasePermission):
    """View event if assigned or has view_event"""
    def has_object_permission(self, request, view, event):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if user.has_perm("events.view_event"):
            return True
        return user in event.assigned_users.all()  # assuming a many-to-many of assigned users


class CanEditEvent(BasePermission):
    """Edit event if user has change_event"""
    def has_object_permission(self, request, view, event):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.has_perm("events.change_event")


class CanAddUsersToEvent(BasePermission):
    """Add users to event if user has assign_users_to_event"""
    def has_object_permission(self, request, view, event):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.has_perm("events.assign_users_to_event")

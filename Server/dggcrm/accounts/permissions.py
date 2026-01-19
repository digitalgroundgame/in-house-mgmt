from rest_framework.permissions import BasePermission

class CanSetUserRole(BasePermission):
    """
    Allows updating another user's access level if:
    - user has set_user_role
    - cannot update Admins (enforced in business logic)
    """
    def has_object_permission(self, request, view, obj_user):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if not user.has_perm("users.set_user_role"):
            return False
        if obj_user.is_admin:  # or is_staff
            return False
        return True

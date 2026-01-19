from rest_framework.permissions import BasePermission

class CanViewContact(BasePermission):
    """
    View a contact if:
    - user has view_all_contacts (admin)
    - OR user is assigned to a ticket associated with that contact
    """
    def has_object_permission(self, request, view, contact):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if user.has_perm("contacts.view_all_contacts"):
            return True
        # check tickets associated with this contact
        # TODO: Update to check ticket status
        return contact.tickets.filter(assigned_to=user).exists()


class CanEditContact(BasePermission):
    """
    Edit a contact if:
    - user has change_contact
    - OR user is assigned to a ticket associated with this contact
    """
    def has_object_permission(self, request, view, contact):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if user.has_perm("contacts.change_contact"):
            return True
        # TODO: Limit what fields a user can edit
        return contact.tickets.filter(assigned_to=user).exists()

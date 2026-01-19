# tickets/permissions.py
from rest_framework.permissions import BasePermission

class CanViewTicket(BasePermission):
    """
    Allows viewing a ticket if:
    - user has view_ticket (Django permission)
    OR
    - user is assigned to the ticket
    """

    def has_object_permission(self, request, view, ticket):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if user.has_perm("tickets.view_ticket"):
            return True

        if ticket.assigned_to_id == user.id:
            return True


class CanChangeTicket(BasePermission):
    """
    Allows editing a ticket if:
    - user has change_ticket
    OR
    - user is assigned to the ticket (if you allow limited editing)
    """

    def has_object_permission(self, request, view, ticket):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if user.has_perm("tickets.change_ticket"):
            return True

        # Optional: allow assigned users to update certain fields
        return ticket.assigned_to_id == user.id


class CanCommentTicket(BasePermission):
    """
    Allows commenting on a ticket if:
    - user has add_ticketcomment
    AND
    - user is assigned OR has comment_any_ticket
    """

    def has_object_permission(self, request, view, ticket):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not user.has_perm("tickets.add_ticketcomment"):
            return False

        if user.has_perm("tickets.comment_any_ticket"):
            return True

        return ticket.assigned_to_id == user.id


class CanEditTicketComment(BasePermission):
    """Allows editing a comment if:
    - user has change_ticketcomment
    - OR user is the author
    """
    def has_object_permission(self, request, view, comment):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if user.has_perm("tickets.change_ticketcomment"):
            return True

        return comment.author_id == user.id


class CanClaimTicket(BasePermission):
    """Allows claiming a ticket if user has claim_ticket OR admin-level change_ticket"""
    def has_object_permission(self, request, view, ticket):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if user.has_perm("tickets.claim_ticket") or user.has_perm("tickets.change_ticket"):
            return True
        return False


class CanAssignTicket(BasePermission):
    """Allows assigning a ticket to someone else if user has assign_ticket"""
    def has_object_permission(self, request, view, ticket):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return user.has_perm("tickets.assign_ticket")

from django.db.models import Q
from rest_framework.permissions import SAFE_METHODS, BasePermission


def get_ticket_visibility_filter(user):
    if user.is_superuser or user.has_perm("tickets.view_all_tickets"):
        return Q()

    q = Q()

    # Tickets assigned directly to the user
    q |= Q(assigned_to=user)

    # Tickets tied to events the user is assigned to
    if user.has_perm("tickets.view_tickets_via_event"):
        q |= Q(
            event__users__user=user,
        )

    return q


class TicketObjectPermission(BasePermission):
    def has_object_permission(self, request, view, ticket):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        is_read = request.method in SAFE_METHODS

        if is_read:
            if not user.has_perm("tickets.view_ticket"):
                return False

            if user.has_perm("tickets.view_all_tickets"):
                return True

            if ticket.assigned_to_id == user.id:
                return True

            if (
                user.has_perm("tickets.view_tickets_via_event")
                and ticket.event
                and ticket.event.users.filter(user=user).exists()
            ):
                return True

            return False

        if user.has_perm("tickets.change_ticket"):
            return True

        if user.has_perm("tickets.assign_ticket"):
            return True

        if user.has_perm("tickets.change_status"):
            return True

        return False


class TicketClaimPermission(BasePermission):
    message = "You do not have permission to claim or unclaim this ticket."

    def has_object_permission(self, request, view, ticket):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        # CLAIM
        if request.method == "POST":
            if not user.has_perm("tickets.claim_ticket"):
                return False

            # Cannot claim an already claimed ticket
            return ticket.assigned_to is None

        # UNCLAIM
        if request.method == "DELETE":
            if not user.has_perm("tickets.unclaim_ticket"):
                return False

            # Users that can assign any ticket can unclaim any ticket
            if user.has_perm("tickets.assign_ticket"):
                return True

            # Can only unclaim your own ticket
            return ticket.assigned_to_id == user.id

        return False


class CanCommentOnTicketPermission(BasePermission):
    message = "You do not have permission to comment on this ticket."

    def has_object_permission(self, request, view, ticket):
        user = request.user

        if not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        # Global comment permission (Organizer / Admin)
        if user.has_perm("tickets.add_any_comment"):
            return True

        # Assigned-only commenting
        if user.has_perm("tickets.add_ticketcomment"):
            return ticket.assigned_to_id == user.id

        return False


def can_assign_ticket(user):
    if user.is_superuser:
        return True

    return user.has_perm("tickets.assign_ticket")


def can_change_ticket_status(user, ticket):
    if user.is_superuser:
        return True

    if not user.has_perm("tickets.change_status"):
        return False

    if user.has_perm("tickets.change_all_statuses"):
        return True

    return ticket.assigned_to_id == user.id


class CanAssignTicketPermission(BasePermission):
    message = "You do not have permission to assign this ticket."

    def has_object_permission(self, request, view, ticket):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return user.has_perm("tickets.assign_ticket")


class CanChangeTicketStatusPermission(BasePermission):
    message = "You do not have permission to change this ticket's status."

    def has_object_permission(self, request, view, ticket):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not user.has_perm("tickets.change_status"):
            return False

        if user.has_perm("tickets.change_all_statuses"):
            return True

        return ticket.assigned_to_id == user.id

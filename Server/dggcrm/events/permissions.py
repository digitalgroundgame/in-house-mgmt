from django.db.models import Q
from rest_framework.permissions import SAFE_METHODS, BasePermission

from dggcrm.contacts.permissions import ContactObjectPermission
from dggcrm.events.models import EventStatus
from dggcrm.tickets.models import Ticket, TicketStatus


def get_event_visibility_filter(user):
    if user.is_superuser or user.has_perm("events.view_all_events"):
        return Q()

    q = Q(users__user=user)

    # Limit to only scheduled events
    if not user.has_perm("events.view_any_assigned_event"):
        q &= Q(
            event_status=EventStatus.SCHEDULED,
        )

    return q


class EventObjectPermission(BasePermission):
    """
    Unified object-level permission for Events.
    """

    def has_object_permission(self, request, view, event):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Superuser bypass
        if user.is_superuser:
            return True

        is_read = request.method in SAFE_METHODS

        # ---------- READ ----------
        if is_read:
            # Must have base read capability
            if not user.has_perm("events.view_event"):
                return False

            # Global read
            if user.has_perm("events.view_all_events"):
                return True

            if event.event_status == EventStatus.SCHEDULED:
                return True

            # Assigned event read
            if user.has_perm("events.view_any_assigned_event"):
                return event.users.filter(user=user).exists()

            return False

        # ---------- WRITE ----------
        if not user.has_perm("events.change_event"):
            return False

        # Global edit
        if user.has_perm("events.change_all_events"):
            return True

        # Assigned edit
        if user.has_perm("events.change_assigned_event"):
            return event.users.filter(user=user).exists()

        return False


def get_participation_visibility_filter(user):
    if user.is_superuser or user.has_perm("events.view_all_participations"):
        return Q()

    q = Q()

    # Participations for events user is assigned to
    if user.has_perm("events.view_any_assigned_event"):
        q |= Q(
            event__users__user=user,
        )
    else:
        q |= Q(
            event__users__user=user,
            event__event_status=EventStatus.SCHEDULED,
        )

    # Participations tied to tickets assigned to the user
    q |= Q(
        contact__tickets__assigned_to=user,
        contact__tickets__ticket_status=TicketStatus.INPROGRESS,
    )

    return q


class ParticipationObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Admin bypass
        if user.is_superuser:
            return True

        event = obj.event
        contact = obj.contact

        # Read allowed
        if request.method in SAFE_METHODS:
            if not user.has_perm("events.view_eventparticipation"):
                return False

            if user.has_perm("events.view_all_participations"):
                return True

            if ContactObjectPermission().has_object_permission(request, view, contact):
                return True

            return EventObjectPermission().has_object_permission(request, view, event)

        if not user.has_perm("events.change_eventparticipation"):
            return False

        # Global participation management
        if user.has_perm("events.change_all_participations"):
            return True

        # Assigned via ticket
        if (
            user.has_perm("events.change_participation_via_ticket")
            and Ticket.objects.filter(
                assigned_to=request.user,
                contact=contact,
                event=event,
                ticket_status=TicketStatus.INPROGRESS,
            ).exists()
        ):
            return True

        # Assigned via event
        if user.has_perm("events.change_participation_via_event") and event.users.filter(user=request.user).exists():
            return True

        return False


def get_event_membership_visibility_filter(user):
    # Superuser or global read
    if user.is_superuser or user.has_perm("events.view_all_usersinevents"):
        return Q()

    q = Q()

    # Can always read your own memberships
    q |= Q(user=user)

    # Can read memberships for events you're assigned to
    if user.has_perm("events.view_usersinevent_via_event"):
        q |= Q(event__users__user=user)

    return q


class EventMembershipObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Admin bypass
        if user.is_superuser:
            return True

        event = obj.event

        # Read allowed
        if request.method in SAFE_METHODS:
            if not user.has_perm("events.view_usersinevent"):
                return False

            if user.has_perm("events.view_all_usersinevents"):
                return True

            # Can always read your own participations
            if obj.user == user:
                return True

            return user.has_perm("events.view_usersinevent_via_event") and event.users.filter(user=user)

        if not user.has_perm("events.change_usersinevent"):
            return False

        # Global membership management
        if user.has_perm("events.change_all_usersinevents"):
            return True

        # Assigned event management
        if user.has_perm("events.change_usersinevent_via_event") and event.users.filter(user=user).exists():
            return True

        return False

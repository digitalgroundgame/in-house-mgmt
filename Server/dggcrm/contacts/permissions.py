from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.db.models import Q

from dggcrm.tickets.models import TicketStatus
from dggcrm.events.models import EventStatus

# Filters out contacts a user is not permitted to see
def get_contact_visibility_filter(user):
    if user.is_superuser or user.has_perm("contacts.view_all_contacts"):
        return Q()

    q = Q()

    # Contacts that participated in events the user is assigned to
    if user.has_perm("contacts.view_contacts_via_event"):
        q |= Q(
            event_participations__event__users__user=user,
            event_participations__event__event_status=EventStatus.SCHEDULED,
        )

    # Contacts with tickets assigned to the user
    q |= Q(
        tickets__assigned_to=user,
        tickets__ticket_status=TicketStatus.INPROGRESS
    )

    return q


class ContactObjectPermission(BasePermission):
    """
    Unified object-level permission for Contacts.
    Handles both read and write based on HTTP method.
    """

    def has_object_permission(self, request, view, contact):
        user = request.user
        if not user.is_authenticated:
            return False

        # Superusers bypass everything
        if user.is_superuser:
            return True

        is_read = request.method in SAFE_METHODS

        if is_read:
            # Must have base read capability
            if not user.has_perm("contacts.view_contact"):
                return False

            # Global read access
            if user.has_perm("contacts.view_all_contacts"):
                return True

            # Event-scoped read access
            if (
                user.has_perm("contacts.view_contacts_via_event")
                and contact.event_participations.filter(
                    event__users__user=user,
                    event__event_status=EventStatus.SCHEDULED,
                ).exists()
            ):
                return True

            # Ticket-scoped read access
            return contact.tickets.filter(
                assigned_to=user,
                ticket_status=TicketStatus.INPROGRESS,
            ).exists()

        # Must have base edit capability
        if not user.has_perm("contacts.change_contact"):
            return False

        # Global edit access
        if user.has_perm("contacts.change_all_contacts"):
            return True

        # Ticket-scoped edit access
        if user.has_perm("contacts.change_contacts_via_ticket"):
            return contact.tickets.filter(
                assigned_to=user,
                ticket_status=TicketStatus.INPROGRESS,
            ).exists()

        return False


class CanModifyTagAssignment(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        # Admin bypass
        if user.is_superuser:
            return True

        # Only enforce for GET
        if request.method in SAFE_METHODS:
            return True

        # Determine the contact
        contact = getattr(obj, "contact", None) or request.data.get("contact_id")
        if contact is None:
            return False

        if isinstance(contact, int):
            contact = Contact.objects.filter(pk=contact).first()
            if not contact:
                return False

        # Assigned tickets allow updating of tags
        return contact.tickets.filter(
            assigned_to=user,
            ticket_status=TicketStatus.INPROGRESS,
        ).exists()

import pytest
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from django.db.models import Q

from dggcrm.contacts.permissions import (
    ContactObjectPermission,
    CanModifyTagAssignment,
)
from dggcrm.contacts.permissions import get_contact_visibility_filter
from dggcrm.contacts.models import Contact, TagAssignments
from dggcrm.tickets.models import TicketStatus

factory = APIRequestFactory()

# Extensively testing all permissions for the contact module
# Please do not modify this file without properly understanding the implications

@pytest.mark.django_db
class TestGetContactVisibilityFilter:
    def test_superuser_sees_all(self, admin_user):
        filters = get_contact_visibility_filter(admin_user)
        # Superuser should return no filter (i.e., sees all)
        assert filters == Q()

    def test_regular_user_no_permissions_sees_only_ticket_scoped(self, regular_user, ticket, contact):
        # User without any global or event permissions can still see ticket-assigned contacts
        ticket.assigned_to = regular_user
        ticket.save()

        filters = get_contact_visibility_filter(regular_user)
        qs = Contact.objects.filter(filters)
        assert contact in qs

    def test_user_with_view_all_contacts(self, regular_user, view_all_contacts_permission):
        # view_all_contacts permission grants viewing all contacts
        regular_user.user_permissions.add(view_all_contacts_permission)

        filters = get_contact_visibility_filter(regular_user)
        assert filters == Q()

    def test_ticket_scoped_visibility(self, regular_user, contact, ticket):
        # Always can see contacts associated with claimed tickets
        ticket.assigned_to = regular_user
        ticket.save()

        filters = get_contact_visibility_filter(regular_user)
        # The user is assigned to a ticket for this contact
        assert Contact.objects.filter(filters).first() == contact

    def test_event_closed_no_visibility(self, regular_user, contact, participation, user_in_event2, view_event_contacts_permission):
        # Can always view contacts associated with user joined events
        regular_user.user_permissions.add(view_event_contacts_permission)

        filters = get_contact_visibility_filter(regular_user)
        qs = Contact.objects.filter(filters)
        assert contact not in qs

    def test_event_scoped_visibility(self, regular_user, contact, participation, user_in_event, view_event_contacts_permission):
        # Can always view contacts associated with user joined events
        regular_user.user_permissions.add(view_event_contacts_permission)

        filters = get_contact_visibility_filter(regular_user)
        qs = Contact.objects.filter(filters)
        assert contact in qs


@pytest.mark.django_db
class TestContactObjectPermission:
    def test_superuser_bypass(self, admin_user, contact):
        # Super uses can do all
        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        request.user = admin_user
        assert perm.has_object_permission(request, None, contact) is True

    def test_unauthenticated(self, contact):
        # Unauthenticated users can not see anything
        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        assert perm.has_object_permission(request, None, contact) is False

    def test_read_without_perms_denied(self, regular_user, contact):
        # Must explicitly grant users the ability to read contacts
        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is False

    def test_read_with_global_permission(self, regular_user, contact, view_contact_permission, view_all_contacts_permission):
        # Permissions for reading all contacts
        regular_user.user_permissions.add(
            view_contact_permission,
            view_all_contacts_permission,
        )
        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is True

    def test_read_ticket_scoped_permission(self, regular_user, contact, ticket, view_contact_permission):
        # Verify that tickets grant user the ability to view associated contacts
        regular_user.user_permissions.add(view_contact_permission)

        ticket.assigned_to = regular_user
        ticket.save()

        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is True

    def test_edit_without_perms_denied(self, regular_user, contact, ticket, view_contact_permission):
        # Missing change_contact perms, so deny edits even with contact permission
        regular_user.user_permissions.add(view_contact_permission)

        ticket.assigned_to = regular_user
        ticket.save()

        perm = ContactObjectPermission()
        request = Request(factory.put("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is False

    def test_edit_without_ticket_denied(self, regular_user, contact, view_contact_permission, change_contact_permission):
        # Must have a ticket in order to view contact
        regular_user.user_permissions.add(view_contact_permission, change_contact_permission)
        perm = ContactObjectPermission()
        request = Request(factory.put("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is False

    def test_edit_ticket_scoped_permission(self, regular_user, contact, ticket, edit_ticket_contact_permission, change_contact_permission):
        # Must have special permissions to edit a contact associated with a ticket
        regular_user.user_permissions.add(change_contact_permission, edit_ticket_contact_permission)

        ticket.assigned_to = regular_user
        ticket.save()

        perm = ContactObjectPermission()
        request = Request(factory.put("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is True

    def test_edit_ticket_status_permission(self, regular_user, contact, ticket, edit_ticket_contact_permission, change_contact_permission):
        # Tests that contact edit by ticket permissions only apply if the ticket is open
        regular_user.user_permissions.add(change_contact_permission, edit_ticket_contact_permission)

        ticket.assigned_to = regular_user
        ticket.ticket_status = TicketStatus.COMPLETED
        ticket.save()

        perm = ContactObjectPermission()
        request = Request(factory.put("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is False

    def test_edit_change_all_contacts(self, regular_user, contact, ticket, change_contact_permission, change_all_contacts_permission):
        # Verify that change_all_contacts allows changing all contacts
        regular_user.user_permissions.add(
            change_contact_permission,
            change_all_contacts_permission
        )

        perm = ContactObjectPermission()
        request = Request(factory.put("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is True

    def test_closed_event_no_permission(self, regular_user, contact, participation, user_in_event2, view_contact_permission, view_event_contacts_permission):
        # Closed events do not grant permission
        regular_user.user_permissions.add(view_contact_permission, view_event_contacts_permission)

        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is False

    def test_read_event_scoped_permission(self, regular_user, contact, participation, user_in_event, view_contact_permission, view_event_contacts_permission):
        # Give event-scoped permission
        regular_user.user_permissions.add(view_contact_permission, view_event_contacts_permission)

        perm = ContactObjectPermission()
        request = Request(factory.get("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is True

    def test_edit_event_scoped_denied(self, regular_user, contact, participation, user_in_event, view_contact_permission, view_event_contacts_permission):
        # Give event-scoped permission
        regular_user.user_permissions.add(view_contact_permission, view_event_contacts_permission)

        perm = ContactObjectPermission()
        request = Request(factory.put("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, contact) is False


@pytest.mark.django_db
class TestCanModifyTagAssignmentPermission:
    def test_superuser_can_add_and_remove(self, admin_user, contact, tag_assignment):
        # Super can do anything they want
        perm = CanModifyTagAssignment()

        # POST request
        request = Request(factory.post("/"))
        request.user = admin_user
        assert perm.has_object_permission(request, None, tag_assignment) is True

        # DELETE request
        request = Request(factory.delete("/"))
        request.user = admin_user
        assert perm.has_object_permission(request, None, tag_assignment) is True

    def test_user_without_ticket_cannot_add_or_remove(self, regular_user, contact, tag_assignment):
        # Limit tag assignment modification for regular users to limit by ticket assignment
        perm = CanModifyTagAssignment()

        request = Request(factory.post("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, tag_assignment) is False

        request = Request(factory.delete("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, tag_assignment) is False

    def test_user_with_closed_ticket_cannot_add(
        self, regular_user, contact, ticket, tag_assignment, change_contact_permission
    ):
        # Ticket assignment still requires general change contact perms
        perm = CanModifyTagAssignment()

        ticket.assigned_to = regular_user
        ticket.ticket_status = TicketStatus.COMPLETED
        ticket.save()

        # User has no object permission yet
        request = Request(factory.post("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, tag_assignment) is False

    def test_user_with_ticket_and_object_permission_can_add(
        self, regular_user, contact, ticket, tag_assignment,
    ):
        # Users with assigned ticket + contact change perms can update tag assignments
        perm = CanModifyTagAssignment()

        ticket.assigned_to = regular_user
        ticket.save()

        request = Request(factory.post("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, tag_assignment) is True

        request = Request(factory.delete("/"))
        request.user = regular_user
        assert perm.has_object_permission(request, None, tag_assignment) is True

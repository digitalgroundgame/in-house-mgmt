import pytest
from rest_framework.test import APIRequestFactory
from django.db.models import Q

from dggcrm.tickets.models import Ticket
from dggcrm.tickets.permissions import get_ticket_visibility_filter
from dggcrm.tickets.permissions import TicketObjectPermission

@pytest.mark.django_db
class TestTicketVisibilityFilter:
    def test_visibility_superuser(self, admin_user):
        assert get_ticket_visibility_filter(admin_user) == Q()


    def test_visibility_view_all(self, regular_user, view_all_tickets_permission):
        regular_user.user_permissions.add(view_all_tickets_permission)
        assert get_ticket_visibility_filter(regular_user) == Q()


    def test_visibility_assigned_only(self, regular_user, assigned_ticket, unassigned_ticket):
        filters = get_ticket_visibility_filter(regular_user)
        qs = Ticket.objects.filter(filters)

        assert assigned_ticket in qs
        assert unassigned_ticket not in qs


    def test_visibility_via_event(
        self,
        rf,
        regular_user,
        unassigned_ticket,
        scheduled_event,
        assigned_scheduled_event,
        view_ticket_permission,
        view_tickets_via_event_permission,
    ):
        unassigned_ticket.event = scheduled_event
        unassigned_ticket.save()

        regular_user.user_permissions.add(
            view_ticket_permission,
            view_tickets_via_event_permission,
        )

        filters = get_ticket_visibility_filter(regular_user)
        qs = Ticket.objects.filter(filters)

        assert unassigned_ticket in qs

@pytest.mark.django_db
class TestTicketObjectPermission:
    def test_unauthenticated_denied(self, rf, assigned_ticket):
        request = rf.get("/")
        request.user = None

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, assigned_ticket) is False


    def test_superuser(self, rf, admin_user, assigned_ticket):
        request = rf.get("/")
        request.user = admin_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, assigned_ticket) is True


    def test_see_all_tickets(
        self, rf, regular_user, unassigned_ticket, view_ticket_permission, view_all_tickets_permission
    ):
        regular_user.user_permissions.add(view_ticket_permission, view_all_tickets_permission)

        request = rf.get("/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, unassigned_ticket) is True


    @pytest.mark.parametrize("method", ["GET", "HEAD"])
    def test_read_requires_view_permission(
        self, rf, regular_user, assigned_ticket, method
    ):
        request = rf.generic(method, "/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, assigned_ticket) is False


    def test_read_assigned_ticket_allowed(
        self,
        rf,
        regular_user,
        assigned_ticket,
        view_ticket_permission,
    ):
        regular_user.user_permissions.add(view_ticket_permission)

        request = rf.get("/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, assigned_ticket) is True


    def test_read_via_event_allowed(
        self,
        rf,
        regular_user,
        unassigned_ticket,
        scheduled_event,
        assigned_scheduled_event,
        view_ticket_permission,
        view_tickets_via_event_permission,
    ):
        unassigned_ticket.event = scheduled_event
        unassigned_ticket.save()

        regular_user.user_permissions.add(
            view_ticket_permission,
            view_tickets_via_event_permission,
        )

        request = rf.get("/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, unassigned_ticket) is True

    def test_read_default_denied(
        self,
        rf,
        regular_user,
        unassigned_ticket,
        scheduled_event,
        assigned_scheduled_event,
        view_ticket_permission,
    ):
        unassigned_ticket.event = scheduled_event
        unassigned_ticket.save()

        regular_user.user_permissions.add(
            view_ticket_permission,
        )

        request = rf.get("/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, unassigned_ticket) is False


    def test_write_requires_change_permission(
        self,
        rf,
        regular_user,
        assigned_ticket,
    ):
        request = rf.put("/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, assigned_ticket) is False


    def test_write_allowed_with_change_permission(
        self,
        rf,
        regular_user,
        assigned_ticket,
        change_ticket_permission,
    ):
        regular_user.user_permissions.add(change_ticket_permission)

        request = rf.put("/")
        request.user = regular_user

        perm = TicketObjectPermission()
        assert perm.has_object_permission(request, None, assigned_ticket) is True

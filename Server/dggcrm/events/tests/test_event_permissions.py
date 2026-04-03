import pytest
from django.db.models import Q
from rest_framework.test import APIRequestFactory

from dggcrm.events.models import Event
from dggcrm.events.permissions import EventObjectPermission, get_event_visibility_filter


@pytest.mark.django_db
class TestGetEventVisibilityFilter:
    def test_superuser_sees_all(self, admin_user):
        filters = get_event_visibility_filter(admin_user)
        assert filters == Q()

    def test_user_with_view_all_events_sees_all(
        self,
        regular_user,
        view_all_events_permission,
        scheduled_event,
        completed_event,
    ):
        regular_user.user_permissions.add(view_all_events_permission)

        filters = get_event_visibility_filter(regular_user)
        qs = Event.objects.filter(filters)

        assert scheduled_event in qs
        assert completed_event in qs

    def test_user_without_permissions_sees_only_assigned_scheduled_events(
        self,
        regular_user,
        scheduled_event,
        completed_event,
        assigned_scheduled_event,
        assigned_completed_event,
    ):
        filters = get_event_visibility_filter(regular_user)
        qs = Event.objects.filter(filters)

        assert scheduled_event in qs
        assert completed_event not in qs

    def test_user_with_view_any_assigned_events_sees_all_assigned_events(
        self,
        regular_user,
        view_any_assigned_event_permission,
        scheduled_event,
        completed_event,
        assigned_scheduled_event,
        assigned_completed_event,
    ):
        regular_user.user_permissions.add(view_any_assigned_event_permission)

        filters = get_event_visibility_filter(regular_user)
        qs = Event.objects.filter(filters)

        assert scheduled_event in qs
        assert completed_event in qs

    def test_user_sees_only_their_assigned_events(
        self,
        regular_user,
        scheduled_event,
    ):
        # Event exists but user is not assigned
        filters = get_event_visibility_filter(regular_user)
        qs = Event.objects.filter(filters)

        assert scheduled_event not in qs


@pytest.mark.django_db
class TestEventObjectPermission:
    # --------------------
    # Helpers
    # --------------------
    @pytest.fixture
    def rf(self):
        return APIRequestFactory()

    def get(self, rf, user):
        request = rf.get("/")
        request.user = user
        return request

    def patch(self, rf, user):
        request = rf.patch("/")
        request.user = user
        return request

    # --------------------
    # Auth / Superuser
    # --------------------
    def test_unauthenticated_denied(self, rf, scheduled_event):
        request = rf.get("/")
        request.user = None

        perm = EventObjectPermission()
        assert perm.has_object_permission(request, None, scheduled_event) is False

    def test_superuser_allowed_for_read_and_write(
        self,
        rf,
        admin_user,
        completed_event,
    ):
        perm = EventObjectPermission()

        assert perm.has_object_permission(self.get(rf, admin_user), None, completed_event)
        assert perm.has_object_permission(self.patch(rf, admin_user), None, completed_event)

    # --------------------
    # READ
    # --------------------
    def test_read_requires_view_event_permission(
        self,
        rf,
        regular_user,
        scheduled_event,
    ):
        perm = EventObjectPermission()

        assert perm.has_object_permission(self.get(rf, regular_user), None, scheduled_event) is False

    def test_view_all_events_can_read_any_status(
        self,
        rf,
        regular_user,
        view_event_permission,
        view_all_events_permission,
        completed_event,
    ):
        regular_user.user_permissions.add(
            view_event_permission,
            view_all_events_permission,
        )

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.get(rf, regular_user), None, completed_event)

    def test_scheduled_event_readable_without_assignment(
        self,
        rf,
        regular_user,
        view_event_permission,
        scheduled_event,
    ):
        regular_user.user_permissions.add(view_event_permission)

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.get(rf, regular_user), None, scheduled_event)

    def test_non_scheduled_unassigned_event_not_readable(
        self,
        rf,
        regular_user,
        view_event_permission,
        completed_event,
    ):
        regular_user.user_permissions.add(view_event_permission)

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.get(rf, regular_user), None, completed_event) is False

    def test_assigned_non_scheduled_event_readable_with_permission(
        self,
        rf,
        regular_user,
        view_event_permission,
        view_any_assigned_event_permission,
        completed_event,
        assigned_completed_event,
    ):
        regular_user.user_permissions.add(
            view_event_permission,
            view_any_assigned_event_permission,
        )

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.get(rf, regular_user), None, completed_event)

    def test_user_assigned_to_ticket_can_read_linked_event(
        self,
        rf,
        regular_user,
        view_event_permission,
        completed_event,
        assigned_ticket,
        view_ticket_permission,
    ):
        """User assigned to a ticket can view the event linked to that ticket."""
        regular_user.user_permissions.add(view_event_permission, view_ticket_permission)

        # Verify the ticket is linked to the event
        assert assigned_ticket.event_id == completed_event.id

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.get(rf, regular_user), None, completed_event)

    def test_user_not_assigned_to_ticket_cannot_read_unlinked_event(
        self,
        rf,
        regular_user,
        view_event_permission,
        completed_event,
        other_assigned_ticket,
        view_ticket_permission,
    ):
        """User not assigned to a ticket cannot view an event not linked to their tickets."""
        regular_user.user_permissions.add(view_event_permission, view_ticket_permission)

        # Verify the other ticket is NOT linked to this event (different event)
        assert other_assigned_ticket.event_id != completed_event.id

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.get(rf, regular_user), None, completed_event) is False

    # --------------------
    # WRITE
    # --------------------
    def test_write_requires_change_event_permission(
        self,
        rf,
        regular_user,
        scheduled_event,
    ):
        perm = EventObjectPermission()

        assert perm.has_object_permission(self.patch(rf, regular_user), None, scheduled_event) is False

    def test_change_all_events_can_edit_any_event(
        self,
        rf,
        regular_user,
        change_event_permission,
        change_all_events_permission,
        completed_event,
    ):
        regular_user.user_permissions.add(
            change_event_permission,
            change_all_events_permission,
        )

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.patch(rf, regular_user), None, completed_event)

    def test_change_assigned_event_can_edit_assigned_event(
        self,
        rf,
        regular_user,
        change_event_permission,
        change_assigned_event_permission,
        scheduled_event,
        assigned_scheduled_event,
    ):
        regular_user.user_permissions.add(
            change_event_permission,
            change_assigned_event_permission,
        )

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.patch(rf, regular_user), None, scheduled_event)

    def test_change_assigned_event_cannot_edit_unassigned_event(
        self,
        rf,
        regular_user,
        change_event_permission,
        change_assigned_event_permission,
        scheduled_event,
    ):
        regular_user.user_permissions.add(
            change_event_permission,
            change_assigned_event_permission,
        )

        perm = EventObjectPermission()
        assert perm.has_object_permission(self.patch(rf, regular_user), None, scheduled_event) is False

    def test_default_block(
        self,
        rf,
        regular_user,
        scheduled_event,
        change_event_permission,
    ):
        perm = EventObjectPermission()
        regular_user.user_permissions.add(
            change_event_permission,
        )

        assert perm.has_object_permission(self.patch(rf, regular_user), None, scheduled_event) is False

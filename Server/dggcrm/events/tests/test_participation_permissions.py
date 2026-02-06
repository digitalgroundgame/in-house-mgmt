import pytest
from django.db.models import Q
from rest_framework.test import APIRequestFactory

from dggcrm.events.models import EventParticipation
from dggcrm.events.permissions import (
    ParticipationObjectPermission,
    get_participation_visibility_filter,
)
from dggcrm.tickets.models import TicketStatus


@pytest.mark.django_db
class TestGetParticipationVisibilityFilter:
    def test_superuser_sees_all(self, admin_user):
        filters = get_participation_visibility_filter(admin_user)
        assert filters == Q()

    def test_user_with_view_all_participations_sees_all(
        self,
        regular_user,
        view_all_participations_permission,
    ):
        regular_user.user_permissions.add(view_all_participations_permission)

        filters = get_participation_visibility_filter(regular_user)
        assert filters == Q()

    def test_assigned_events_only_scheduled_without_any_assigned_perm(
        self,
        regular_user,
        scheduled_event,
        completed_event,
        assigned_scheduled_event,
        assigned_completed_event,
        scheduled_participation,
        completed_participation,
    ):
        filters = get_participation_visibility_filter(regular_user)
        qs = EventParticipation.objects.filter(filters)

        assert scheduled_participation in qs
        assert completed_participation not in qs

    def test_assigned_events_any_status_with_view_any_assigned_events(
        self,
        regular_user,
        view_any_assigned_event_permission,
        scheduled_event,
        completed_event,
        assigned_scheduled_event,
        assigned_completed_event,
        scheduled_participation,
        completed_participation,
    ):
        regular_user.user_permissions.add(view_any_assigned_event_permission)

        filters = get_participation_visibility_filter(regular_user)
        qs = EventParticipation.objects.filter(filters)

        assert scheduled_participation in qs
        assert completed_participation in qs

    def test_ticket_scoped_participations_visible(
        self,
        regular_user,
        ticket,
        contact,
        scheduled_participation,
    ):
        ticket.assigned_to = regular_user
        ticket.ticket_status = TicketStatus.INPROGRESS
        ticket.save()

        filters = get_participation_visibility_filter(regular_user)
        qs = EventParticipation.objects.filter(filters)

        assert scheduled_participation in qs

    def test_ticket_scope_works_without_event_assignment(
        self,
        regular_user,
        ticket,
        contact,
        scheduled_participation,
    ):
        # User is NOT assigned to the event
        ticket.assigned_to = regular_user
        ticket.ticket_status = TicketStatus.INPROGRESS
        ticket.save()

        filters = get_participation_visibility_filter(regular_user)
        qs = EventParticipation.objects.filter(filters)

        assert scheduled_participation in qs

    def test_no_permissions_sees_nothing(
        self,
        regular_user,
        scheduled_participation,
    ):
        filters = get_participation_visibility_filter(regular_user)
        qs = EventParticipation.objects.filter(filters)

        assert scheduled_participation not in qs


@pytest.mark.django_db
class TestParticipationObjectPermission:
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

    def test_denies_unauthenticated(self, rf, scheduled_participation):
        request = rf.get("/")
        request.user = None

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is False

    def test_superuser_bypasses_all(self, rf, admin_user, scheduled_participation):
        request = self.patch(rf, admin_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_read_denied_without_base_permission(self, rf, regular_user, scheduled_participation):
        request = self.get(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is False

    def test_read_allowed_with_view_all_participations(
        self,
        rf,
        regular_user,
        scheduled_participation,
        view_eventparticipation_permission,
        view_all_participations_permission,
    ):
        regular_user.user_permissions.add(view_eventparticipation_permission)
        regular_user.user_permissions.add(view_all_participations_permission)

        request = self.get(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_read_allowed_via_event_visibility(
        self,
        rf,
        regular_user,
        scheduled_participation,
        assigned_scheduled_event,
        view_eventparticipation_permission,
        view_event_permission,
    ):
        regular_user.user_permissions.add(view_eventparticipation_permission)
        regular_user.user_permissions.add(view_event_permission)

        request = self.get(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_read_allowed_via_contact_visibility(
        self,
        rf,
        regular_user,
        scheduled_participation,
        ticket,
        view_eventparticipation_permission,
        view_contact_permission,
    ):
        regular_user.user_permissions.add(view_eventparticipation_permission)
        regular_user.user_permissions.add(view_contact_permission)

        ticket.assigned_to = regular_user
        ticket.ticket_status = TicketStatus.INPROGRESS
        ticket.save()

        request = self.get(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_read_denied_when_not_visible(
        self,
        rf,
        regular_user,
        scheduled_participation,
        view_eventparticipation_permission,
    ):
        regular_user.user_permissions.add(view_eventparticipation_permission)

        request = self.get(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is False

    def test_write_allowed_with_change_all_participations(
        self,
        rf,
        regular_user,
        scheduled_participation,
        change_participation_permission,
        change_all_participations_permission,
    ):
        regular_user.user_permissions.add(change_participation_permission, change_all_participations_permission)

        request = self.patch(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_write_allowed_via_ticket_assignment(
        self,
        rf,
        regular_user,
        scheduled_participation,
        contact,
        ticket,
        scheduled_event,
        change_participation_permission,
        change_participation_via_ticket_permission,
    ):
        regular_user.user_permissions.add(change_participation_permission, change_participation_via_ticket_permission)

        ticket.assigned_to = regular_user
        ticket.ticket_status = TicketStatus.INPROGRESS
        ticket.contact = contact
        ticket.event = scheduled_event
        ticket.save()

        request = self.patch(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_write_allowed_via_event_assignment(
        self,
        rf,
        regular_user,
        scheduled_event,
        scheduled_participation,
        assigned_scheduled_event,
        change_participation_permission,
        change_participation_via_event_permission,
    ):
        regular_user.user_permissions.add(change_participation_permission, change_participation_via_event_permission)

        request = self.patch(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is True

    def test_write_denied_without_change_perms(
        self,
        rf,
        regular_user,
        scheduled_participation,
        change_all_participations_permission,
    ):
        regular_user.user_permissions.add(change_all_participations_permission)

        request = self.patch(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is False

    def test_default_block(
        self,
        rf,
        regular_user,
        scheduled_event,
        scheduled_participation,
        change_participation_permission,
    ):
        regular_user.user_permissions.add(
            change_participation_permission,
        )

        request = self.patch(rf, regular_user)

        assert ParticipationObjectPermission().has_object_permission(request, None, scheduled_participation) is False

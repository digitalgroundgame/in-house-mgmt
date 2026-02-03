import pytest
from django.db.models import Q
from rest_framework.test import APIRequestFactory

from dggcrm.events.models import UsersInEvent
from dggcrm.events.permissions import EventMembershipObjectPermission, get_event_membership_visibility_filter


@pytest.mark.django_db
class TestGetMembershipVisibilityFilter:
    def test_superuser_sees_all(self, admin_user):
        filters = get_event_membership_visibility_filter(admin_user)
        assert filters == Q()

    def test_user_with_view_all_sees_all(
        self,
        regular_user,
        view_all_usersinevents_permission,
    ):
        regular_user.user_permissions.add(view_all_usersinevents_permission)

        filters = get_event_membership_visibility_filter(regular_user)
        assert filters == Q()

    def test_user_via_event(
        self,
        regular_user,
        assigned_scheduled_event,
        other_assigned_event,
        view_usersinevent_via_event_permission,
    ):
        regular_user.user_permissions.add(view_usersinevent_via_event_permission)

        filters = get_event_membership_visibility_filter(regular_user)
        qs = UsersInEvent.objects.filter(filters)

        assert other_assigned_event in qs

    def test_no_permissions_sees_nothing(
        self,
        regular_user,
        other_assigned_event,
    ):
        filters = get_event_membership_visibility_filter(regular_user)
        qs = UsersInEvent.objects.filter(filters)

        assert other_assigned_event not in qs


@pytest.mark.django_db
class TestEventMembershipObjectPermission:
    @pytest.fixture
    def rf(self):
        return APIRequestFactory()

    def get(self, rf, user):
        request = rf.get("/")
        request.user = user
        return request

    def post(self, rf, user):
        request = rf.post("/")
        request.user = user
        return request

    def patch(self, rf, user):
        request = rf.patch("/")
        request.user = user
        return request

    def test_denies_unauthenticated(self, rf, assigned_scheduled_event):
        request = self.get(rf, None)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event) is False

    def test_read_allowed_for_superuser(self, rf, admin_user, assigned_scheduled_event):
        request = self.get(rf, admin_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event)

    def test_read_allowed_with_all_permission(
        self, rf, regular_user, other_assigned_event, view_usersinevent_permission, view_all_usersinevents_permission
    ):
        regular_user.user_permissions.add(view_usersinevent_permission, view_all_usersinevents_permission)
        request = self.get(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, other_assigned_event)

    def test_read_own_membership_permission(
        self, rf, regular_user, assigned_scheduled_event, view_usersinevent_permission
    ):
        regular_user.user_permissions.add(view_usersinevent_permission)
        request = self.get(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event)

    def test_read_allowed_with_event_permission(
        self,
        rf,
        regular_user,
        assigned_scheduled_event,
        other_assigned_event,
        view_usersinevent_permission,
        view_usersinevent_via_event_permission,
    ):
        regular_user.user_permissions.add(view_usersinevent_permission, view_usersinevent_via_event_permission)
        request = self.get(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, other_assigned_event)

    def test_read_denied_without_permission(self, rf, regular_user, assigned_scheduled_event):
        request = self.get(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event) is False

    def test_write_allowed_for_superuser(self, rf, admin_user, assigned_scheduled_event):
        request = self.post(rf, admin_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event) is True

    def test_write_allowed_with_global_permission(
        self,
        rf,
        regular_user,
        other_assigned_event,
        change_usersinevent_permission,
        change_all_usersinevents_permission,
    ):
        regular_user.user_permissions.add(
            change_usersinevent_permission,
            change_all_usersinevents_permission,
        )
        request = self.post(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, other_assigned_event) is True

    def test_write_allowed_for_assigned_event_manager(
        self,
        rf,
        regular_user,
        assigned_scheduled_event,
        change_usersinevent_permission,
        change_usersinevent_via_event_permission,
    ):
        regular_user.user_permissions.add(change_usersinevent_permission, change_usersinevent_via_event_permission)
        request = self.post(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event) is True

    def test_write_denied_if_not_assigned_event_manager(
        self,
        rf,
        regular_user,
        scheduled_event,
        other_assigned_event,
        change_usersinevent_permission,
        change_usersinevent_via_event_permission,
    ):
        # User has manage_assigned_event_users but not assigned to this event
        regular_user.user_permissions.add(change_usersinevent_permission, change_usersinevent_via_event_permission)
        request = self.post(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, other_assigned_event) is False

    def test_write_denied_without_permissions(self, rf, regular_user, assigned_scheduled_event):
        request = self.post(rf, regular_user)
        perm = EventMembershipObjectPermission()
        assert perm.has_object_permission(request, None, assigned_scheduled_event) is False

import pytest
from types import SimpleNamespace
from django.contrib.auth.models import Permission
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from dggcrm.tickets.permissions import (
    CanCommentOnTicketPermission,
    can_assign_ticket,
    can_change_ticket_status,
)
from dggcrm.tickets.models import Ticket


@pytest.mark.django_db
class TestCanCommentOnTicketPermission:
    def setup_method(self):
        self.perm = CanCommentOnTicketPermission()
        self.view = SimpleNamespace()

    def test_denies_unauthenticated(self, rf, assigned_ticket):
        request = rf.post("/")
        request.user = SimpleNamespace(is_authenticated=False)

        assert not self.perm.has_object_permission(
            request, self.view, assigned_ticket
        )

    def test_allows_superuser(self, rf, admin_user, unassigned_ticket):
        request = rf.post("/")
        request.user = admin_user

        assert self.perm.has_object_permission(
            request, self.view, unassigned_ticket
        )

    def test_allows_global_comment_permission(self, rf, regular_user, unassigned_ticket, add_any_comment_permission):
        regular_user.user_permissions.add(add_any_comment_permission)

        request = rf.post("/")
        request.user = regular_user

        assert self.perm.has_object_permission(
            request, self.view, unassigned_ticket
        )

    def test_allows_assigned_user_with_comment_perm(self, rf, regular_user, assigned_ticket, add_ticketcomment_permission):
        regular_user.user_permissions.add(add_ticketcomment_permission)

        request = rf.post("/")
        request.user = regular_user

        assert self.perm.has_object_permission(
            request, self.view, assigned_ticket
        )

    def test_denies_unassigned_user_with_comment_perm(
        self, rf, regular_user, other_user, unassigned_ticket, add_ticketcomment_permission
    ):
        unassigned_ticket.assigned_to = other_user
        unassigned_ticket.save()

        regular_user.user_permissions.add(add_ticketcomment_permission)

        request = rf.post("/")
        request.user = regular_user

        assert not self.perm.has_object_permission(
            request, self.view, unassigned_ticket
        )

    def test_denies_user_with_no_permissions(self, rf, regular_user, unassigned_ticket):
        request = rf.post("/")
        request.user = regular_user

        assert not self.perm.has_object_permission(
            request, self.view, unassigned_ticket
        )


@pytest.mark.django_db
class TestCanAssignTicketPermission:
    def test_can_assign_ticket_superuser(self, admin_user):
        assert can_assign_ticket(admin_user) is True

    def test_can_assign_ticket_with_permission(self, regular_user, assign_ticket_permission):
        regular_user.user_permissions.add(assign_ticket_permission)

        assert can_assign_ticket(regular_user) is True

    def test_can_assign_ticket_without_permission(self, regular_user):
        assert can_assign_ticket(regular_user) is False


@pytest.mark.django_db
class TestChangeTicketStatusPermission:
    def test_change_status_superuser(self, admin_user, unassigned_ticket):
        assert can_change_ticket_status(admin_user, unassigned_ticket) is True

    def test_change_status_missing_base_permission(self, regular_user, assigned_ticket):
        assert can_change_ticket_status(regular_user, assigned_ticket) is False

    def test_change_status_global_permission(self, regular_user, unassigned_ticket, change_status_permission, change_all_statuses_permission):
        regular_user.user_permissions.add(change_status_permission, change_all_statuses_permission)

        assert can_change_ticket_status(regular_user, unassigned_ticket) is True

    def test_change_status_assigned_user(self, regular_user, assigned_ticket, change_status_permission):
        regular_user.user_permissions.add(change_status_permission)

        assert can_change_ticket_status(regular_user, assigned_ticket) is True

    def test_change_status_not_assigned_denied(self, regular_user, unassigned_ticket, change_status_permission):
        regular_user.user_permissions.add(change_status_permission)

        assert can_change_ticket_status(regular_user, unassigned_ticket) is False
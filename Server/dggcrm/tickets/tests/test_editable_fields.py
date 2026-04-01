import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from rest_framework.test import APIRequestFactory

from dggcrm.tickets.models import Ticket, TicketStatus
from dggcrm.tickets.serializers import TicketSerializer

User = get_user_model()


@pytest.fixture
def rf():
    return APIRequestFactory()


@pytest.fixture
def user_with_change_ticket(db):
    user = User.objects.create_user(username="changer", password="password")
    user.user_permissions.add(Permission.objects.get(codename="change_ticket"))
    return user


@pytest.fixture
def user_with_assign_ticket(db):
    user = User.objects.create_user(username="assigner", password="password")
    user.user_permissions.add(Permission.objects.get(codename="assign_ticket"))
    return user


@pytest.fixture
def user_with_change_status(db):
    user = User.objects.create_user(username="status_changer", password="password")
    user.user_permissions.add(Permission.objects.get(codename="change_status"))
    return user


@pytest.fixture
def user_with_change_all_statuses(db):
    user = User.objects.create_user(username="all_status_changer", password="password")
    user.user_permissions.add(Permission.objects.get(codename="change_status"))
    user.user_permissions.add(Permission.objects.get(codename="change_all_statuses"))
    return user


@pytest.fixture
def user_with_change_ticket_and_assign(db):
    user = User.objects.create_user(username="changer_assigner", password="password")
    user.user_permissions.add(Permission.objects.get(codename="change_ticket"))
    user.user_permissions.add(Permission.objects.get(codename="assign_ticket"))
    return user


@pytest.fixture
def user_with_change_ticket_and_status(db):
    user = User.objects.create_user(username="changer_status", password="password")
    user.user_permissions.add(Permission.objects.get(codename="change_ticket"))
    user.user_permissions.add(Permission.objects.get(codename="change_status"))
    return user


@pytest.fixture
def user_with_all_permissions(db):
    user = User.objects.create_user(username="all_perms", password="password")
    user.user_permissions.add(Permission.objects.get(codename="change_ticket"))
    user.user_permissions.add(Permission.objects.get(codename="assign_ticket"))
    user.user_permissions.add(Permission.objects.get(codename="change_status"))
    user.user_permissions.add(Permission.objects.get(codename="change_all_statuses"))
    return user


@pytest.fixture
def ticket(db, user_with_all_permissions):
    return Ticket.objects.create(
        ticket_status=TicketStatus.INPROGRESS,
        assigned_to=user_with_all_permissions,
    )


def make_request(rf, user):
    request = rf.get("/")
    request.user = user
    return request


@pytest.mark.django_db
class TestGetEditableFields:
    def test_anonymous_user_gets_no_fields(self, rf, ticket):
        request = rf.get("/")
        request.user = type("AnonymousUser", (), {"is_authenticated": False})()

        serializer = TicketSerializer(ticket, context={"request": request})
        assert serializer.get_editable_fields(ticket) == []

    def test_user_with_change_ticket_gets_base_fields(self, rf, ticket, user_with_change_ticket):
        request = make_request(rf, user_with_change_ticket)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        assert "title" in fields
        assert "description" in fields
        assert "priority" in fields
        assert "ticket_type" in fields
        assert "contact" in fields
        assert "event" in fields

    def test_user_with_change_ticket_cannot_edit_assigned_to(self, rf, ticket, user_with_change_ticket):
        request = make_request(rf, user_with_change_ticket)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        assert "assigned_to" not in fields

    def test_user_with_change_ticket_cannot_edit_status(self, rf, ticket, user_with_change_ticket):
        request = make_request(rf, user_with_change_ticket)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        assert "ticket_status" not in fields

    def test_user_with_assign_ticket_can_edit_assigned_to(self, rf, ticket, user_with_assign_ticket):
        request = make_request(rf, user_with_assign_ticket)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        # assigned_to is editable via /assign endpoint, so show as enabled in UI
        assert "assigned_to" in fields

    def test_user_with_change_status_can_edit_ticket_status(self, rf, ticket, user_with_change_status):
        ticket.assigned_to = user_with_change_status
        ticket.save()
        request = make_request(rf, user_with_change_status)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        # ticket_status is editable via /status endpoint (when assigned to ticket), so show as enabled
        assert "ticket_status" in fields

    def test_user_with_change_status_without_assignment_cannot_edit_status(self, rf, ticket, user_with_change_status):
        request = make_request(rf, user_with_change_status)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        # Without assignment, user can only edit via /status if they have change_all_statuses
        assert "ticket_status" not in fields

    def test_user_with_change_all_statuses_can_edit_any_status(self, rf, ticket, user_with_change_all_statuses):
        request = make_request(rf, user_with_change_all_statuses)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        # With change_all_statuses, can edit any ticket's status
        assert "ticket_status" in fields

    def test_user_with_all_permissions_gets_all_fields(self, rf, ticket, user_with_all_permissions):
        request = make_request(rf, user_with_all_permissions)

        serializer = TicketSerializer(ticket, context={"request": request})
        fields = serializer.get_editable_fields(ticket)

        assert "title" in fields
        assert "description" in fields
        assert "priority" in fields
        assert "ticket_type" in fields
        assert "contact" in fields
        assert "event" in fields
        assert "assigned_to" in fields
        assert "ticket_status" in fields

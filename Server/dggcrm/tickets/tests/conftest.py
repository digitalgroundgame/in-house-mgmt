# conftest.py (additions)
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from dggcrm.contacts.models import Contact
from dggcrm.events.models import Event, EventStatus, UsersInEvent
from dggcrm.tickets.models import Ticket, TicketStatus

User = get_user_model()


@pytest.fixture
def rf():
    return APIRequestFactory()


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(username="user1", password="password")


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username="admin", password="password")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="other", password="other")


@pytest.fixture
def contact(db):
    return Contact.objects.create(
        full_name="Alice Example",
        email="alice@example.com",
    )


@pytest.fixture
def unassigned_ticket(db, contact):
    return Ticket.objects.create(
        contact=contact,
        ticket_status=TicketStatus.INPROGRESS,
        assigned_to=None,
    )


@pytest.fixture
def assigned_ticket(db, regular_user, contact):
    return Ticket.objects.create(
        contact=contact,
        ticket_status=TicketStatus.INPROGRESS,
        assigned_to=regular_user,
    )


@pytest.fixture
def other_assigned_ticket(db, contact, other_user):
    return Ticket.objects.create(
        contact=contact,
        ticket_status=TicketStatus.INPROGRESS,
        assigned_to=other_user,
    )


@pytest.fixture
def scheduled_event(db):
    return Event.objects.create(
        name="Scheduled Event",
        event_status=EventStatus.SCHEDULED,
        starts_at=timezone.now(),
        ends_at=timezone.now() + timezone.timedelta(hours=2),
    )


@pytest.fixture
def assigned_scheduled_event(regular_user, scheduled_event):
    return UsersInEvent.objects.create(
        user=regular_user,
        event=scheduled_event,
    )


@pytest.fixture
def view_ticket_permission(db):
    return Permission.objects.get(codename="view_ticket")


@pytest.fixture
def view_all_tickets_permission(db):
    return Permission.objects.get(codename="view_all_tickets")


@pytest.fixture
def view_tickets_via_event_permission(db):
    return Permission.objects.get(codename="view_tickets_via_event")


@pytest.fixture
def change_ticket_permission(db):
    return Permission.objects.get(codename="change_ticket")


@pytest.fixture
def claim_ticket_permission(db):
    return Permission.objects.get(codename="claim_ticket")


@pytest.fixture
def unclaim_ticket_permission(db):
    return Permission.objects.get(codename="unclaim_ticket")


@pytest.fixture
def assign_ticket_permission(db):
    return Permission.objects.get(codename="assign_ticket")


@pytest.fixture
def add_any_comment_permission(db):
    return Permission.objects.get(codename="add_any_comment")


@pytest.fixture
def add_ticketcomment_permission(db):
    return Permission.objects.get(codename="add_ticketcomment")


@pytest.fixture
def change_status_permission(db):
    return Permission.objects.get(codename="change_status")


@pytest.fixture
def change_all_statuses_permission(db):
    return Permission.objects.get(codename="change_all_statuses")

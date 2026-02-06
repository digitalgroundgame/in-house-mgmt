import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone

from dggcrm.contacts.models import Contact, Tag, TagAssignments
from dggcrm.events.models import Event, EventParticipation, EventStatus, UsersInEvent
from dggcrm.tickets.models import Ticket, TicketStatus

User = get_user_model()


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(username="user1", password="password")


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username="admin", password="password")


@pytest.fixture
def tag(db):
    return Tag.objects.create(
        name="you-are-it",
    )


@pytest.fixture
def contact(db):
    return Contact.objects.create(
        full_name="Alice Example",
        email="alice@example.com",
    )


@pytest.fixture
def ticket(db, contact, admin_user):
    """Ticket unassigned and linked to contact"""
    return Ticket.objects.create(
        title="Test Ticket",
        ticket_status=TicketStatus.INPROGRESS,
        priority=1,
        reported_by=admin_user,
        assigned_to=admin_user,
        contact=contact,
    )


@pytest.fixture
def event(db):
    """Event with required non-null fields"""
    return Event.objects.create(
        name="Test Event",
        description="Sample event",
        starts_at=timezone.now(),
        ends_at=timezone.now() + timezone.timedelta(hours=2),
        event_status=EventStatus.SCHEDULED,
        location_name="Test Hall",
        location_address="123 Test Street",
    )


@pytest.fixture
def event2(db):
    """Event with required non-null fields"""
    return Event.objects.create(
        name="Second Event",
        description="Another event",
        starts_at=timezone.now(),
        ends_at=timezone.now() + timezone.timedelta(hours=2),
        event_status=EventStatus.COMPLETED,
        location_name="REMOTE",
    )


@pytest.fixture
def tag_assignment(db, tag, contact):
    return TagAssignments.objects.create(
        contact=contact,
        tag=tag,
    )


@pytest.fixture
def user_in_event(db, event, regular_user):
    """Assign user to an event"""
    return UsersInEvent.objects.create(user=regular_user, event=event)


@pytest.fixture
def user_in_event2(db, event2, regular_user):
    """Assign user to an event"""
    return UsersInEvent.objects.create(user=regular_user, event=event2)


@pytest.fixture
def participation(db, contact, event):
    """Contact participation in the event"""
    return EventParticipation.objects.create(contact=contact, event=event)


@pytest.fixture
def view_all_contacts_permission(db):
    return Permission.objects.get(codename="view_all_contacts")


@pytest.fixture
def view_contact_permission(db):
    return Permission.objects.get(codename="view_contact")


@pytest.fixture
def view_contacts_via_event_permission(db):
    return Permission.objects.get(codename="view_contacts_via_event")


@pytest.fixture
def change_contact_permission(db):
    return Permission.objects.get(codename="change_contact")


@pytest.fixture
def edit_ticket_contact_permission(db):
    return Permission.objects.get(codename="change_contacts_via_ticket")


@pytest.fixture
def change_all_contacts_permission(db):
    return Permission.objects.get(codename="change_all_contacts")

import pytest
from django.contrib.auth.models import Permission, User
from django.utils import timezone

from dggcrm.events.models import Event, EventStatus, EventParticipation, UsersInEvent
from dggcrm.contacts.models import Contact
from dggcrm.tickets.models import Ticket, TicketStatus


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username="admin",
        email="admin@test.com",
        password="password",
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        username="regular",
        email="regular@test.com",
        password="password",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username="other",
        email="other@test.com",
        password="password",
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
def completed_event(db):
    return Event.objects.create(
        name="Completed Event",
        event_status=EventStatus.COMPLETED,
        starts_at=timezone.now(),
        ends_at=timezone.now() + timezone.timedelta(hours=2),
    )


@pytest.fixture
def contact(db):
    return Contact.objects.create(
        full_name="Jane Contact",
        email="jane@example.com",
    )


@pytest.fixture
def ticket(db, contact):
    return Ticket.objects.create(
        contact=contact,
        ticket_status=TicketStatus.INPROGRESS,
    )

@pytest.fixture
def scheduled_participation(db, scheduled_event, contact):
    return EventParticipation.objects.create(
        event=scheduled_event,
        contact=contact,
    )


@pytest.fixture
def completed_participation(db, completed_event, contact):
    return EventParticipation.objects.create(
        event=completed_event,
        contact=contact,
    )


@pytest.fixture
def assigned_scheduled_event(regular_user, scheduled_event):
    a = UsersInEvent.objects.create(
        user=regular_user,
        event=scheduled_event,
    )
    print(a.event, a.event.users)
    return a


@pytest.fixture
def assigned_completed_event(regular_user, completed_event):
    return UsersInEvent.objects.create(
        user=regular_user,
        event=completed_event,
    )


@pytest.fixture
def other_assigned_event(other_user, scheduled_event):
    return UsersInEvent.objects.create(
        user=other_user,
        event=scheduled_event,
    )


@pytest.fixture
def view_event_permission(db):
    return Permission.objects.get(codename="view_event")


@pytest.fixture
def view_all_events_permission(db):
    return Permission.objects.get(codename="view_all_events")


@pytest.fixture
def view_any_assigned_event_permission(db):
    return Permission.objects.get(codename="view_any_assigned_event")


@pytest.fixture
def change_event_permission(db):
    return Permission.objects.get(codename="change_event")


@pytest.fixture
def change_all_events_permission(db):
    return Permission.objects.get(codename="change_all_events")


@pytest.fixture
def change_assigned_event_permission(db):
    return Permission.objects.get(codename="change_assigned_event")


@pytest.fixture
def view_all_participations_permission(db):
    return Permission.objects.get(codename="view_all_participations")


@pytest.fixture
def view_eventparticipation_permission(db):
    return Permission.objects.get(codename="view_eventparticipation")


@pytest.fixture
def change_all_participations_permission(db):
    return Permission.objects.get(codename="change_all_participations")


@pytest.fixture
def change_participation_permission(db):
    return Permission.objects.get(codename="change_eventparticipation")


@pytest.fixture
def change_participation_via_ticket_permission(db):
    return Permission.objects.get(codename="change_participation_via_ticket")


@pytest.fixture
def change_participation_via_event_permission(db):
    return Permission.objects.get(codename="change_participation_via_event")


@pytest.fixture
def view_contact_permission(db):
    return Permission.objects.get(codename="view_contact")


@pytest.fixture
def view_usersinevent_permission(db):
    return Permission.objects.get(codename="view_usersinevent")

@pytest.fixture
def view_all_usersinevents_permission(db):
    return Permission.objects.get(codename="view_all_usersinevents")


@pytest.fixture
def view_usersinevent_via_event_permission(db):
    return Permission.objects.get(codename="view_usersinevent_via_event")

@pytest.fixture
def change_usersinevent_permission(db):
    return Permission.objects.get(codename="change_usersinevent")

@pytest.fixture
def change_all_usersinevents_permission(db):
    return Permission.objects.get(codename="change_all_usersinevents")

@pytest.fixture
def change_usersinevent_via_event_permission(db):
    return Permission.objects.get(codename="change_usersinevent_via_event")

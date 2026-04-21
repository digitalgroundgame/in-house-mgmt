import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from dggcrm.contacts.models import Contact
from dggcrm.events.models import (
    CommitmentStatus,
    Event,
    EventCategory,
    EventParticipation,
    EventStatus,
    EventType,
)
from dggcrm.tickets.models import Ticket, TicketStatus, TicketType


@pytest.fixture
def other_contact(db):
    return Contact.objects.create(full_name="Bob Faker", email="bob@example.com")


@pytest.fixture
def third_contact(db):
    return Contact.objects.create(full_name="Carol Tester", email="carol@example.com")


@pytest.fixture
def category(db):
    return EventCategory.objects.create(name="Canvassing")


@pytest.fixture
def other_category(db):
    return EventCategory.objects.create(name="Phone Banking")


@pytest.fixture
def past_event(db):
    start = timezone.now() - timezone.timedelta(days=60)
    return Event.objects.create(
        name="Past Event",
        event_status=EventStatus.COMPLETED,
        starts_at=start,
        ends_at=start + timezone.timedelta(hours=2),
    )


@pytest.fixture
def future_event(db):
    start = timezone.now() + timezone.timedelta(days=30)
    return Event.objects.create(
        name="Future Event",
        event_status=EventStatus.SCHEDULED,
        starts_at=start,
        ends_at=start + timezone.timedelta(hours=2),
    )


@pytest.fixture
def internal_event(db):
    return Event.objects.create(
        name="Internal Event",
        event_status=EventStatus.COMPLETED,
        event_type=EventType.INTERNAL,
        starts_at=timezone.now(),
        ends_at=timezone.now() + timezone.timedelta(hours=2),
    )


@pytest.mark.django_db
class TestContactFilters:
    def setup_method(self):
        self.client = APIClient()
        self.client.handler.enforce_trailing_slash = False

    # --- event filter ---

    def test_filter_by_event(self, admin_user, contact, other_contact, event):
        EventParticipation.objects.create(event=event, contact=contact)
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event={event.id}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    # --- tag filter ---

    def test_filter_by_tag_id(self, admin_user, contact, other_contact, tag, tag_assignment):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?tag={tag.id}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_filter_by_tag_name(self, admin_user, contact, other_contact, tag, tag_assignment):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?tag={tag.name}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_filter_by_tag_name_case_insensitive(self, admin_user, contact, tag, tag_assignment):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?tag={tag.name.upper()}")
        assert response.status_code == 200
        assert len(response.data["results"]) == 1

    # --- search filter ---

    def test_search_by_name(self, admin_user, contact, other_contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?search=Alice")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_search_by_email(self, admin_user, contact, other_contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?search=bob@example")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert other_contact.id in ids
        assert contact.id not in ids

    # --- min/max events filter ---

    def test_filter_min_events(self, admin_user, contact, other_contact, event, event2):
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.ATTENDED)
        EventParticipation.objects.create(event=event2, contact=contact, status=CommitmentStatus.ATTENDED)
        EventParticipation.objects.create(event=event, contact=other_contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_events=2")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_filter_max_events(self, admin_user, contact, other_contact, event, event2):
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.ATTENDED)
        EventParticipation.objects.create(event=event2, contact=contact, status=CommitmentStatus.ATTENDED)
        EventParticipation.objects.create(event=event, contact=other_contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_events=1&max_events=1")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert other_contact.id in ids
        assert contact.id not in ids

    def test_min_events_excludes_non_attended(self, admin_user, contact, event):
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.COMMITTED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_events=1")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    def test_min_events_excludes_internal(self, admin_user, contact, internal_event):
        EventParticipation.objects.create(event=internal_event, contact=contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_events=1")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    # --- min/max tickets filter ---

    def test_filter_min_tickets(self, admin_user, contact, other_contact):
        Ticket.objects.create(contact=contact, ticket_status=TicketStatus.COMPLETED)
        Ticket.objects.create(contact=contact, ticket_status=TicketStatus.COMPLETED)
        Ticket.objects.create(contact=other_contact, ticket_status=TicketStatus.COMPLETED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_tickets=2")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_filter_max_tickets(self, admin_user, contact, other_contact):
        Ticket.objects.create(contact=contact, ticket_status=TicketStatus.COMPLETED)
        Ticket.objects.create(contact=contact, ticket_status=TicketStatus.COMPLETED)
        Ticket.objects.create(contact=other_contact, ticket_status=TicketStatus.COMPLETED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_tickets=1&max_tickets=1")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert other_contact.id in ids
        assert contact.id not in ids

    def test_min_tickets_excludes_internal_call(self, admin_user, contact):
        Ticket.objects.create(
            contact=contact, ticket_status=TicketStatus.COMPLETED, ticket_type=TicketType.INTERAL_CALL
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/contacts/?min_tickets=1")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    # --- date range filter ---

    def test_filter_start_date(self, admin_user, contact, other_contact, past_event, future_event):
        EventParticipation.objects.create(event=past_event, contact=contact)
        EventParticipation.objects.create(event=future_event, contact=other_contact)

        start = (timezone.now() - timezone.timedelta(days=1)).strftime("%Y-%m-%d")
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?start_date={start}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert other_contact.id in ids
        assert contact.id not in ids

    def test_filter_end_date(self, admin_user, contact, other_contact, past_event, future_event):
        EventParticipation.objects.create(event=past_event, contact=contact)
        EventParticipation.objects.create(event=future_event, contact=other_contact)

        end = (timezone.now() - timezone.timedelta(days=1)).strftime("%Y-%m-%d")
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?end_date={end}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_filter_date_range(self, admin_user, contact, other_contact, third_contact, past_event, future_event):
        now = timezone.now()
        middle_event = Event.objects.create(
            name="Middle Event",
            event_status=EventStatus.SCHEDULED,
            starts_at=now - timezone.timedelta(days=5),
            ends_at=now - timezone.timedelta(days=5) + timezone.timedelta(hours=2),
        )
        EventParticipation.objects.create(event=past_event, contact=contact)
        EventParticipation.objects.create(event=middle_event, contact=other_contact)
        EventParticipation.objects.create(event=future_event, contact=third_contact)

        start = (now - timezone.timedelta(days=10)).strftime("%Y-%m-%d")
        end = (now - timezone.timedelta(days=1)).strftime("%Y-%m-%d")
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?start_date={start}&end_date={end}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert other_contact.id in ids
        assert contact.id not in ids
        assert third_contact.id not in ids

    # --- event category filter ---

    def test_filter_by_event_category(self, admin_user, contact, other_contact, event, category):
        event.category = category
        event.save()
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event_category_id={category.id}")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids
        assert other_contact.id not in ids

    def test_filter_by_event_category_excludes_non_attended(self, admin_user, contact, event, category):
        event.category = category
        event.save()
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.COMMITTED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event_category_id={category.id}")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    def test_filter_by_event_category_wrong_category(self, admin_user, contact, event, category, other_category):
        event.category = category
        event.save()
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event_category_id={other_category.id}")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    def test_filter_event_category_with_min_events(
        self, admin_user, contact, other_contact, event, event2, category, other_category
    ):
        event.category = category
        event.save()
        event2.category = other_category
        event2.save()
        EventParticipation.objects.create(event=event, contact=contact, status=CommitmentStatus.ATTENDED)
        EventParticipation.objects.create(event=event2, contact=contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event_category_id={category.id}&min_events=1")
        assert response.status_code == 200
        ids = [c["id"] for c in response.data["results"]]
        assert contact.id in ids

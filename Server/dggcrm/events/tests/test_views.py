import pytest
from rest_framework.test import APIClient

from dggcrm.events.models import CommitmentStatus, EventParticipation

ENDPOINT = "/api/participants/"


@pytest.mark.django_db
class TestParticipationCreate:
    def setup_method(self):
        self.client = APIClient()

    def test_missing_status_returns_400(self, admin_user, scheduled_event, contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(ENDPOINT, {"event_id": scheduled_event.id, "contact_id": contact.id})

        assert response.status_code == 400
        assert "status" in response.data

    def test_blank_status_returns_400(self, admin_user, scheduled_event, contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(ENDPOINT, {"event_id": scheduled_event.id, "contact_id": contact.id, "status": ""})

        assert response.status_code == 400
        assert "status" in response.data

    def test_invalid_status_returns_400(self, admin_user, scheduled_event, contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            ENDPOINT, {"event_id": scheduled_event.id, "contact_id": contact.id, "status": "fake"}
        )

        assert response.status_code == 400
        assert "status" in response.data

    def test_create_with_status_returns_201(self, admin_user, scheduled_event, contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            ENDPOINT,
            {"event_id": scheduled_event.id, "contact_id": contact.id, "status": CommitmentStatus.COMMITTED},
        )

        assert response.status_code == 201
        assert EventParticipation.objects.filter(event=scheduled_event, contact=contact).exists()

    def test_create_with_status_with_unknown_status(self, admin_user, scheduled_event, contact):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            ENDPOINT,
            {"event_id": scheduled_event.id, "contact_id": contact.id, "status": CommitmentStatus.UNKNOWN},
        )

        assert response.status_code == 201
        assert EventParticipation.objects.filter(
            event=scheduled_event, contact=contact, status=CommitmentStatus.UNKNOWN
        ).exists()

    def test_upsert_with_status_returns_200(self, admin_user, scheduled_event, contact, scheduled_participation):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            ENDPOINT,
            {"event_id": scheduled_event.id, "contact_id": contact.id, "status": CommitmentStatus.ATTENDED},
        )

        assert response.status_code == 200
        scheduled_participation.refresh_from_db()
        assert scheduled_participation.status == CommitmentStatus.ATTENDED

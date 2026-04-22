import pytest
from rest_framework.test import APIClient

from dggcrm.events.models import CommitmentStatus, EventParticipation, EventStatus

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


@pytest.mark.django_db
class TestEventEditWorkflow:
    def setup_method(self):
        self.client = APIClient()

    def test_event_detail_includes_editable_fields_for_assigned_editor(
        self,
        regular_user,
        scheduled_event,
        assigned_scheduled_event,
        view_event_permission,
        change_event_permission,
        change_assigned_event_permission,
    ):
        regular_user.user_permissions.add(
            view_event_permission,
            change_event_permission,
            change_assigned_event_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.get(f"/api/events/{scheduled_event.id}/")

        assert response.status_code == 200
        assert sorted(response.data["editable_fields"]) == [
            "category",
            "description",
            "ends_at",
            "event_status",
            "location_address",
            "location_name",
            "name",
            "starts_at",
        ]

    def test_event_detail_includes_no_editable_fields_without_edit_permission(
        self,
        regular_user,
        scheduled_event,
        assigned_scheduled_event,
        view_event_permission,
    ):
        regular_user.user_permissions.add(view_event_permission)
        self.client.force_authenticate(user=regular_user)

        response = self.client.get(f"/api/events/{scheduled_event.id}/")

        assert response.status_code == 200
        assert response.data["editable_fields"] == []

    def test_patch_updates_event_status_for_assigned_editor(
        self,
        regular_user,
        scheduled_event,
        assigned_scheduled_event,
        change_event_permission,
        change_assigned_event_permission,
    ):
        regular_user.user_permissions.add(
            change_event_permission,
            change_assigned_event_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(
            f"/api/events/{scheduled_event.id}/",
            {"event_status": EventStatus.COMPLETED},
        )

        assert response.status_code == 200
        scheduled_event.refresh_from_db()
        assert scheduled_event.event_status == EventStatus.COMPLETED
        assert response.data["event_status"] == EventStatus.COMPLETED

    def test_patch_denied_without_edit_permission(
        self,
        regular_user,
        scheduled_event,
        assigned_scheduled_event,
    ):
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(
            f"/api/events/{scheduled_event.id}/",
            {"event_status": EventStatus.COMPLETED},
        )

        assert response.status_code == 403

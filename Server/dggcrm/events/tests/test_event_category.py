import pytest
from rest_framework.test import APIClient

from dggcrm.events.models import CommitmentStatus, EventCategory


@pytest.mark.django_db
class TestEventCategoryCRUD:
    def setup_method(self):
        self.client = APIClient()
        self.client.handler.enforce_trailing_slash = False

    def test_list_categories(self, admin_user, event_category):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/event-categories/")
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Canvassing"

    def test_create_category(self, admin_user):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/event-categories/", {"name": "Phone Banking", "description": "Calling voters"}
        )
        assert response.status_code == 201
        assert response.data["name"] == "Phone Banking"
        assert EventCategory.objects.count() == 1

    def test_create_duplicate_name_returns_400(self, admin_user, event_category):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post("/api/event-categories/", {"name": "Canvassing"})
        assert response.status_code == 400

    def test_update_category(self, admin_user, event_category):
        self.client.force_authenticate(user=admin_user)
        response = self.client.patch(f"/api/event-categories/{event_category.id}/", {"name": "Updated Name"})
        assert response.status_code == 200
        event_category.refresh_from_db()
        assert event_category.name == "Updated Name"

    def test_delete_category_without_events(self, admin_user, event_category):
        self.client.force_authenticate(user=admin_user)
        response = self.client.delete(f"/api/event-categories/{event_category.id}/")
        assert response.status_code == 204
        assert EventCategory.objects.count() == 0

    def test_delete_category_with_events_returns_409(self, admin_user, event_category, scheduled_event):
        scheduled_event.category = event_category
        scheduled_event.save()
        self.client.force_authenticate(user=admin_user)
        response = self.client.delete(f"/api/event-categories/{event_category.id}/")
        assert response.status_code == 409
        assert EventCategory.objects.count() == 1

    def test_unauthenticated_returns_403(self):
        response = self.client.get("/api/event-categories/")
        assert response.status_code in [401, 403]


@pytest.mark.django_db
class TestEventCategoryFiltering:
    def setup_method(self):
        self.client = APIClient()
        self.client.handler.enforce_trailing_slash = False

    def test_filter_events_by_category(self, admin_user, scheduled_event, completed_event, event_category):
        scheduled_event.category = event_category
        scheduled_event.save()
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/events/?category_id={event_category.id}")
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == scheduled_event.id

    def test_filter_events_no_match(self, admin_user, scheduled_event, event_category):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/events/?category_id={event_category.id}")
        assert response.status_code == 200
        assert response.data["count"] == 0

    def test_event_response_includes_category(self, admin_user, scheduled_event, event_category):
        scheduled_event.category = event_category
        scheduled_event.save()
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/events/{scheduled_event.id}/")
        assert response.status_code == 200
        assert response.data["category"]["id"] == event_category.id
        assert response.data["category"]["name"] == "Canvassing"

    def test_event_response_null_category(self, admin_user, scheduled_event):
        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/events/{scheduled_event.id}/")
        assert response.status_code == 200
        assert response.data["category"] is None

    def test_create_event_with_category(self, admin_user, event_category):
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/events/",
            {
                "name": "New Event",
                "starts_at": "2026-05-01T10:00:00Z",
                "ends_at": "2026-05-01T12:00:00Z",
                "category_id": event_category.id,
            },
        )
        assert response.status_code == 201
        assert response.data["category"]["id"] == event_category.id

    def test_filter_contacts_by_event_category(self, admin_user, scheduled_event, contact, event_category):
        scheduled_event.category = event_category
        scheduled_event.save()
        EventCategory.objects.create(name="Other Category")
        from dggcrm.events.models import EventParticipation

        EventParticipation.objects.create(event=scheduled_event, contact=contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event_category_id={event_category.id}&min_events=1")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_filter_contacts_by_event_category_no_match(
        self, admin_user, scheduled_event, contact, event_category, other_event_category
    ):
        scheduled_event.category = event_category
        scheduled_event.save()
        from dggcrm.events.models import EventParticipation

        EventParticipation.objects.create(event=scheduled_event, contact=contact, status=CommitmentStatus.ATTENDED)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get(f"/api/contacts/?event_category_id={other_event_category.id}&min_events=1")
        assert response.status_code == 200
        assert response.data["count"] == 0


@pytest.mark.django_db
class TestEventCategoryPermissions:
    def setup_method(self):
        self.client = APIClient()
        self.client.handler.enforce_trailing_slash = False

    def test_regular_user_can_list_categories(self, regular_user, event_category):
        self.client.force_authenticate(user=regular_user)
        response = self.client.get("/api/event-categories/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_regular_user_can_filter_events_by_category(
        self,
        regular_user,
        event_category,
        scheduled_event,
        assigned_scheduled_event,
    ):
        scheduled_event.category = event_category
        scheduled_event.save()

        self.client.force_authenticate(user=regular_user)
        response = self.client.get(f"/api/events/?category_id={event_category.id}")
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == scheduled_event.id

    def test_regular_user_filter_by_category_excludes_unassigned_events(
        self,
        regular_user,
        event_category,
        scheduled_event,
        completed_event,
        assigned_scheduled_event,
    ):
        scheduled_event.category = event_category
        scheduled_event.save()
        completed_event.category = event_category
        completed_event.save()

        self.client.force_authenticate(user=regular_user)
        response = self.client.get(f"/api/events/?category_id={event_category.id}")
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == scheduled_event.id

    def test_regular_user_filter_by_category_no_match(
        self,
        regular_user,
        other_event_category,
        scheduled_event,
        assigned_scheduled_event,
    ):
        self.client.force_authenticate(user=regular_user)
        response = self.client.get(f"/api/events/?category_id={other_event_category.id}")
        assert response.status_code == 200
        assert response.data["count"] == 0

    def test_regular_user_cannot_create_category(self, regular_user):
        self.client.force_authenticate(user=regular_user)
        response = self.client.post("/api/event-categories/", {"name": "Phone Banking"})
        assert response.status_code == 403

    def test_regular_user_cannot_update_category(self, regular_user, event_category):
        self.client.force_authenticate(user=regular_user)
        response = self.client.patch(f"/api/event-categories/{event_category.id}/", {"name": "Updated"})
        assert response.status_code == 403

    def test_regular_user_cannot_delete_category(self, regular_user, event_category):
        self.client.force_authenticate(user=regular_user)
        response = self.client.delete(f"/api/event-categories/{event_category.id}/")
        assert response.status_code == 403

    def test_user_with_add_permission_can_create(self, regular_user, add_eventcategory_permission):
        regular_user.user_permissions.add(add_eventcategory_permission)
        self.client.force_authenticate(user=regular_user)
        response = self.client.post("/api/event-categories/", {"name": "Phone Banking"})
        assert response.status_code == 201

    def test_user_with_change_permission_can_update(
        self, regular_user, event_category, change_eventcategory_permission
    ):
        regular_user.user_permissions.add(change_eventcategory_permission)
        self.client.force_authenticate(user=regular_user)
        response = self.client.patch(f"/api/event-categories/{event_category.id}/", {"name": "Updated"})
        assert response.status_code == 200

    def test_user_with_delete_permission_can_delete(
        self, regular_user, event_category, delete_eventcategory_permission
    ):
        regular_user.user_permissions.add(delete_eventcategory_permission)
        self.client.force_authenticate(user=regular_user)
        response = self.client.delete(f"/api/event-categories/{event_category.id}/")
        assert response.status_code == 204

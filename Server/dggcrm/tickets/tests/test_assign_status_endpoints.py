import pytest
from django.contrib.auth.models import Permission
from rest_framework.test import APIClient

from dggcrm.tickets.models import TicketStatus


@pytest.fixture(autouse=True)
def enable_redirect_following(client):
    client.defaults["HTTP_REDIRECTS"] = True


@pytest.mark.django_db
class TestAssignEndpoint:
    def setup_method(self):
        self.client = APIClient()
        self.client.handler.enforce_trailing_slash = False

    def test_assign_ticket_requires_auth(self, unassigned_ticket):
        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/assign", {"assigned_to": ""})
        assert response.status_code in [401, 403, 301]

    def test_assign_ticket_superuser(self, admin_user, unassigned_ticket, regular_user):
        self.client.force_authenticate(user=admin_user)
        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/assign/", {"assigned_to": regular_user.id})
        assert response.status_code == 200
        unassigned_ticket.refresh_from_db()
        assert unassigned_ticket.assigned_to_id == regular_user.id

    def test_assign_ticket_with_permission(self, regular_user, unassigned_ticket, assign_ticket_permission, other_user):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"),
            Permission.objects.get(codename="view_all_tickets"),
            assign_ticket_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/assign/", {"assigned_to": other_user.id})
        assert response.status_code == 200
        unassigned_ticket.refresh_from_db()
        assert unassigned_ticket.assigned_to_id == other_user.id

    def test_unassign_ticket_with_permission(self, regular_user, assigned_ticket, assign_ticket_permission):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"),
            Permission.objects.get(codename="view_all_tickets"),
            assign_ticket_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{assigned_ticket.id}/assign/", {"assigned_to": ""})
        assert response.status_code == 200
        assigned_ticket.refresh_from_db()
        assert assigned_ticket.assigned_to_id is None

    def test_assign_denied_without_permission(self, regular_user, unassigned_ticket, other_user):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"), Permission.objects.get(codename="view_all_tickets")
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/assign/", {"assigned_to": other_user.id})
        assert response.status_code == 403


@pytest.mark.django_db
class TestStatusEndpoint:
    def setup_method(self):
        self.client = APIClient()
        self.client.handler.enforce_trailing_slash = False

    def test_change_status_requires_auth(self, unassigned_ticket):
        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/status", {"ticket_status": "COMPLETED"})
        assert response.status_code in [401, 403, 301]

    def test_change_status_superuser(self, admin_user, unassigned_ticket):
        self.client.force_authenticate(user=admin_user)
        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/status/", {"ticket_status": "COMPLETED"})
        assert response.status_code == 200
        unassigned_ticket.refresh_from_db()
        assert unassigned_ticket.ticket_status == TicketStatus.COMPLETED

    def test_change_status_with_all_statuses_permission(
        self, regular_user, unassigned_ticket, change_status_permission, change_all_statuses_permission
    ):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"),
            Permission.objects.get(codename="view_all_tickets"),
            change_status_permission,
            change_all_statuses_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/status/", {"ticket_status": "COMPLETED"})
        assert response.status_code == 200
        unassigned_ticket.refresh_from_db()
        assert unassigned_ticket.ticket_status == TicketStatus.COMPLETED

    def test_change_status_assigned_user_with_permission(self, regular_user, assigned_ticket, change_status_permission):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"),
            Permission.objects.get(codename="view_all_tickets"),
            change_status_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{assigned_ticket.id}/status/", {"ticket_status": "COMPLETED"})
        assert response.status_code == 200
        assigned_ticket.refresh_from_db()
        assert assigned_ticket.ticket_status == TicketStatus.COMPLETED

    def test_change_status_denied_for_unassigned_user(self, regular_user, unassigned_ticket, change_status_permission):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"),
            Permission.objects.get(codename="view_all_tickets"),
            change_status_permission,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{unassigned_ticket.id}/status/", {"ticket_status": "COMPLETED"})
        assert response.status_code == 403

    def test_change_status_denied_without_permission(self, regular_user, assigned_ticket):
        regular_user.user_permissions.add(
            Permission.objects.get(codename="view_ticket"), Permission.objects.get(codename="view_all_tickets")
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.patch(f"/api/tickets/{assigned_ticket.id}/status/", {"ticket_status": "COMPLETED"})
        assert response.status_code == 403

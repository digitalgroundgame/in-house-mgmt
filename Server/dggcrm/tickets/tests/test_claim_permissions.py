import pytest

from dggcrm.tickets.permissions import TicketClaimPermission


@pytest.mark.django_db
class TestClaimPermission:
    def test_unauthenticated_denied(self, rf, assigned_ticket):
        request = rf.get("/")
        request.user = None

        perm = TicketClaimPermission()
        assert not perm.has_object_permission(request, None, assigned_ticket)

    def test_superuser(self, rf, admin_user, assigned_ticket):
        request = rf.get("/")
        request.user = admin_user

        perm = TicketClaimPermission()
        assert perm.has_object_permission(request, None, assigned_ticket)

    def test_claim_requires_permission(
        self,
        rf,
        regular_user,
        unassigned_ticket,
    ):
        request = rf.post("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert not perm.has_object_permission(request, None, unassigned_ticket)

    def test_claim_unassigned_allowed(
        self,
        rf,
        regular_user,
        unassigned_ticket,
        claim_ticket_permission,
    ):
        regular_user.user_permissions.add(claim_ticket_permission)

        request = rf.post("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert perm.has_object_permission(request, None, unassigned_ticket)

    def test_claim_assigned_denied(
        self,
        rf,
        regular_user,
        assigned_ticket,
        claim_ticket_permission,
    ):
        regular_user.user_permissions.add(claim_ticket_permission)

        request = rf.post("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert not perm.has_object_permission(request, None, assigned_ticket)

    def test_unclaim_own_ticket_allowed(
        self,
        rf,
        regular_user,
        assigned_ticket,
        unclaim_ticket_permission,
    ):
        regular_user.user_permissions.add(unclaim_ticket_permission)

        request = rf.delete("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert perm.has_object_permission(request, None, assigned_ticket)

    def test_unclaim_no_perms_denied(
        self,
        rf,
        regular_user,
        assigned_ticket,
    ):
        request = rf.delete("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert not perm.has_object_permission(request, None, assigned_ticket)

    def test_unclaim_other_ticket_denied(
        self,
        rf,
        regular_user,
        other_assigned_ticket,
        unclaim_ticket_permission,
    ):
        regular_user.user_permissions.add(unclaim_ticket_permission)

        request = rf.delete("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert not perm.has_object_permission(request, None, other_assigned_ticket)

    def test_unclaim_any_with_assign_permission(
        self,
        rf,
        regular_user,
        other_assigned_ticket,
        unclaim_ticket_permission,
        assign_ticket_permission,
    ):
        regular_user.user_permissions.add(
            unclaim_ticket_permission,
            assign_ticket_permission,
        )

        request = rf.delete("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert perm.has_object_permission(request, None, other_assigned_ticket)

    def test_bad_method_denied(
        self,
        rf,
        regular_user,
        assigned_ticket,
    ):
        request = rf.patch("/")
        request.user = regular_user

        perm = TicketClaimPermission()
        assert not perm.has_object_permission(request, None, assigned_ticket)

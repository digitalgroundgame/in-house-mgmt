import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

from dggcrm.accounts.models import DiscordID

User = get_user_model()


@pytest.mark.django_db
class TestDiscordIDModel:
    """Tests for DiscordID model."""

    def test_create_discord_id(self, regular_user):
        """Can create a DiscordID."""
        discord_id = DiscordID.objects.create(
            user=regular_user,
            discord_id="123456789",
            active=True,
        )
        assert discord_id.discord_id == "123456789"
        assert discord_id.user == regular_user
        assert discord_id.active is True

    def test_discord_id_unique(self, regular_user):
        """discord_id must be unique."""
        from django.db import IntegrityError

        DiscordID.objects.create(
            user=regular_user,
            discord_id="123456789",
            active=True,
        )

        with pytest.raises(IntegrityError):
            DiscordID.objects.create(
                user=regular_user,
                discord_id="123456789",
                active=True,
            )


@pytest.mark.django_db
class TestDiscordIDViewSet:
    """Tests for /api/management/discord-ids/ endpoint."""

    ENDPOINT = "/api/management/discord-ids/"

    def test_list_discord_ids(self, authenticated_client, regular_user):
        """Can list DiscordIDs."""
        DiscordID.objects.create(user=regular_user, discord_id="111", active=True)

        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        assert len(response.json()["results"]) >= 1

    def test_create_discord_id(self, authenticated_client, regular_user):
        """Can create a DiscordID."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {"user": regular_user.id, "discord_id": "999999999", "active": True},
            format="json",
        )

        assert response.status_code == 201
        assert response.json()["discord_id"] == "999999999"

    def test_update_discord_id(self, authenticated_client, regular_user):
        """Can update a DiscordID."""
        discord_id = DiscordID.objects.create(user=regular_user, discord_id="111", active=True)

        response = authenticated_client.patch(
            f"{self.ENDPOINT}{discord_id.id}/",
            {"discord_id": "222222222", "active": False},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["discord_id"] == "222222222"
        assert response.json()["active"] is False

    def test_delete_discord_id(self, authenticated_client, regular_user):
        """Can delete a DiscordID when user has email."""
        EmailAddress.objects.create(user=regular_user, email="test@example.com", primary=True, verified=True)
        discord_id = DiscordID.objects.create(user=regular_user, discord_id="111", active=True)

        response = authenticated_client.delete(f"{self.ENDPOINT}{discord_id.id}/")

        assert response.status_code == 204
        assert not DiscordID.objects.filter(pk=discord_id.pk).exists()

    def test_unauthenticated_returns_403(self, api_client):
        """Unauthenticated requests return 403."""
        response = api_client.get(self.ENDPOINT)
        assert response.status_code == 403


@pytest.mark.django_db
class TestUserSerializerRequiredFields:
    """Tests for UserSerializer validation - email OR discord_id required."""

    ENDPOINT = "/api/management/users/"

    def test_create_user_with_email(self, authenticated_client):
        """Can create user with email only."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {"username": "email_user", "email": "test@example.com"},
            format="json",
        )

        assert response.status_code == 201

    def test_create_user_with_discord_id(self, authenticated_client):
        """Can create user with discord_id only."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {"username": "discord_user", "discord_id": "123456789"},
            format="json",
        )

        assert response.status_code == 201

    def test_create_user_without_auth_fails(self, authenticated_client):
        """Cannot create user without email or discord_id."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {"username": "no_auth_user"},
            format="json",
        )

        assert response.status_code == 400
        assert "Either email or Discord ID is required" in response.json()["detail"][0]

    def test_create_user_with_both_email_and_discord(self, authenticated_client):
        """Can create user with both email and discord_id."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {"username": "both_user", "email": "both@example.com", "discord_id": "111"},
            format="json",
        )

        assert response.status_code == 201


@pytest.mark.django_db
class TestUpdateUserSerializerRequiredFields:
    """Tests for UpdateUserSerializer validation - preventing lockout."""

    def test_update_groups_without_check(self, authenticated_client, regular_user, sample_groups):
        """Can update groups without triggering auth check."""
        EmailAddress.objects.create(user=regular_user, email="regular@example.com", primary=True, verified=True)

        response = authenticated_client.patch(
            f"/api/management/users/{regular_user.id}/",
            {"groups": ["ORGANIZER"]},
            format="json",
        )

        assert response.status_code == 200

    def test_cannot_remove_email_without_discord(self, authenticated_client, regular_user):
        """Cannot remove email if user has no discord_id."""
        EmailAddress.objects.create(user=regular_user, email="test@example.com", primary=True, verified=True)

        response = authenticated_client.patch(
            f"/api/management/users/{regular_user.id}/",
            {"email": ""},
            format="json",
        )

        assert response.status_code == 400
        assert "no authentication method" in response.json()["detail"][0]

    def test_can_remove_email_with_discord(self, authenticated_client, regular_user):
        """Can remove email if user has discord_id."""
        EmailAddress.objects.create(user=regular_user, email="test@example.com", primary=True, verified=True)
        DiscordID.objects.create(user=regular_user, discord_id="123", active=True)

        response = authenticated_client.patch(
            f"/api/management/users/{regular_user.id}/",
            {"email": ""},
            format="json",
        )

        assert response.status_code == 200

    def test_cannot_remove_discord_id_without_email(self, authenticated_client, regular_user):
        """Cannot remove discord_id if user has no email."""
        DiscordID.objects.create(user=regular_user, discord_id="123", active=True)

        response = authenticated_client.patch(
            f"/api/management/users/{regular_user.id}/",
            {"discord_id": ""},
            format="json",
        )

        assert response.status_code == 400
        assert "no authentication method" in response.json()["detail"][0]

    def test_can_remove_discord_id_with_email(self, authenticated_client, regular_user):
        """Can remove discord_id if user has email."""
        EmailAddress.objects.create(user=regular_user, email="test@example.com", primary=True, verified=True)
        DiscordID.objects.create(user=regular_user, discord_id="123", active=True)

        response = authenticated_client.patch(
            f"/api/management/users/{regular_user.id}/",
            {"discord_id": ""},
            format="json",
        )

        assert response.status_code == 200


@pytest.mark.django_db
class TestDeleteDiscordIDPreventsLockout:
    """Tests for DELETE /api/management/discord-ids/{id}/ preventing lockout."""

    def test_cannot_delete_last_auth_method(self, authenticated_client, regular_user):
        """Cannot delete DiscordID if user has no email."""
        discord_id = DiscordID.objects.create(user=regular_user, discord_id="123", active=True)

        response = authenticated_client.delete(f"/api/management/discord-ids/{discord_id.id}/")

        assert response.status_code == 400
        assert "no authentication method" in response.json()["detail"][0]

    def test_can_delete_if_user_has_email(self, authenticated_client, regular_user):
        """Can delete DiscordID if user has email."""
        EmailAddress.objects.create(user=regular_user, email="test@example.com", primary=True, verified=True)
        discord_id = DiscordID.objects.create(user=regular_user, discord_id="123", active=True)

        response = authenticated_client.delete(f"/api/management/discord-ids/{discord_id.id}/")

        assert response.status_code == 204


@pytest.mark.django_db
class TestManagedUserIncludesDiscordIDs:
    """Tests for DiscordID in user list."""

    ENDPOINT = "/api/management/users/"

    def test_user_includes_discord_ids(self, authenticated_client, regular_user):
        """User objects include their discord_ids."""
        DiscordID.objects.create(user=regular_user, discord_id="111", active=True)
        DiscordID.objects.create(user=regular_user, discord_id="222", active=False)

        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = response.json()["results"]
        user = next(u for u in users if u["username"] == "regular")

        assert "discord_ids" in user
        ids = {d["discord_id"]: d["active"] for d in user["discord_ids"]}
        assert ids.get("111") is True
        assert ids.get("222") is False

    def test_user_without_discord_ids(self, authenticated_client, regular_user):
        """User without discord_ids returns empty list."""
        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = response.json()["results"]
        user = next(u for u in users if u["username"] == "regular")

        assert user["discord_ids"] == []

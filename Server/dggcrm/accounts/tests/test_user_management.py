import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestGroupListView:
    """Tests for GET /api/management/groups/"""

    ENDPOINT = "/api/management/groups/"

    def test_lists_all_groups(self, authenticated_client, sample_groups):
        """Returns all groups."""
        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        names = {g["name"] for g in data}
        assert names == {"ORGANIZER", "HELPER", "TRAINEE"}

    def test_groups_ordered_by_name(self, authenticated_client, sample_groups):
        """Groups are returned ordered by name."""
        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        names = [g["name"] for g in data]
        assert names == sorted(names)

    def test_unauthenticated_returns_403(self, api_client, sample_groups):
        """Unauthenticated requests are rejected."""
        response = api_client.get(self.ENDPOINT)
        assert response.status_code == 403

    def test_nonadmin_returns_403(self, nonadmin_client, sample_groups):
        """Non-admin users are rejected."""
        response = nonadmin_client.get(self.ENDPOINT)
        assert response.status_code == 403


@pytest.mark.django_db
class TestManagedUserListView:
    """Tests for GET /api/management/users/"""

    ENDPOINT = "/api/management/users/"

    def _get_users(self, response):
        """Extract users from paginated response."""
        data = response.json()
        if isinstance(data, list):
            return data
        return data.get("results", [])

    def test_lists_all_users(self, authenticated_client, regular_user):
        """Returns all users."""
        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = self._get_users(response)
        assert len(users) >= 2  # admin and regular_user
        usernames = {u["username"] for u in users}
        assert "admin" in usernames
        assert "regular" in usernames

    def test_user_includes_groups(self, authenticated_client, regular_user, sample_groups):
        """User objects include their group memberships."""
        regular_user.groups.add(sample_groups[0])  # ORGANIZER

        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = self._get_users(response)
        regular = next(u for u in users if u["username"] == "regular")
        assert "ORGANIZER" in regular["groups"]

    def test_user_includes_email(self, authenticated_client, regular_user):
        """User objects include their primary email."""
        EmailAddress.objects.create(
            user=regular_user,
            email="regular@example.com",
            primary=True,
            verified=True,
        )

        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = self._get_users(response)
        regular = next(u for u in users if u["username"] == "regular")
        assert regular["primary_email"] == "regular@example.com"

    def test_user_without_email(self, authenticated_client, regular_user):
        """User without email returns empty string."""
        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = self._get_users(response)
        regular = next(u for u in users if u["username"] == "regular")
        assert regular["primary_email"] == ""

    def test_superuser_flag(self, authenticated_client, admin_user, regular_user):
        """Superuser is marked with is_superuser flag."""
        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = self._get_users(response)
        admin = next(u for u in users if u["username"] == "admin")
        regular = next(u for u in users if u["username"] == "regular")

        assert admin["is_superuser"] is True
        assert regular["is_superuser"] is False

    def test_is_active_flag(self, authenticated_client, regular_user):
        """Users include is_active flag."""
        regular_user.is_active = False
        regular_user.save()

        response = authenticated_client.get(self.ENDPOINT)

        assert response.status_code == 200
        users = self._get_users(response)
        user = next(u for u in users if u["username"] == "regular")

        assert user["is_active"] is False

    def test_unauthenticated_returns_403(self, api_client):
        """Unauthenticated requests are rejected."""
        response = api_client.get(self.ENDPOINT)
        assert response.status_code == 403

    def test_nonadmin_returns_403(self, nonadmin_client):
        """Non-admin users are rejected."""
        response = nonadmin_client.get(self.ENDPOINT)
        assert response.status_code == 403


@pytest.mark.django_db
class TestManagedUserUpdateView:
    """Tests for PATCH /api/management/users/{id}/"""

    def test_update_user_groups(self, authenticated_client, regular_user, sample_groups):
        """Can update user's group memberships."""
        endpoint = f"/api/management/users/{regular_user.id}/"
        response = authenticated_client.patch(
            endpoint,
            {"groups": ["ORGANIZER"]},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["groups"] == ["ORGANIZER"]
        assert data["is_superuser"] is False

        regular_user.refresh_from_db()
        assert list(regular_user.groups.values_list("name", flat=True)) == ["ORGANIZER"]

    def test_superuser_preserved_on_group_update(self, authenticated_client, admin_user, sample_groups):
        """Updating groups preserves superuser status."""
        endpoint = f"/api/management/users/{admin_user.id}/"
        response = authenticated_client.patch(
            endpoint,
            {"groups": ["ORGANIZER"]},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_superuser"] is True

        admin_user.refresh_from_db()
        assert admin_user.is_superuser is True


@pytest.mark.django_db
class TestToggleUserActiveView:
    """Tests for POST /api/management/users/{id}/toggle-active/"""

    def test_disable_active_user(self, authenticated_client, regular_user):
        """Can disable an active user."""
        assert regular_user.is_active is True
        endpoint = f"/api/management/users/{regular_user.id}/toggle-active/"

        response = authenticated_client.post(endpoint)

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

        regular_user.refresh_from_db()
        assert regular_user.is_active is False

    def test_enable_inactive_user(self, authenticated_client, regular_user):
        """Can enable an inactive user."""
        regular_user.is_active = False
        regular_user.save()

        endpoint = f"/api/management/users/{regular_user.id}/toggle-active/"

        response = authenticated_client.post(endpoint)

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is True

        regular_user.refresh_from_db()
        assert regular_user.is_active is True

    def test_toggle_user_not_found(self, authenticated_client):
        """Returns 404 for non-existent user."""
        endpoint = "/api/management/users/99999/toggle-active/"

        response = authenticated_client.post(endpoint)

        assert response.status_code == 404

    def test_unauthenticated_returns_403(self, api_client, regular_user):
        """Unauthenticated requests are rejected."""
        endpoint = f"/api/management/users/{regular_user.id}/toggle-active/"
        response = api_client.post(endpoint)
        assert response.status_code == 403

    def test_nonadmin_returns_403(self, nonadmin_client, regular_user):
        """Non-admin users are rejected."""
        endpoint = f"/api/management/users/{regular_user.id}/toggle-active/"
        response = nonadmin_client.post(endpoint)
        assert response.status_code == 403

    def test_cannot_disable_self(self, authenticated_client, admin_user):
        """Admin cannot disable themselves."""
        endpoint = f"/api/management/users/{admin_user.id}/toggle-active/"

        response = authenticated_client.post(endpoint)

        assert response.status_code == 400
        assert "cannot disable yourself" in response.json()["detail"].lower()

    def test_clear_user_groups(self, authenticated_client, regular_user, sample_groups):
        """Can clear user's group memberships."""
        regular_user.groups.add(sample_groups[0])  # ORGANIZER
        endpoint = f"/api/management/users/{regular_user.id}/"

        response = authenticated_client.patch(
            endpoint,
            {"groups": []},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["groups"] == []

    def test_update_with_invalid_group(self, authenticated_client, regular_user):
        """Invalid group names are silently ignored."""
        endpoint = f"/api/management/users/{regular_user.id}/"
        response = authenticated_client.patch(
            endpoint,
            {"groups": ["NONEXISTENT_GROUP"]},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["groups"] == []

    def test_user_not_found(self, authenticated_client):
        """Returns 404 for non-existent user."""
        endpoint = "/api/management/users/99999/"
        response = authenticated_client.patch(endpoint, {"groups": []}, format="json")

        assert response.status_code == 404

    def test_update_groups_unauthenticated_returns_403(self, api_client, regular_user):
        """Unauthenticated requests are rejected for group updates."""
        endpoint = f"/api/management/users/{regular_user.id}/"
        response = api_client.patch(endpoint, {"groups": []}, format="json")
        assert response.status_code == 403

    def test_update_groups_nonadmin_returns_403(self, nonadmin_client, regular_user):
        """Non-admin users are rejected for group updates."""
        endpoint = f"/api/management/users/{regular_user.id}/"
        response = nonadmin_client.patch(endpoint, {"groups": []}, format="json")
        assert response.status_code == 403


@pytest.mark.django_db
class TestCreateUserView:
    """Tests for POST /api/management/users/"""

    ENDPOINT = "/api/management/users/"

    def test_create_user_with_email(self, authenticated_client):
        """Can create a new user with email."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["primary_email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert data["last_name"] == "User"

        assert User.objects.filter(username="newuser").exists()
        email = EmailAddress.objects.get(email="newuser@example.com")
        assert email.primary is True
        assert email.verified is True

    def test_create_user_with_groups(self, authenticated_client, sample_groups):
        """Can create a new user with group memberships."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "organizer_user",
                "email": "organizer@example.com",
                "groups": ["ORGANIZER"],
            },
            format="json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["groups"] == ["ORGANIZER"]

        user = User.objects.get(username="organizer_user")
        assert list(user.groups.values_list("name", flat=True)) == ["ORGANIZER"]

    def test_create_user_default_no_group(self, authenticated_client):
        """New user has no group by default."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "nogroup_user",
                "email": "nogroup@example.com",
            },
            format="json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["groups"] == []

    def test_duplicate_username_fails(self, authenticated_client, regular_user):
        """Cannot create user with duplicate username."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "regular",  # Same as regular_user
                "email": "different@example.com",
            },
            format="json",
        )

        assert response.status_code == 400

    def test_duplicate_email_fails(self, authenticated_client, regular_user):
        """Cannot create user with duplicate email."""
        EmailAddress.objects.create(
            user=regular_user,
            email="taken@example.com",
            primary=True,
            verified=True,
        )

        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "newuser",
                "email": "taken@example.com",
            },
            format="json",
        )

        assert response.status_code == 400

    def test_missing_username_fails(self, authenticated_client):
        """Username is required."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "email": "test@example.com",
            },
            format="json",
        )

        assert response.status_code == 400

    def test_invalid_email_fails(self, authenticated_client):
        """Invalid email is rejected."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "testuser",
                "email": "not-an-email",
            },
            format="json",
        )

        assert response.status_code == 400

    def test_created_user_not_superuser(self, authenticated_client):
        """Created users are not superusers by default."""
        response = authenticated_client.post(
            self.ENDPOINT,
            {
                "username": "newuser",
                "email": "newuser@example.com",
            },
            format="json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["is_superuser"] is False

        user = User.objects.get(username="newuser")
        assert user.is_superuser is False

    def test_unauthenticated_returns_403(self, api_client):
        """Unauthenticated requests are rejected."""
        response = api_client.post(
            self.ENDPOINT,
            {
                "username": "newuser",
                "email": "newuser@example.com",
            },
            format="json",
        )
        assert response.status_code == 403

    def test_nonadmin_returns_403(self, nonadmin_client):
        """Non-admin users are rejected."""
        response = nonadmin_client.post(
            self.ENDPOINT,
            {
                "username": "newuser",
                "email": "newuser@example.com",
            },
            format="json",
        )
        assert response.status_code == 403

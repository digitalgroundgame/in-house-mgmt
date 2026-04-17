import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()


@pytest.fixture
def api_client():
    """Returns a DRF API test client."""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def regular_user(db):
    """Returns a regular (non-admin) user."""
    return User.objects.create_user(username="regular", password="testpass123")


@pytest.fixture
def admin_user(db):
    """Returns an admin (superuser) user."""
    return User.objects.create_superuser(username="admin", password="testpass123")


@pytest.fixture
def authenticated_client(api_client, admin_user):
    """Returns an authenticated API client with admin user."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def nonadmin_client(api_client, regular_user):
    """Returns an authenticated API client with regular user."""
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.fixture
def sample_group(db):
    """Creates a sample group."""
    group = Group.objects.create(name="ORGANIZER")
    return group


@pytest.fixture
def sample_groups(db):
    """Creates sample groups."""
    groups = []
    for name in ["ORGANIZER", "HELPER", "TRAINEE"]:
        groups.append(Group.objects.create(name=name))
    return groups

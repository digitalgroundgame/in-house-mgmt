import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from dggcrm.contacts.models import Contact, Tag, TagAssignments

User = get_user_model()


@pytest.fixture
def api_client():
    """Returns a DRF API test client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, db):
    """Returns an authenticated API client."""
    user = User.objects.create_user(username="testuser", email="test@example.com", password="testpass123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def sample_contacts(db):
    """Creates sample contacts with Discord IDs."""
    contacts = [
        Contact.objects.create(
            full_name="Alice Member",
            discord_id="100000000000000001",
            email="alice@example.com",
        ),
        Contact.objects.create(
            full_name="Bob Member",
            discord_id="100000000000000002",
            email="bob@example.com",
        ),
        Contact.objects.create(
            full_name="Charlie NonMember",
            discord_id="100000000000000003",
            email="charlie@example.com",
        ),
        Contact.objects.create(
            full_name="No Discord",
            discord_id="",
            email="nodiscord@example.com",
        ),
    ]
    return contacts


@pytest.mark.django_db
class TestSyncMembershipTagsView:
    """Tests for POST /api/discord/sync-membership/"""

    ENDPOINT = "/api/discord/sync-membership/"

    def test_unauthenticated_returns_401(self, api_client, patch_discord_client):
        """Unauthenticated requests are rejected."""
        with patch_discord_client(member_ids=set()):
            response = api_client.post(self.ENDPOINT)

        assert response.status_code in (401, 403)

    def test_returns_503_when_discord_disabled(self, authenticated_client, patch_discord_client):
        """Returns 503 when Discord client is not configured."""
        with patch_discord_client(disabled=True):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 503
        assert response.json()["error"] == "Discord bot not configured"

    def test_adds_tags_for_discord_members(self, authenticated_client, sample_contacts, patch_discord_client):
        """Adds membership tag to contacts who are Discord guild members."""
        # Alice and Bob are members, Charlie is not
        member_ids = {"100000000000000001", "100000000000000002"}

        with patch_discord_client(member_ids=member_ids):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert data["members_fetched"] == 2
        assert data["tags_added"] == 2
        assert data["tags_removed"] == 0

        # Verify tags were created
        tag = Tag.objects.get(name="DGG Discord")
        alice, bob, charlie, _ = sample_contacts
        assert TagAssignments.objects.filter(contact=alice, tag=tag).exists()
        assert TagAssignments.objects.filter(contact=bob, tag=tag).exists()
        assert not TagAssignments.objects.filter(contact=charlie, tag=tag).exists()

    def test_removes_tags_for_non_members(self, authenticated_client, sample_contacts, patch_discord_client):
        """Removes membership tag from contacts who left the Discord guild."""
        alice, bob, charlie, _ = sample_contacts

        # Pre-existing tag on all three contacts with discord_id
        tag = Tag.objects.create(name="DGG Discord")
        TagAssignments.objects.create(contact=alice, tag=tag)
        TagAssignments.objects.create(contact=bob, tag=tag)
        TagAssignments.objects.create(contact=charlie, tag=tag)

        # Only Alice is still a member
        member_ids = {"100000000000000001"}

        with patch_discord_client(member_ids=member_ids):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert data["tags_added"] == 0
        assert data["tags_removed"] == 2

        # Verify Bob and Charlie's tags were removed
        assert TagAssignments.objects.filter(contact=alice, tag=tag).exists()
        assert not TagAssignments.objects.filter(contact=bob, tag=tag).exists()
        assert not TagAssignments.objects.filter(contact=charlie, tag=tag).exists()

    def test_ignores_contacts_without_discord_id(self, authenticated_client, sample_contacts, patch_discord_client):
        """Contacts without discord_id are not affected."""
        # All Discord IDs are members
        member_ids = {"100000000000000001", "100000000000000002", "100000000000000003"}

        with patch_discord_client(member_ids=member_ids):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200

        # Contact without discord_id should have no tag
        tag = Tag.objects.get(name="DGG Discord")
        no_discord_contact = sample_contacts[3]  # "No Discord" contact
        assert not TagAssignments.objects.filter(contact=no_discord_contact, tag=tag).exists()

    def test_idempotent_sync(self, authenticated_client, sample_contacts, patch_discord_client):
        """Running sync twice produces the same result."""
        member_ids = {"100000000000000001", "100000000000000002"}

        # First sync
        with patch_discord_client(member_ids=member_ids):
            response1 = authenticated_client.post(self.ENDPOINT)

        assert response1.json()["tags_added"] == 2

        # Second sync - should be idempotent
        with patch_discord_client(member_ids=member_ids):
            response2 = authenticated_client.post(self.ENDPOINT)

        assert response2.json()["tags_added"] == 0
        assert response2.json()["tags_removed"] == 0

    def test_handles_empty_guild(self, authenticated_client, sample_contacts, patch_discord_client):
        """Handles case when no members are returned from Discord."""
        alice, _, _, _ = sample_contacts

        # Pre-existing tag
        tag = Tag.objects.create(name="DGG Discord")
        TagAssignments.objects.create(contact=alice, tag=tag)

        with patch_discord_client(member_ids=set()):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert data["members_fetched"] == 0
        assert data["tags_removed"] == 1

    def test_creates_tag_if_not_exists(self, authenticated_client, sample_contacts, patch_discord_client):
        """Creates the membership tag if it doesn't exist."""
        assert not Tag.objects.filter(name="DGG Discord").exists()

        with patch_discord_client(member_ids={"100000000000000001"}):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        assert Tag.objects.filter(name="DGG Discord").exists()

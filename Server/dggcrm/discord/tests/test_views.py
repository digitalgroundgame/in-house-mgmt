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
def nonadmin_client(api_client, db):
    """Returns an authenticated API client."""
    user = User.objects.create_user(username="regular", password="testpass123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def authenticated_client(api_client, db):
    """Returns an authenticated API client."""
    user = User.objects.create_superuser(username="admin", password="testpass123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def event_tracker_user(db):
    """
    CRM user linked via DiscordID to "100000000000000001" (the event_tracker
    used in the RecordAttendanceView test payloads), holding
    events.record_attendance through an Organizers group. Required for any
    test that should pass the per-user authorization layer.
    """
    from django.contrib.auth.models import Group, Permission

    from dggcrm.accounts.models import DiscordID

    user = User.objects.create_user(username="tracker", password="x")
    DiscordID.objects.create(user=user, discord_id="100000000000000001")
    group, _ = Group.objects.get_or_create(name="Organizers")
    perm = Permission.objects.get(codename="record_attendance")
    group.permissions.add(perm)
    user.groups.add(group)
    return user


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

    def test_nonadmin_returns_401(self, nonadmin_client, patch_discord_client):
        """Unauthenticated requests are rejected."""
        with patch_discord_client(member_ids=set()):
            response = nonadmin_client.post(self.ENDPOINT)

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
        assert data["membership_tags"]["added"] == 2
        assert data["membership_tags"]["removed"] == 0

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
        assert data["membership_tags"]["added"] == 0
        assert data["membership_tags"]["removed"] == 2

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

        assert response1.json()["membership_tags"]["added"] == 2

        # Second sync - should be idempotent
        with patch_discord_client(member_ids=member_ids):
            response2 = authenticated_client.post(self.ENDPOINT)

        assert response2.json()["membership_tags"]["added"] == 0
        assert response2.json()["membership_tags"]["removed"] == 0

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
        assert data["membership_tags"]["removed"] == 1

    def test_creates_tag_if_not_exists(self, authenticated_client, sample_contacts, patch_discord_client):
        """Creates the membership tag if it doesn't exist."""
        assert not Tag.objects.filter(name="DGG Discord").exists()

        with patch_discord_client(member_ids={"100000000000000001"}):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        assert Tag.objects.filter(name="DGG Discord").exists()


@pytest.mark.django_db
class TestSyncMembershipRolesTags:
    """Tests for role tag syncing in POST /api/discord/sync-membership/"""

    ENDPOINT = "/api/discord/sync-membership/"

    def test_creates_role_tags_from_discord_roles(self, authenticated_client, sample_contacts, patch_discord_client):
        """Creates tags from Discord roles."""
        roles = [
            {"id": "111", "name": "Moderator", "color": 3447003},
            {"id": "222", "name": "VIP", "color": 15158332},
        ]
        members_with_roles = [
            {"id": "100000000000000001", "display_name": "Alice Member", "role_ids": ["111"]},
            {"id": "100000000000000002", "display_name": "Bob Member", "role_ids": ["222"]},
        ]

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert data["roles_fetched"] == 2
        assert data["role_tags"]["added"] == 2

        assert Tag.objects.filter(name="Moderator").exists()
        assert Tag.objects.filter(name="VIP").exists()

    def test_assigns_role_tags_to_members(self, authenticated_client, sample_contacts, patch_discord_client):
        """Assigns role tags to contacts based on their Discord roles."""
        roles = [{"id": "111", "name": "Moderator", "color": 0}]
        members_with_roles = [
            {"id": "100000000000000001", "display_name": "Alice Member", "role_ids": ["111"]},
            {"id": "100000000000000002", "display_name": "Bob Member", "role_ids": []},
        ]

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200

        alice, bob, _, _ = sample_contacts
        mod_tag = Tag.objects.get(name="Moderator")
        assert TagAssignments.objects.filter(contact=alice, tag=mod_tag).exists()
        assert not TagAssignments.objects.filter(contact=bob, tag=mod_tag).exists()

    def test_updates_role_tag_color(self, authenticated_client, patch_discord_client):
        """Updates existing role tag color when Discord role color changes."""
        Tag.objects.create(name="Moderator", color="#000000")

        roles = [{"id": "111", "name": "Moderator", "color": 3447003}]
        members_with_roles = []

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200

        mod_tag = Tag.objects.get(name="Moderator")
        assert mod_tag.color == "#3498db"

    def test_removes_role_tags_for_former_members(self, authenticated_client, sample_contacts, patch_discord_client):
        """Removes role tags from contacts who left the guild."""
        alice, _, _, _ = sample_contacts

        mod_tag = Tag.objects.create(name="Moderator")
        TagAssignments.objects.create(contact=alice, tag=mod_tag)

        roles = [{"id": "111", "name": "Moderator", "color": 0}]
        members_with_roles = []

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert data["role_tags"]["removed"] == 1
        assert not TagAssignments.objects.filter(contact=alice, tag=mod_tag).exists()

    def test_removes_role_tags_when_role_removed_from_member(
        self, authenticated_client, sample_contacts, patch_discord_client
    ):
        """Removes role tags when member no longer has that role."""
        alice, _, _, _ = sample_contacts

        mod_tag = Tag.objects.create(name="Moderator")
        TagAssignments.objects.create(contact=alice, tag=mod_tag)

        roles = [{"id": "111", "name": "Moderator", "color": 0}]
        members_with_roles = [
            {"id": "100000000000000001", "display_name": "Alice Member", "role_ids": []},
        ]

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response = authenticated_client.post(self.ENDPOINT)

        assert response.status_code == 200
        data = response.json()
        assert data["role_tags"]["removed"] == 1
        assert not TagAssignments.objects.filter(contact=alice, tag=mod_tag).exists()

    def test_role_tags_idempotent(self, authenticated_client, sample_contacts, patch_discord_client):
        """Running sync twice for roles produces the same result."""
        roles = [{"id": "111", "name": "Moderator", "color": 0}]
        members_with_roles = [
            {"id": "100000000000000001", "display_name": "Alice Member", "role_ids": ["111"]},
        ]

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response1 = authenticated_client.post(self.ENDPOINT)

        assert response1.json()["role_tags"]["added"] == 1

        with patch_discord_client(members_with_roles=members_with_roles, roles=roles):
            response2 = authenticated_client.post(self.ENDPOINT)

        assert response2.json()["role_tags"]["added"] == 0
        assert response2.json()["role_tags"]["removed"] == 0


@pytest.mark.django_db
class TestRecordAttendanceView:
    ENDPOINT = "/api/discord/record-attendance/"

    def _payload(self, **overrides):
        base = {
            "event_id": "evt-1",
            "event_name": "Scrim Night",
            "event_tracker": "100000000000000001",
            "participants": [
                {
                    "discord_id": "100000000000000001",
                    "discord_name": "Alice",
                    "status": "ATTENDED",
                },
                {
                    "discord_id": "100000000000000002",
                    "discord_name": "Bob",
                    "status": "ATTENDED",
                },
                {
                    "discord_id": "999999999999999999",
                    "discord_name": "Stranger",
                    "status": "ATTENDED",
                },
            ],
        }
        base.update(overrides)
        return base

    def test_requires_authentication(self, api_client):
        response = api_client.post(self.ENDPOINT, self._payload(), format="json")
        assert response.status_code in (401, 403)

    def test_rejects_non_admin_non_bot_user(self, nonadmin_client):
        response = nonadmin_client.post(self.ENDPOINT, self._payload(), format="json")
        assert response.status_code == 403

    def test_allows_discord_bot_group_user(self, api_client, sample_contacts, event_tracker_user, db):
        from django.contrib.auth.models import Group

        bot = User.objects.create_user(username="bot-user", password="x")
        group, _ = Group.objects.get_or_create(name="DISCORD_BOT")
        bot.groups.add(group)
        api_client.force_authenticate(user=bot)

        response = api_client.post(self.ENDPOINT, self._payload(), format="json")
        assert response.status_code == 200

    def test_stages_all_participants_and_reports_unknowns(
        self, authenticated_client, sample_contacts, event_tracker_user
    ):
        response = authenticated_client.post(self.ENDPOINT, self._payload(), format="json")

        assert response.status_code == 200
        body = response.json()
        assert body["event_id"] == "evt-1"
        assert body["total_received"] == 3
        assert body["unlinked_participants"] == [{"discord_id": "999999999999999999", "discord_name": "Stranger"}]

    def test_stages_all_participants_in_db_including_unknown(
        self, authenticated_client, sample_contacts, event_tracker_user
    ):
        from dggcrm.events.models import StagedEvent

        authenticated_client.post(self.ENDPOINT, self._payload(), format="json")

        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        assert staged.event_name == "Scrim Night"
        assert staged.event_tracker_discord_id == "100000000000000001"

        participant_discord_ids = set(staged.participants.values_list("discord_id", flat=True))
        assert participant_discord_ids == {
            "100000000000000001",
            "100000000000000002",
            "999999999999999999",
        }

        for p in staged.participants.all():
            assert p.imported_at is None

    def test_retry_with_same_payload_is_idempotent(self, authenticated_client, sample_contacts, event_tracker_user):
        from dggcrm.events.models import StagedEvent

        first = authenticated_client.post(self.ENDPOINT, self._payload(), format="json")
        assert first.status_code == 200

        second = authenticated_client.post(self.ENDPOINT, self._payload(), format="json")
        assert second.status_code == 200

        assert StagedEvent.objects.filter(discord_event_id="evt-1").count() == 1
        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        assert staged.event_name == "Scrim Night"
        participant_ids = set(staged.participants.values_list("discord_id", flat=True))
        assert participant_ids == {
            "100000000000000001",
            "100000000000000002",
            "999999999999999999",
        }

    def test_retry_preserves_imported_participants(self, authenticated_client, sample_contacts, event_tracker_user):
        from django.utils import timezone

        from dggcrm.events.models import StagedEvent

        authenticated_client.post(self.ENDPOINT, self._payload(), format="json")

        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        imported_time = timezone.now()
        staged.participants.filter(discord_id="100000000000000001").update(imported_at=imported_time)

        authenticated_client.post(self.ENDPOINT, self._payload(), format="json")

        alice = staged.participants.get(discord_id="100000000000000001")
        assert alice.imported_at is not None
        assert staged.participants.count() == 3

    def test_retry_refreshes_discord_name_on_imported_rows(
        self, authenticated_client, sample_contacts, event_tracker_user
    ):
        from django.utils import timezone

        from dggcrm.events.models import StagedEvent

        authenticated_client.post(self.ENDPOINT, self._payload(), format="json")
        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        staged.participants.filter(discord_id="100000000000000001").update(imported_at=timezone.now())

        renamed_payload = self._payload()
        renamed_payload["participants"][0]["discord_name"] = "Alice (Renamed)"
        authenticated_client.post(self.ENDPOINT, renamed_payload, format="json")

        alice = staged.participants.get(discord_id="100000000000000001")
        assert alice.discord_name == "Alice (Renamed)"
        assert alice.imported_at is not None

    def test_accepts_empty_participants(self, authenticated_client, event_tracker_user):
        from dggcrm.events.models import StagedEvent

        response = authenticated_client.post(
            self.ENDPOINT,
            self._payload(participants=[]),
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["total_received"] == 0
        assert response.json()["unlinked_participants"] == []

        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        assert staged.participants.count() == 0

    def test_rejects_duplicate_participant_discord_ids(self, authenticated_client, sample_contacts, event_tracker_user):
        payload = self._payload(
            participants=[
                {
                    "discord_id": "100000000000000001",
                    "discord_name": "Alice",
                    "status": "ATTENDED",
                },
                {
                    "discord_id": "100000000000000001",
                    "discord_name": "Alice Again",
                    "status": "ATTENDED",
                },
            ]
        )
        response = authenticated_client.post(self.ENDPOINT, payload, format="json")
        assert response.status_code == 400

    def test_rejects_invalid_status(self, authenticated_client, sample_contacts, event_tracker_user):
        payload = self._payload(
            participants=[
                {
                    "discord_id": "100000000000000001",
                    "discord_name": "Alice",
                    "status": "MAYBE",
                },
            ]
        )
        response = authenticated_client.post(self.ENDPOINT, payload, format="json")
        assert response.status_code == 400

    def test_rejects_missing_fields(self, authenticated_client, event_tracker_user):
        response = authenticated_client.post(
            self.ENDPOINT,
            {"event_id": "evt-2", "event_tracker": "100000000000000001", "participants": []},
            format="json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestCheckAttendancePermissionView:
    """
    Pre-flight authorization endpoint the bot calls before starting an
    attendance-tracking slash command. Returns 200 with {authorized, reason}
    so the bot can render an ephemeral message; the caller is the bot, but
    the subject is a Discord user (the tracker).
    """

    ENDPOINT = "/api/discord/can-record-attendance/"

    def test_requires_authentication(self, api_client):
        response = api_client.get(self.ENDPOINT, {"discord_id": "100000000000000001"})
        assert response.status_code in (401, 403)

    def test_rejects_non_admin_non_bot_user(self, nonadmin_client):
        response = nonadmin_client.get(self.ENDPOINT, {"discord_id": "100000000000000001"})
        assert response.status_code == 403

    def test_authorized_user_returns_true(self, authenticated_client, event_tracker_user):
        response = authenticated_client.get(self.ENDPOINT, {"discord_id": "100000000000000001"})
        assert response.status_code == 200
        assert response.json() == {"authorized": True, "reason": "ok"}

    def test_unknown_discord_id_returns_unlinked(self, authenticated_client):
        response = authenticated_client.get(self.ENDPOINT, {"discord_id": "999999999999999999"})
        assert response.status_code == 200
        assert response.json() == {"authorized": False, "reason": "unlinked_discord_id"}

    def test_missing_discord_id_returns_missing_tracker(self, authenticated_client):
        response = authenticated_client.get(self.ENDPOINT)
        assert response.status_code == 200
        assert response.json() == {"authorized": False, "reason": "missing_tracker"}

    def test_linked_user_without_perm_returns_not_authorized(self, authenticated_client, db):
        from dggcrm.accounts.models import DiscordID

        bystander = User.objects.create_user(username="bystander", password="x")
        DiscordID.objects.create(user=bystander, discord_id="200000000000000001")

        response = authenticated_client.get(self.ENDPOINT, {"discord_id": "200000000000000001"})
        assert response.status_code == 200
        assert response.json() == {"authorized": False, "reason": "not_authorized"}

    def test_inactive_link_returns_unlinked(self, authenticated_client, db):
        from django.contrib.auth.models import Group, Permission

        from dggcrm.accounts.models import DiscordID

        user = User.objects.create_user(username="ex-tracker", password="x")
        DiscordID.objects.create(user=user, discord_id="300000000000000001", active=False)
        group, _ = Group.objects.get_or_create(name="Organizers")
        perm = Permission.objects.get(codename="record_attendance")
        group.permissions.add(perm)
        user.groups.add(group)

        response = authenticated_client.get(self.ENDPOINT, {"discord_id": "300000000000000001"})
        assert response.status_code == 200
        assert response.json() == {"authorized": False, "reason": "unlinked_discord_id"}

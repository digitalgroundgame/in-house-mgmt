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
            "event_tracker_discord_id": "100000000000000001",
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

        participants = list(staged.participants.all())
        assert {p.discord_id for p in participants} == {
            "100000000000000001",
            "100000000000000002",
            "999999999999999999",
        }
        assert all(p.event_tracker_crm_user_id == event_tracker_user.id for p in participants)
        assert all(p.imported_at is None for p in participants)

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
            {"event_id": "evt-2", "event_tracker_discord_id": "100000000000000001", "participants": []},
            format="json",
        )
        assert response.status_code == 400

    def test_two_trackers_same_event_keep_independent_rows(
        self, authenticated_client, sample_contacts, event_tracker_user
    ):
        """Two organizers can independently submit attendance for the same Discord event;
        each tracker's submission must not touch the other's rows."""
        from django.contrib.auth.models import Group, Permission

        from dggcrm.accounts.models import DiscordID
        from dggcrm.events.models import StagedEvent

        # Provision a second authorized tracker (Discord ID 100000000000000002).
        second_tracker = User.objects.create_user(username="tracker2", password="x")
        DiscordID.objects.create(user=second_tracker, discord_id="100000000000000002")
        org_group, _ = Group.objects.get_or_create(name="Organizers")
        org_group.permissions.add(Permission.objects.get(codename="record_attendance"))
        second_tracker.groups.add(org_group)

        # Tracker 1 submits two participants.
        authenticated_client.post(
            self.ENDPOINT,
            self._payload(
                event_tracker_discord_id="100000000000000001",
                participants=[
                    {"discord_id": "100000000000000001", "discord_name": "Alice", "status": "ATTENDED"},
                    {"discord_id": "100000000000000002", "discord_name": "Bob", "status": "ATTENDED"},
                ],
            ),
            format="json",
        )
        # Tracker 2 submits a different set (one overlapping, one new).
        authenticated_client.post(
            self.ENDPOINT,
            self._payload(
                event_tracker_discord_id="100000000000000002",
                participants=[
                    {"discord_id": "100000000000000002", "discord_name": "Bob", "status": "ATTENDED"},
                    {"discord_id": "100000000000000003", "discord_name": "Charlie", "status": "ATTENDED"},
                ],
            ),
            format="json",
        )

        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        assert StagedEvent.objects.filter(discord_event_id="evt-1").count() == 1, "shared StagedEvent row"

        t1_rows = staged.participants.filter(event_tracker_crm_user=event_tracker_user)
        t2_rows = staged.participants.filter(event_tracker_crm_user=second_tracker)
        assert {r.discord_id for r in t1_rows} == {"100000000000000001", "100000000000000002"}
        assert {r.discord_id for r in t2_rows} == {"100000000000000002", "100000000000000003"}
        assert staged.participants.count() == 4, "Bob is staged once per tracker"

    def test_tracker_retry_does_not_disturb_other_trackers_rows(
        self, authenticated_client, sample_contacts, event_tracker_user
    ):
        """Tracker A reposting a new payload must not delete or alter tracker B's pending rows."""
        from django.contrib.auth.models import Group, Permission

        from dggcrm.accounts.models import DiscordID
        from dggcrm.events.models import StagedEvent

        second_tracker = User.objects.create_user(username="tracker2", password="x")
        DiscordID.objects.create(user=second_tracker, discord_id="100000000000000002")
        org_group, _ = Group.objects.get_or_create(name="Organizers")
        org_group.permissions.add(Permission.objects.get(codename="record_attendance"))
        second_tracker.groups.add(org_group)

        authenticated_client.post(
            self.ENDPOINT,
            self._payload(
                event_tracker_discord_id="100000000000000002",
                participants=[
                    {"discord_id": "100000000000000003", "discord_name": "Charlie", "status": "ATTENDED"},
                ],
            ),
            format="json",
        )
        # Tracker 1 now posts twice with different payloads — should never touch tracker 2's row.
        for participants in (
            [{"discord_id": "100000000000000001", "discord_name": "Alice", "status": "ATTENDED"}],
            [{"discord_id": "100000000000000002", "discord_name": "Bob", "status": "ATTENDED"}],
        ):
            authenticated_client.post(
                self.ENDPOINT,
                self._payload(event_tracker_discord_id="100000000000000001", participants=participants),
                format="json",
            )

        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        t2_rows = list(staged.participants.filter(event_tracker_crm_user=second_tracker))
        assert len(t2_rows) == 1
        assert t2_rows[0].discord_id == "100000000000000003"

    def test_tracker_a_post_preserves_tracker_b_imported_rows(
        self, authenticated_client, sample_contacts, event_tracker_user
    ):
        """Tracker A submitting must not clear tracker B's already-imported rows."""
        from django.contrib.auth.models import Group, Permission
        from django.utils import timezone

        from dggcrm.accounts.models import DiscordID
        from dggcrm.events.models import StagedEvent

        second_tracker = User.objects.create_user(username="tracker2", password="x")
        DiscordID.objects.create(user=second_tracker, discord_id="100000000000000002")
        org_group, _ = Group.objects.get_or_create(name="Organizers")
        org_group.permissions.add(Permission.objects.get(codename="record_attendance"))
        second_tracker.groups.add(org_group)

        # Tracker 2 submits and gets one row promoted (imported_at set).
        authenticated_client.post(
            self.ENDPOINT,
            self._payload(
                event_tracker_discord_id="100000000000000002",
                participants=[
                    {"discord_id": "100000000000000003", "discord_name": "Charlie", "status": "ATTENDED"},
                ],
            ),
            format="json",
        )
        staged = StagedEvent.objects.get(discord_event_id="evt-1")
        staged.participants.filter(event_tracker_crm_user=second_tracker, discord_id="100000000000000003").update(
            imported_at=timezone.now()
        )

        # Tracker 1 now posts. Tracker 2's imported row must survive untouched.
        authenticated_client.post(
            self.ENDPOINT,
            self._payload(
                event_tracker_discord_id="100000000000000001",
                participants=[
                    {"discord_id": "100000000000000001", "discord_name": "Alice", "status": "ATTENDED"},
                ],
            ),
            format="json",
        )

        charlie = staged.participants.get(event_tracker_crm_user=second_tracker, discord_id="100000000000000003")
        assert charlie.imported_at is not None


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


@pytest.fixture
def import_setup(db, event_tracker_user, sample_contacts):
    """
    Provisions a target CRM Event the tracker can modify, plus a StagedEvent
    with the tracker's participants. Returns a dict with the API client
    (authed as the tracker), the target event, the tracker user, and the
    staged event. Sample contacts use Discord IDs ...001/002/003 so they
    align with the staged participants.
    """
    from datetime import timedelta

    from django.utils import timezone as dj_timezone

    from dggcrm.events.models import Event, StagedEvent, StagedEventParticipation

    target_event = Event.objects.create(
        name="Tuesday Standup",
        starts_at=dj_timezone.now(),
        ends_at=dj_timezone.now() + timedelta(hours=1),
    )
    # Make the tracker a superuser so they can change the target event.
    # Boundary cases that exercise permission checks set up their own users.
    event_tracker_user.is_superuser = True
    event_tracker_user.save()

    staged_event = StagedEvent.objects.create(
        discord_event_id="evt-1",
        event_name="Tuesday Standup (Discord)",
    )
    StagedEventParticipation.objects.create(
        staged_event=staged_event,
        event_tracker_crm_user=event_tracker_user,
        discord_id="100000000000000001",  # Alice — has CRM contact
        discord_name="Alice",
        status="ATTENDED",
    )
    StagedEventParticipation.objects.create(
        staged_event=staged_event,
        event_tracker_crm_user=event_tracker_user,
        discord_id="100000000000000002",  # Bob — has CRM contact
        discord_name="Bob",
        status="ATTENDED",
    )
    StagedEventParticipation.objects.create(
        staged_event=staged_event,
        event_tracker_crm_user=event_tracker_user,
        discord_id="999999999999999999",  # Stranger — no CRM contact
        discord_name="Stranger",
        status="ATTENDED",
    )

    client = APIClient()
    client.force_authenticate(user=event_tracker_user)
    return {
        "client": client,
        "target_event": target_event,
        "tracker": event_tracker_user,
        "staged_event": staged_event,
    }


@pytest.mark.django_db
class TestMyStagedEventsView:
    """List endpoint that powers the bulk-upload modal's dropdown."""

    ENDPOINT = "/api/discord/staged-events/mine/"

    def test_requires_authentication(self, api_client):
        response = api_client.get(self.ENDPOINT)
        assert response.status_code in (401, 403)

    def test_returns_only_events_with_my_unimported_rows(self, import_setup):
        client = import_setup["client"]
        response = client.get(self.ENDPOINT)
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["discord_event_id"] == "evt-1"
        # Two participants have CRM contacts (Alice, Bob), one doesn't (Stranger).
        assert body[0]["importable_count"] == 2
        assert body[0]["no_contact_count"] == 1

    def test_excludes_other_trackers_staged_rows(self, import_setup):
        from dggcrm.accounts.models import DiscordID
        from dggcrm.events.models import StagedEventParticipation

        # Provision a second tracker on the same staged event.
        other_tracker = User.objects.create_user(username="other-tracker", password="x")
        DiscordID.objects.create(user=other_tracker, discord_id="200000000000000001")
        StagedEventParticipation.objects.create(
            staged_event=import_setup["staged_event"],
            event_tracker_crm_user=other_tracker,
            discord_id="100000000000000003",
            discord_name="Charlie",
            status="ATTENDED",
        )
        # Authenticated as the other tracker — they only see their own row.
        api = APIClient()
        api.force_authenticate(user=other_tracker)
        response = api.get(self.ENDPOINT)
        assert response.status_code == 200
        body = response.json()
        # Other tracker has 1 row, Charlie has a CRM contact.
        assert len(body) == 1
        assert body[0]["importable_count"] == 1
        assert body[0]["no_contact_count"] == 0

    def test_excludes_staged_events_with_no_unimported_rows(self, import_setup):
        from django.utils import timezone

        from dggcrm.events.models import StagedEventParticipation

        # Mark all my rows imported.
        StagedEventParticipation.objects.filter(event_tracker_crm_user=import_setup["tracker"]).update(
            imported_at=timezone.now()
        )

        response = import_setup["client"].get(self.ENDPOINT)
        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.django_db
class TestStagedImportPreviewView:
    """Preview endpoint that populates the modal's participant table."""

    def _url(self, staged_id):
        return f"/api/discord/staged-events/{staged_id}/preview/"

    def test_classifies_rows_into_three_states(self, import_setup):
        from dggcrm.contacts.models import Contact
        from dggcrm.events.models import EventParticipation

        # Pre-add Alice as an EventParticipation so she should show "already_on_event".
        alice = Contact.objects.get(discord_id="100000000000000001")
        EventParticipation.objects.create(event=import_setup["target_event"], contact=alice)

        response = import_setup["client"].get(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
        )
        assert response.status_code == 200
        body = response.json()
        rows_by_name = {r["discord_name"]: r for r in body["participants"]}

        # Alice: has contact, already on event.
        assert rows_by_name["Alice"]["has_contact"] is True
        assert rows_by_name["Alice"]["already_on_event"] is True
        # Bob: has contact, NOT on event yet → will be added.
        assert rows_by_name["Bob"]["has_contact"] is True
        assert rows_by_name["Bob"]["already_on_event"] is False
        # Stranger: no CRM contact → grayed.
        assert rows_by_name["Stranger"]["has_contact"] is False
        assert rows_by_name["Stranger"]["already_on_event"] is False

    def test_excludes_already_imported_rows(self, import_setup):
        from django.utils import timezone

        from dggcrm.events.models import StagedEventParticipation

        StagedEventParticipation.objects.filter(
            event_tracker_crm_user=import_setup["tracker"], discord_id="100000000000000001"
        ).update(imported_at=timezone.now())

        response = import_setup["client"].get(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
        )
        assert response.status_code == 200
        names = {r["discord_name"] for r in response.json()["participants"]}
        assert "Alice" not in names
        assert names == {"Bob", "Stranger"}

    def test_400_when_target_event_id_missing(self, import_setup):
        response = import_setup["client"].get(self._url(import_setup["staged_event"].id))
        assert response.status_code == 400

    def test_403_when_user_is_not_a_tracker_on_staged_event(self, import_setup):
        outsider = User.objects.create_superuser(username="outsider", password="x")
        api = APIClient()
        api.force_authenticate(user=outsider)
        response = api.get(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
        )
        assert response.status_code == 403


@pytest.mark.django_db
class TestStagedImportExecuteView:
    """Submit endpoint that performs the import."""

    def _url(self, staged_id):
        return f"/api/discord/staged-events/{staged_id}/import/"

    def test_creates_event_participations_and_stamps_imported_at(self, import_setup):
        from dggcrm.events.models import EventParticipation, StagedEventParticipation

        response = import_setup["client"].post(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
            format="json",
        )
        assert response.status_code == 200
        assert response.json() == {"imported": 2, "already_on_event": 0, "skipped_no_contact": 1}

        # Two EventParticipations created (Alice, Bob); Stranger skipped.
        assert EventParticipation.objects.filter(event=import_setup["target_event"]).count() == 2

        # The two rows we processed were stamped imported; Stranger remains un-imported.
        my_rows = StagedEventParticipation.objects.filter(event_tracker_crm_user=import_setup["tracker"])
        imported = my_rows.filter(imported_at__isnull=False)
        unimported = my_rows.filter(imported_at__isnull=True)
        assert {r.discord_id for r in imported} == {"100000000000000001", "100000000000000002"}
        assert {r.discord_id for r in unimported} == {"999999999999999999"}

    def test_upserts_existing_event_participation(self, import_setup):
        from dggcrm.contacts.models import Contact
        from dggcrm.events.models import CommitmentStatus, EventParticipation

        # Alice already on event with a non-ATTENDED status.
        alice = Contact.objects.get(discord_id="100000000000000001")
        EventParticipation.objects.create(
            event=import_setup["target_event"],
            contact=alice,
            status=CommitmentStatus.MAYBE,
        )

        response = import_setup["client"].post(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
            format="json",
        )
        assert response.status_code == 200
        assert response.json() == {"imported": 1, "already_on_event": 1, "skipped_no_contact": 1}

        alice_part = EventParticipation.objects.get(event=import_setup["target_event"], contact=alice)
        assert alice_part.status == CommitmentStatus.ATTENDED, "upsert overwrote MAYBE with ATTENDED"

    def test_does_not_touch_other_trackers_staged_rows(self, import_setup):
        from dggcrm.accounts.models import DiscordID
        from dggcrm.events.models import StagedEventParticipation

        # Other tracker also has Bob staged for the same event.
        other = User.objects.create_user(username="other", password="x")
        DiscordID.objects.create(user=other, discord_id="200000000000000001")
        other_row = StagedEventParticipation.objects.create(
            staged_event=import_setup["staged_event"],
            event_tracker_crm_user=other,
            discord_id="100000000000000002",
            discord_name="Bob",
            status="ATTENDED",
        )

        response = import_setup["client"].post(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
            format="json",
        )
        assert response.status_code == 200

        # The other tracker's row is untouched.
        other_row.refresh_from_db()
        assert other_row.imported_at is None

    def test_400_when_target_event_id_missing(self, import_setup):
        response = import_setup["client"].post(self._url(import_setup["staged_event"].id), {}, format="json")
        assert response.status_code == 400

    def test_403_when_user_is_not_a_tracker_on_staged_event(self, import_setup):
        outsider = User.objects.create_superuser(username="outsider", password="x")
        api = APIClient()
        api.force_authenticate(user=outsider)
        response = api.post(
            self._url(import_setup["staged_event"].id),
            {"target_event_id": import_setup["target_event"].id},
            format="json",
        )
        assert response.status_code == 403

    def test_end_to_end_event_owned_by_me_with_mixed_participants(self, db, event_tracker_user):
        """
        Realistic happy path: a non-superuser tracker creates a CRM event they
        own (assigned via UsersInEvent + change_assigned_event perm), runs
        /attendance-track during the meeting, then bulk-imports. Six staged
        participants — four with CRM contacts, two without. After import the
        four CRM attendees are on the event with status ATTENDED, the two
        non-CRM rows remain staged for a future import once contacts exist,
        and the four CRM staged rows have imported_at stamped.
        """
        from datetime import timedelta

        from django.contrib.auth.models import Permission
        from django.utils import timezone as dj_timezone

        from dggcrm.contacts.models import Contact
        from dggcrm.events.models import (
            Event,
            EventParticipation,
            StagedEvent,
            StagedEventParticipation,
            UsersInEvent,
        )

        # Tracker has the event-edit permission and is assigned to the event
        # they're about to "create" — same shape as the real flow.
        event_tracker_user.user_permissions.add(Permission.objects.get(codename="change_assigned_event"))
        target_event = Event.objects.create(
            name="Friday Scrim Night",
            starts_at=dj_timezone.now(),
            ends_at=dj_timezone.now() + timedelta(hours=2),
        )
        UsersInEvent.objects.create(user=event_tracker_user, event=target_event)

        crm_attendees = [
            Contact.objects.create(full_name="Alice", discord_id="100000000000000001", email="a@x.com"),
            Contact.objects.create(full_name="Bob", discord_id="100000000000000002", email="b@x.com"),
            Contact.objects.create(full_name="Carol", discord_id="100000000000000003", email="c@x.com"),
            Contact.objects.create(full_name="Dave", discord_id="100000000000000004", email="d@x.com"),
        ]

        staged_event = StagedEvent.objects.create(
            discord_event_id="evt-friday-scrim",
            event_name="Friday Scrim (Discord)",
        )
        staged_rows = [
            ("100000000000000001", "Alice"),
            ("100000000000000002", "Bob"),
            ("100000000000000003", "Carol"),
            ("100000000000000004", "Dave"),
            ("999999999999999998", "Eve_NoContact"),
            ("999999999999999999", "Frank_NoContact"),
        ]
        for did, name in staged_rows:
            StagedEventParticipation.objects.create(
                staged_event=staged_event,
                event_tracker_crm_user=event_tracker_user,
                discord_id=did,
                discord_name=name,
                status="ATTENDED",
            )

        client = APIClient()
        client.force_authenticate(user=event_tracker_user)
        response = client.post(
            f"/api/discord/staged-events/{staged_event.id}/import/",
            {"target_event_id": target_event.id},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "imported": 4,
            "already_on_event": 0,
            "skipped_no_contact": 2,
        }

        participations = EventParticipation.objects.filter(event=target_event)
        assert participations.count() == 4
        assert {p.contact_id for p in participations} == {c.id for c in crm_attendees}
        assert all(p.status == "ATTENDED" for p in participations)

        # Non-CRM rows stayed staged; CRM rows got stamped imported.
        unimported = StagedEventParticipation.objects.filter(staged_event=staged_event, imported_at__isnull=True)
        imported = StagedEventParticipation.objects.filter(staged_event=staged_event, imported_at__isnull=False)
        assert {r.discord_id for r in unimported} == {
            "999999999999999998",
            "999999999999999999",
        }
        assert imported.count() == 4

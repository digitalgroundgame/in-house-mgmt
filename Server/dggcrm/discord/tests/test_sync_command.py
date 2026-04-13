from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from dggcrm.contacts.models import Contact, Tag, TagAssignments

PATCH_TARGET = "dggcrm.discord.management.commands.sync_discord_members.get_discord_client"


@pytest.fixture
def patch_command_client(mock_discord_client):
    def _patch(
        member_ids=None,
        members_with_roles=None,
        roles=None,
        disabled=False,
    ):
        client = (
            None
            if disabled
            else mock_discord_client(
                member_ids=member_ids,
                members_with_roles=members_with_roles,
                roles=roles,
            )
        )
        return patch(PATCH_TARGET, return_value=client)

    return _patch


@pytest.fixture
def sample_contacts():
    return [
        Contact.objects.create(full_name="Alice", discord_id="100000000000000001"),
        Contact.objects.create(full_name="Bob", discord_id="100000000000000002"),
        Contact.objects.create(full_name="Charlie", discord_id="100000000000000003"),
    ]


@pytest.mark.django_db
class TestSyncDiscordMembersCommand:
    def test_raises_error_when_discord_disabled(self, patch_command_client):
        with patch_command_client(disabled=True):
            with pytest.raises(CommandError, match="not configured"):
                call_command("sync_discord_members")

    def test_success_output(self, patch_command_client):
        stdout = StringIO()
        with patch_command_client(member_ids={"100000000000000001", "100000000000000002"}):
            call_command("sync_discord_members", stdout=stdout)

        assert "Sync complete" in stdout.getvalue()
        assert "members_fetched=2" in stdout.getvalue()

    def test_creates_contacts_and_tags(self, patch_command_client):
        with patch_command_client(member_ids={"100000000000000001", "100000000000000002"}):
            call_command("sync_discord_members", stdout=StringIO())

        tag = Tag.objects.get(name="DGG Discord")
        assert Contact.objects.filter(discord_id="100000000000000001").exists()
        assert Contact.objects.filter(discord_id="100000000000000002").exists()
        assert TagAssignments.objects.filter(contact__discord_id="100000000000000001", tag=tag).exists()

    def test_idempotent(self, patch_command_client, sample_contacts):
        stdout = StringIO()
        with patch_command_client(member_ids={"100000000000000001", "100000000000000002"}):
            call_command("sync_discord_members", stdout=stdout)

        assert "membership_tags_added=2" in stdout.getvalue()

        stdout2 = StringIO()
        with patch_command_client(member_ids={"100000000000000001", "100000000000000002"}):
            call_command("sync_discord_members", stdout=stdout2)

        assert "membership_tags_added=0" in stdout2.getvalue()

    def test_removes_stale_membership_tags(self, patch_command_client, sample_contacts):
        alice = sample_contacts[0]
        tag = Tag.objects.create(name="DGG Discord")
        TagAssignments.objects.create(contact=alice, tag=tag)

        with patch_command_client(member_ids=set()):
            call_command("sync_discord_members", stdout=StringIO())

        assert not TagAssignments.objects.filter(contact=alice, tag=tag).exists()

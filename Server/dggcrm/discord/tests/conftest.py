from unittest.mock import MagicMock, patch

import pytest

from dggcrm.discord.client import DiscordFetchError


@pytest.fixture
def mock_discord_members():
    """Factory fixture for creating mock Discord member data."""

    def _create_members(count: int, start_id: int = 100000000000000001):
        return [
            {
                "user": {"id": str(start_id + i)},
                "roles": [],
                "joined_at": "2024-01-01T00:00:00+00:00",
            }
            for i in range(count)
        ]

    return _create_members


@pytest.fixture
def mock_discord_client():
    """
    Creates a mock DiscordClient that can be configured to return specific member IDs and roles.

    Usage:
        def test_something(mock_discord_client):
            client = mock_discord_client(member_ids={"123", "456"}, roles=[...])

    Pass fetch_error="message" to simulate a Discord API failure:
        client = mock_discord_client(fetch_error="503 Service Unavailable")
    """

    def _create_client(
        member_ids: set[str] | None = None,
        members_with_roles: list[dict] | None = None,
        roles: list[dict] | None = None,
        fetch_error: str | None = None,
    ):
        client = MagicMock()

        if fetch_error:
            error = DiscordFetchError(fetch_error)
            client.fetch_all_roles.side_effect = error
            client.fetch_all_members_with_roles.side_effect = error
        else:
            client.fetch_all_member_ids.return_value = member_ids or set()
            client.fetch_all_members.return_value = [
                {"id": mid, "display_name": f"Member {mid}"} for mid in (member_ids or set())
            ]

            if members_with_roles is None and member_ids:
                members_with_roles = [
                    {"id": mid, "display_name": f"Member {mid}", "role_ids": []} for mid in member_ids
                ]

            client.fetch_all_members_with_roles.return_value = members_with_roles or []
            client.fetch_all_roles.return_value = roles or []

        return client

    return _create_client


def _make_patch(mock_discord_client, target):
    def _patch(
        member_ids: set[str] | None = None,
        members_with_roles: list[dict] | None = None,
        roles: list[dict] | None = None,
        disabled: bool = False,
        fetch_error: str | None = None,
    ):
        client = (
            None
            if disabled
            else mock_discord_client(
                member_ids=member_ids,
                members_with_roles=members_with_roles,
                roles=roles,
                fetch_error=fetch_error,
            )
        )
        return patch(target, return_value=client)

    return _patch


@pytest.fixture
def patch_discord_client(mock_discord_client):
    """Patches get_discord_client() in the discord views."""
    return _make_patch(mock_discord_client, "dggcrm.discord.views.get_discord_client")


@pytest.fixture
def patch_command_client(mock_discord_client):
    """Patches get_discord_client() in the sync_discord_members management command."""
    return _make_patch(
        mock_discord_client,
        "dggcrm.discord.management.commands.sync_discord_members.get_discord_client",
    )

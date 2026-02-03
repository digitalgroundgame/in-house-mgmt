from unittest.mock import MagicMock, patch

import pytest


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
    Creates a mock DiscordClient that can be configured to return specific member IDs.

    Usage:
        def test_something(mock_discord_client):
            client = mock_discord_client(member_ids={"123", "456"})
            # client.fetch_all_member_ids() will return {"123", "456"}
    """

    def _create_client(member_ids: set[str] | None = None):
        client = MagicMock()
        client.fetch_all_member_ids.return_value = member_ids or set()
        return client

    return _create_client


@pytest.fixture
def patch_discord_client(mock_discord_client):
    """
    Patches get_discord_client() to return a mock client.

    Usage:
        def test_view(patch_discord_client):
            with patch_discord_client(member_ids={"123"}) as client:
                # Make requests - Discord client is mocked
                pass
    """

    def _patch(member_ids: set[str] | None = None, disabled: bool = False):
        client = None if disabled else mock_discord_client(member_ids)
        return patch("dggcrm.discord.views.get_discord_client", return_value=client)

    return _patch

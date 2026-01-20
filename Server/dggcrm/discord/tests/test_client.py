import pytest
from aioresponses import aioresponses

from dggcrm.discord.client import DiscordClient, DISCORD_API_BASE


class TestDiscordClient:
    """Tests for DiscordClient.fetch_all_member_ids()"""

    def test_fetch_members_single_page(self, mock_discord_members):
        """Fetches all members when response fits in one page."""
        client = DiscordClient(token="test-token", guild_id=123456789)
        mock_members = mock_discord_members(count=3)

        with aioresponses() as mocked:
            mocked.get(
                f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
                payload=mock_members,
            )

            result = client.fetch_all_member_ids()

        expected_ids = {m["user"]["id"] for m in mock_members}
        assert result == expected_ids

    def test_fetch_members_pagination(self, mock_discord_members):
        """Paginates through multiple pages using 'after' parameter."""
        client = DiscordClient(token="test-token", guild_id=123456789)
        page_2_members = mock_discord_members(count=2, start_id=100000000000000004)

        with aioresponses() as mocked:
            # First page (1000 members triggers pagination)
            mocked.get(
                f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
                payload=[{"user": {"id": str(i)}} for i in range(1000)],
            )
            # Second page (less than 1000 = last page)
            mocked.get(
                f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000&after=999",
                payload=page_2_members,
            )

            result = client.fetch_all_member_ids()

        # Should have 1000 + 2 members
        assert len(result) == 1002
        assert "100000000000000004" in result
        assert "100000000000000005" in result

    def test_fetch_members_empty_guild(self):
        """Handles empty guild gracefully."""
        client = DiscordClient(token="test-token", guild_id=123456789)

        with aioresponses() as mocked:
            mocked.get(
                f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
                payload=[],
            )

            result = client.fetch_all_member_ids()

        assert result == set()

    def test_fetch_members_api_error(self):
        """Handles API errors gracefully (returns partial results)."""
        client = DiscordClient(token="test-token", guild_id=123456789)

        with aioresponses() as mocked:
            mocked.get(
                f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
                status=403,
                body="Missing Access",
            )

            result = client.fetch_all_member_ids()

        assert result == set()

    def test_authorization_header(self):
        """Sends correct Bot token in Authorization header."""
        client = DiscordClient(token="my-secret-token", guild_id=123456789)

        with aioresponses() as mocked:
            mocked.get(
                f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
                payload=[],
            )

            client.fetch_all_member_ids()

            # Verify the request was made with correct auth header
            calls = list(mocked.requests.values())
            assert len(calls) == 1
            request_call = calls[0][0]
            # Headers are passed in kwargs
            assert request_call.kwargs["headers"]["Authorization"] == "Bot my-secret-token"

import responses

from dggcrm.discord.client import DiscordClient, DISCORD_API_BASE


class TestDiscordClient:
    """Tests for DiscordClient.fetch_all_member_ids()"""

    @responses.activate
    def test_fetch_members_single_page(self, mock_discord_members):
        """Fetches all members when response fits in one page."""
        client = DiscordClient(token="test-token", guild_id=123456789)
        mock_members = mock_discord_members(count=3)

        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=mock_members,
            status=200,
        )

        result = client.fetch_all_member_ids()

        expected_ids = {m["user"]["id"] for m in mock_members}
        assert result == expected_ids

    @responses.activate
    def test_fetch_members_pagination(self, mock_discord_members):
        """Paginates through multiple pages using 'after' parameter."""
        client = DiscordClient(token="test-token", guild_id=123456789)
        page_2_members = mock_discord_members(count=2, start_id=100000000000000004)

        # First page (1000 members triggers pagination)
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=[{"user": {"id": str(i)}} for i in range(1000)],
            status=200,
        )
        # Second page (less than 1000 = last page)
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000&after=999",
            json=page_2_members,
            status=200,
        )

        result = client.fetch_all_member_ids()

        # Should have 1000 + 2 members
        assert len(result) == 1002
        assert "100000000000000004" in result
        assert "100000000000000005" in result

    @responses.activate
    def test_fetch_members_empty_guild(self):
        """Handles empty guild gracefully."""
        client = DiscordClient(token="test-token", guild_id=123456789)

        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=[],
            status=200,
        )

        result = client.fetch_all_member_ids()

        assert result == set()

    @responses.activate
    def test_fetch_members_api_error(self):
        """Handles API errors gracefully (returns partial results)."""
        client = DiscordClient(token="test-token", guild_id=123456789)

        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            body="Missing Access",
            status=403,
        )

        result = client.fetch_all_member_ids()

        assert result == set()

    @responses.activate
    def test_authorization_header(self):
        """Sends correct Bot token in Authorization header."""
        client = DiscordClient(token="my-secret-token", guild_id=123456789)

        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=[],
            status=200,
        )

        client.fetch_all_member_ids()

        # Verify the request was made with correct auth header
        assert len(responses.calls) == 1
        assert responses.calls[0].request.headers["Authorization"] == "Bot my-secret-token"

import responses

from dggcrm.discord.client import DISCORD_API_BASE, DiscordClient


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

    @responses.activate
    def test_retry_on_503_then_success(self, mock_discord_members):
        """Retries on 503 and succeeds on subsequent attempt."""
        client = DiscordClient(token="test-token", guild_id=123456789)
        mock_members = mock_discord_members(count=2)

        # First call returns 503, second succeeds
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            body="Service Unavailable",
            status=503,
        )
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=mock_members,
            status=200,
        )

        result = client.fetch_all_member_ids()

        expected_ids = {m["user"]["id"] for m in mock_members}
        assert result == expected_ids
        assert len(responses.calls) == 2  # Retried once

    @responses.activate
    def test_retry_on_429_rate_limit(self, mock_discord_members):
        """Retries on 429 rate limit response."""
        client = DiscordClient(token="test-token", guild_id=123456789)
        mock_members = mock_discord_members(count=2)

        # First call returns 429, second succeeds
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json={"message": "You are being rate limited", "retry_after": 1.0},
            status=429,
        )
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=mock_members,
            status=200,
        )

        result = client.fetch_all_member_ids()

        expected_ids = {m["user"]["id"] for m in mock_members}
        assert result == expected_ids
        assert len(responses.calls) == 2  # Retried once

    @responses.activate
    def test_no_retry_on_404(self):
        """Does NOT retry on 404 - returns empty immediately."""
        client = DiscordClient(token="test-token", guild_id=123456789)

        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            body="Unknown Guild",
            status=404,
        )

        result = client.fetch_all_member_ids()

        assert result == set()
        assert len(responses.calls) == 1  # No retry

    @responses.activate
    def test_no_retry_on_401(self):
        """Does NOT retry on 401 Unauthorized - returns empty immediately."""
        client = DiscordClient(token="bad-token", guild_id=123456789)

        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            body="401: Unauthorized",
            status=401,
        )

        result = client.fetch_all_member_ids()

        assert result == set()
        assert len(responses.calls) == 1  # No retry


class TestDisplayNamePriority:
    """Tests for display name resolution: nick > global_name > username > fallback"""

    def _mock_member(self, user_id="123", nick=None, global_name=None, username=None):
        user = {"id": user_id}
        if global_name is not None:
            user["global_name"] = global_name
        if username is not None:
            user["username"] = username
        member = {"user": user, "roles": []}
        if nick is not None:
            member["nick"] = nick
        return member

    def _setup_response(self, members):
        responses.add(
            responses.GET,
            f"{DISCORD_API_BASE}/guilds/123456789/members?limit=1000",
            json=members,
            status=200,
        )

    @responses.activate
    def test_prefers_nick_over_global_name(self):
        client = DiscordClient(token="test-token", guild_id=123456789)
        self._setup_response([self._mock_member(nick="CoolNick", global_name="SpacePanda", username="xpanda_42")])

        result = client.fetch_all_members()

        assert result[0]["display_name"] == "CoolNick"

    @responses.activate
    def test_prefers_global_name_over_username(self):
        client = DiscordClient(token="test-token", guild_id=123456789)
        self._setup_response([self._mock_member(global_name="SpacePanda", username="xpanda_42")])

        result = client.fetch_all_members()

        assert result[0]["display_name"] == "SpacePanda"

    @responses.activate
    def test_falls_back_to_username(self):
        client = DiscordClient(token="test-token", guild_id=123456789)
        self._setup_response([self._mock_member(username="xpanda_42")])

        result = client.fetch_all_members()

        assert result[0]["display_name"] == "xpanda_42"

    @responses.activate
    def test_falls_back_to_discord_id(self):
        client = DiscordClient(token="test-token", guild_id=123456789)
        self._setup_response([self._mock_member(user_id="99999")])

        result = client.fetch_all_members()

        assert result[0]["display_name"] == "Discord 99999"

    @responses.activate
    def test_skips_null_global_name(self):
        client = DiscordClient(token="test-token", guild_id=123456789)
        member = {"user": {"id": "123", "global_name": None, "username": "xpanda_42"}, "roles": []}
        self._setup_response([member])

        result = client.fetch_all_members()

        assert result[0]["display_name"] == "xpanda_42"

    @responses.activate
    def test_display_name_in_fetch_all_members_with_roles(self):
        client = DiscordClient(token="test-token", guild_id=123456789)
        self._setup_response([self._mock_member(global_name="SpacePanda", username="xpanda_42")])

        result = client.fetch_all_members_with_roles()

        assert result[0]["display_name"] == "SpacePanda"

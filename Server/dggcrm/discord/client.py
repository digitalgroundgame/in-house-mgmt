"""
Discord API client for fetching guild data.

TODO: Production requires proper secrets management for DISCORD_BOT_TOKEN.
Currently relies on environment variables which works for local dev but
needs a secure secrets solution (Vault, AWS Secrets Manager, etc.) for production.
"""
import os
import asyncio
import logging
from typing import Optional

import aiohttp

logger = logging.getLogger(__name__)

DISCORD_API_BASE = "https://discord.com/api/v10"

# Module-level singleton
_client: Optional["DiscordClient"] = None


def initialize() -> None:
    """
    Initialize the Discord client singleton. Called from AppConfig.ready().
    """
    global _client

    enabled = os.environ.get("DISCORD_BOT_ENABLED", "false").lower() == "true"
    if not enabled:
        logger.info("Discord bot disabled (DISCORD_BOT_ENABLED != true)")
        return

    token = os.environ.get("DISCORD_BOT_TOKEN")
    guild_id = os.environ.get("DISCORD_GUILD_ID")

    if not token or not guild_id:
        logger.warning("Discord bot enabled but missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID")
        return

    _client = DiscordClient(token, int(guild_id))
    logger.info(f"Discord client initialized for guild {guild_id}")


def get_discord_client() -> Optional["DiscordClient"]:
    """
    Get the Discord client singleton.
    Returns None if not configured/disabled.
    """
    return _client


class DiscordClient:
    """Client for interacting with the Discord API."""

    def __init__(self, token: str, guild_id: int):
        self.token = token
        self.guild_id = guild_id

    def fetch_all_member_ids(self) -> set[str]:
        """
        Fetch all guild member Discord IDs (paginated).
        Returns set of Discord user ID strings.
        """
        return asyncio.run(self._fetch_all_member_ids())

    async def _fetch_all_member_ids(self) -> set[str]:
        """
        Paginate through all guild members.

        Discord API: GET /guilds/{guild_id}/members
        - limit: max 1000 per request
        - after: user ID to paginate from (results sorted by user_id ascending)
        - Auth: "Bot {token}" header required
        """
        members = set()
        after: str | None = None

        headers = {"Authorization": f"Bot {self.token}"}

        async with aiohttp.ClientSession() as session:
            while True:
                url = f"{DISCORD_API_BASE}/guilds/{self.guild_id}/members?limit=1000"
                if after:
                    url += f"&after={after}"

                async with session.get(url, headers=headers) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.error(f"Failed to fetch members: {resp.status} - {error_text}")
                        break

                    data = await resp.json()
                    if not data:
                        break

                    for member in data:
                        members.add(member["user"]["id"])

                    # Pagination: use last member's user ID as cursor
                    after = data[-1]["user"]["id"]

                    # If we got less than 1000, we've reached the end
                    if len(data) < 1000:
                        break

        logger.info(f"Fetched {len(members)} members from guild {self.guild_id}")
        return members

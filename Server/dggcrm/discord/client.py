"""
Discord API client for fetching guild data.

TODO: Production requires proper secrets management for DISCORD_BOT_TOKEN.
Currently relies on environment variables which works for local dev but
needs a secure secrets solution (Vault, AWS Secrets Manager, etc.) for production.
"""

import logging
import os

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# Retry configuration: retry on connection errors, timeouts, and 5xx/429 errors
# Do NOT retry on 4xx client errors (400, 401, 403, 404, etc.)
RETRY_STRATEGY = Retry(
    total=os.getenv('DISCORD_RETRY_COUNT', 3),
    backoff_factor=os.getenv('DISCORD_BACKOFF_FACTOR', 1'),
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"],  # Only retry GET requests
    raise_on_status=False,  # Don't raise, let us handle status codes
)

DISCORD_API_BASE = "https://discord.com/api/v10"

# Module-level singleton
_client: "DiscordClient | None" = None


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


def get_discord_client() -> "DiscordClient | None":
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
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bot {token}"

        # Mount retry adapter for Discord API
        adapter = HTTPAdapter(max_retries=RETRY_STRATEGY)
        self.session.mount("https://", adapter)

    def fetch_all_member_ids(self) -> set[str]:
        """
        Fetch all guild member Discord IDs (paginated).

        Discord API: GET /guilds/{guild_id}/members
        - limit: max 1000 per request
        - after: user ID to paginate from (results sorted by user_id ascending)

        Returns set of Discord user ID strings.

        Retry behavior:
        - Retries on connection errors, timeouts, and 5xx/429 responses
        - Does NOT retry on 4xx client errors (400, 401, 403, 404)
        """
        members: set[str] = set()
        after: str | None = None
        page_size = 1000
        has_more = True

        while has_more:
            url = f"{DISCORD_API_BASE}/guilds/{self.guild_id}/members?limit={page_size}"
            if after:
                url += f"&after={after}"

            try:
                resp = self.session.get(url, timeout=30)
            except requests.exceptions.RequestException as e:
                # Connection error after retries exhausted
                logger.error(f"Network error fetching members (retries exhausted): {e}")
                break

            if resp.status_code != 200:
                logger.error(f"Failed to fetch members: {resp.status_code} - {resp.text}")
                break

            data = resp.json()

            for member in data:
                members.add(member["user"]["id"])

            has_more = len(data) == page_size
            if has_more:
                after = data[-1]["user"]["id"]

        logger.info(f"Fetched {len(members)} members from guild {self.guild_id}")
        return members

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

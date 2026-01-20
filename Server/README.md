## Local Development Setup

For running the backend outside Docker. Requires Python 3.13+.

### Prerequisites

```bash
# macOS: Install libpq for PostgreSQL support
brew install libpq
```

### Setup

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies (macOS)
PATH="/opt/homebrew/opt/libpq/bin:$PATH" pip install -r requirements.txt

# Start PostgreSQL (uses Docker)
docker compose -f ../docker-compose.dev.yaml up postgres -d

# Run the server
../compose/dev/server/start
```

The server runs on port 8080 by default (required for frontend API proxy).

### Environment Overrides

To override default environment variables, create files in `.envs/.dev/local/` (gitignored).
Source them before running:

```bash
source ../.envs/.dev/local/.server  # if you have custom settings
../compose/dev/server/start
```

## Testing

This project uses [pytest](https://pytest.org/) with [aioresponses](https://github.com/pnuckowski/aioresponses) for mocking async HTTP requests.

### Running Tests

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests
task test

# Run tests with verbose output
task test_v

# Run specific test file
task test dggcrm/discord/tests/test_client.py

# Run via pytest directly
python -m pytest dggcrm/discord/tests/ -v
```

### Writing Tests

Test files should be placed in a `tests/` directory within each Django app with a `test_*.py` naming convention.

```python
import pytest
from aioresponses import aioresponses

class TestMyClient:
    def test_fetches_data(self):
        with aioresponses() as mocked:
            mocked.get("https://api.example.com/data", payload={"key": "value"})

            result = my_client.fetch_data()

            assert result == {"key": "value"}
```

For mocking HTTP requests at the boundary (recommended approach), use `aioresponses` for aiohttp clients.

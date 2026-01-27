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

This project uses [pytest](https://pytest.org/) with [pytest-django](https://pytest-django.readthedocs.io/) for Django integration and [responses](https://github.com/getsentry/responses) for mocking HTTP requests.

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
import responses

from myapp.client import MyClient

class TestMyClient:
    @responses.activate
    def test_fetches_data(self):
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            json={"key": "value"},
            status=200,
        )

        client = MyClient()
        result = client.fetch_data()

        assert result == {"key": "value"}
```

For mocking HTTP requests at the boundary (recommended approach), use the `responses` library to mock `requests` calls.

*This ReadMe Should be updated with the expectations shortly after being launches for issue workk*

# How to run
## Docker

If you prefer, it's also possible to bring up the dev stack using docker. You can run the following from the root of this repo:

```
docker compose -f docker-compose.dev.yaml up
```

This will build and deploy the frontend, as well as automatically populate the DB with test data.

Updating docker-compose.dev.yaml to have `RUN_CREATE_DB=0` will skip the test data DB population.

## Pre-commit Hooks (Recommended)

The project uses pre-commit hooks to automatically lint and format code before each commit.

**Setup:**

```bash
cd Server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pre-commit install
```

Once installed, the hooks will run automatically on `git commit`. If the linter fixes any files, the commit will fail so you can review the changes. Simply `git add` the fixed files and commit again.

**Note:** Even without local hooks, the GitHub Actions CI will run linting checks on all PRs and block merging if they fail.

If you run into build issues, you may need to tear down and rebuild the containers:

```
docker compose -f docker-compose.dev.yaml down -v
docker compose -f docker-compose.dev.yaml build --no-cache
docker compose -f docker-compose.dev.yaml up
```

## Populate DB with fake data

Examining the docker-compose file, you will notice the env var `INSERT_FAKE_DATA`. Setting this to `true` will run the `fake/main.py` script on startup.

## Local Super User

Examining the docker-compose file, you will notice the env var `CREATE_SUPER_USER`. Setting this to `true` will create a super user with the following credentials:

* **Username**: `admin`
* **Email**: `admin@example.com`
* **Password**: `admin`

You can override the above using the following env vars:

```
DJANGO_SUPERUSER_USERNAME
DJANGO_SUPERUSER_EMAIL
DJANGO_SUPERUSER_PASSWORD
```

## Database Schema changes

When making a DB change to `models.py`, you must create and then deploy a new migration.

```bash
docker compose -f docker-compose.dev.yaml run --rm server python manage.py makemigrations

docker compose -f docker-compose.dev.yaml run --rm server python manage.py migrate
```

You may neeed to define the specific module you want to migrate. e.g:

```bash
docker compose -f docker-compose.dev.yaml run --rm server python manage.py makemigrations base

docker compose -f docker-compose.dev.yaml run --rm server python manage.py migrate base
```

Before you merge a PR with DB changes, make sure that you combine your migrations into a single file by deleting the new migration files, and recreating them.

## Testing

Run the backend tests using Docker Compose:

```bash
docker compose -f docker-compose.dev.yaml run --rm server task test
```

For verbose output:

```bash
docker compose -f docker-compose.dev.yaml run --rm server task test_v
```

# DGG In-House Management

An internal CRM for the DGG organization. Manages contacts, events, tickets, and Discord membership.

- **Repo:** https://github.com/digitalgroundgame/in-house-mgmt
- **Kanban board (prioritized tickets):** https://github.com/orgs/digitalgroundgame/projects/6/views/3

---

# How to run
## Docker

Run the following from the root of this repo to bring up the dev stack:

```
docker compose -f docker-compose.dev.yaml up
```

This will build and deploy the frontend, as well as automatically populate the DB with test data.

Updating docker-compose.dev.yaml to have `RUN_CREATE_DB=0` will skip the test data DB population.

## Pre-commit Hooks (Recommended)

The project uses pre-commit hooks to automatically lint and format code before each commit.

**Setup:**

```bash
# Install pre-commit globally (once)
brew install pre-commit

cd Server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pre-commit install
```

Once installed, the hooks will run automatically on `git commit`. If the linter fixes any files, the commit will fail so you can review the changes. Simply `git add` the fixed files and commit again.

**Note:** Even without local hooks, the GitHub Actions CI will run linting checks on all PRs and block merging if they fail.

You can also run linters manually without committing:

**Backend** (from `Server/`, with virtualenv activated):

```bash
task lint        # check for issues
task lint_fix    # auto-fix what's fixable
task format      # format code
```

**Frontend** (from `Application/`):

```bash
npm run lint         # check for issues
npm run lint:fix     # auto-fix what's fixable
npm run format       # format code
```

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

**Backend** — run via Docker Compose:

```bash
docker compose -f docker-compose.dev.yaml run --rm server task test
```

For verbose output:

```bash
docker compose -f docker-compose.dev.yaml run --rm server task test_v
```

**Frontend** (from `Application/`):

```bash
npm run test:run
```

## Discord Bot Setup

The application includes a Discord integration for syncing guild membership data. To enable it locally:

### 1. Create a Discord Application & Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → name it → **"Create"**
3. Go to the **"Bot"** tab in the left sidebar
4. Click **"Add Bot"** → confirm

### 2. Get Your Bot Token

1. In the **"Bot"** tab, click **"Reset Token"**
2. Copy the token immediately (you won't see it again)

### 3. Enable Server Members Intent

1. Still in the **"Bot"** tab, scroll to **"Privileged Gateway Intents"**
2. Enable **"Server Members Intent"** (required for fetching member lists)

### 4. Add the Bot to Your Server

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select scope: `bot`
3. No special permissions needed for member listing
4. Copy the generated URL → open it → select your server → authorize

### 5. Get Your Guild (Server) ID

1. In Discord, go to **User Settings** → **Advanced** → enable **"Developer Mode"**
2. Right-click your server icon → **"Copy Server ID"**

### 6. Configure Environment Variables

Add to `.envs/{environement}/.discord`:

```bash
DISCORD_BOT_ENABLED=true
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_GUILD_ID=your-server-id-here
DISCORD_MEMBERSHIP_TAG=DGG Discord
```

The bot token authenticates API requests to Discord. The guild ID specifies which server to fetch members from. The membership tag is the name of the tag that will be applied to contacts who are Discord members.

---

# Contributing

## Questions and Help

- **Technical questions** (setup, code, architecture): reach out to `bookis`
- **Product questions** (what a feature should do, priority, scope): reach out to `IHaveEatenFoliage`

## Git Workflow

### 1. Find an issue to work on

Go to the [kanban board](https://github.com/orgs/digitalgroundgame/projects/6/views/3). Tickets are prioritized — work from the top of the backlog. If something is unclear, ask in the ticket before starting.

### 2. Create a branch off `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b yourname/short-description
```

Branch names must be prefixed with your GitHub username, e.g. `jane/fix-login-redirect` or `bob/add-ticket-export`.

### 3. Make your changes and commit

Make focused commits with clear messages that explain what changed and why:

```bash
git add <files>
git commit -m "Fix login redirect loop for unauthenticated users"
```

### 4. Push and open a pull request

```bash
git push origin yourname/short-description
```

Then open a Pull Request against the `dev` branch on [GitHub](https://github.com/digitalgroundgame/in-house-mgmt).

In the PR description, include `Closes #123` (replacing `123` with your issue number) — GitHub will automatically close the issue when the PR is merged.

A useful PR description includes:
- What the change does and why
- Any trade-offs or decisions worth calling out
- How to manually test it

### 5. Code review

Someone with write access will review your PR and may leave comments or request changes. Address each piece of feedback with either a code change or a reply explaining your reasoning. Push new commits to the same branch — the PR updates automatically. Once approved, your PR will be merged into `dev`.

### 6. Keep your branch up to date

If `dev` moves forward while you're working, sync your branch to avoid conflicts:

```bash
git fetch origin
git rebase origin/dev
```

If you hit merge conflicts, resolve them file by file, then run `git rebase --continue`.

## Branch structure

| Branch | Purpose |
|--------|---------|
| `dev`  | Active development — all PRs merge here |
| `main` | Stable production branch — only merged from `dev` |

Never open PRs directly against `main`.

# GitHub branch rules setup

One-time configuration for branch protection on `main` and `dev`. Apply these
in the repo's GitHub settings. Everything uses **Rulesets** (Settings → Rules
→ Rulesets), not classic Branch protection.

## 1. Repo settings

In **Settings → General**:

- [ ] Enable **Automatically delete head branches** (cleans up feature branches after merge)

In **Settings → General → Pull Requests**:

- [ ] Allow **squash merging**
- [ ] Allow **merge commits**
- [ ] Disable **rebase merging** (optional — keeps history consistent)

## 2. Ruleset: `dev` branch

**Settings → Rules → Rulesets → New branch ruleset**

- **Ruleset name**: `dev branch protection`
- **Enforcement status**: Active
- **Target branches**: Include by pattern → `dev`
- **Bypass list**: `@digitalgroundgame/digital-ground-game` — mode: **For pull requests**

Enable these rules:

- [ ] **Restrict deletions**
- [ ] **Block force pushes**
- [ ] **Require a pull request before merging**
  - Required approvals: **1**
  - [ ] Dismiss stale pull request approvals when new commits are pushed
  - [ ] Require conversation resolution before merging
  - Allowed merge methods: **Squash** only
- [ ] **Require status checks to pass**
  - [ ] Require branches to be up to date before merging
  - Add each CI check name once CI is running (backend tests, frontend tests, lint, migration check)

## 3. Ruleset: `main` branch

**Settings → Rules → Rulesets → New branch ruleset**

- **Ruleset name**: `main branch protection`
- **Enforcement status**: Active
- **Target branches**: Include by pattern → `main`
- **Bypass list**: `@digitalgroundgame/digital-ground-game` — mode: **For pull requests**

Enable these rules:

- [ ] **Restrict deletions**
- [ ] **Block force pushes**
- [ ] **Restrict who can push to matching refs** → `@digitalgroundgame/digital-ground-game` only
- [ ] **Require a pull request before merging**
  - Required approvals: **0**
  - [ ] Require conversation resolution before merging
  - Allowed merge methods: **Merge commit** and **Squash** (merge commit for regular `dev → main` releases, squash available for hotfix branches)
- [ ] **Require status checks to pass**
  - [ ] Require branches to be up to date before merging
  - Same CI checks as `dev`

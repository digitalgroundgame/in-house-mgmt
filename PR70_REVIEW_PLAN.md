# PR #70 Review Implementation Plan

## Overview
This document tracks the fixes for PR #70 (Discord bot integration for membership tag sync).

---

## Task 1: Add Explicit Permission Classes
**File:** `Server/dggcrm/discord/views.py`

**Issue:** The view relies on default `IsAuthenticated` from settings. While not completely open, explicit permissions are better practice and clearer for contributors.

**Fix:** Add `permission_classes = [IsAuthenticated]` explicitly. Consider `IsAdminUser` if this should be admin-only.

---

## Task 2: Fix N+1 Query Problem
**File:** `Server/dggcrm/discord/views.py`

**Issue:** Current code iterates over all contacts and makes individual queries:
```python
for contact in Contact.objects.exclude(discord_id=""):
    has_tag = TagAssignments.objects.filter(contact=contact, tag=tag).exists()  # N queries!
```

**Fix:** Use bulk operations following existing codebase patterns (`bulk_create`, `prefetch_related`):
1. Fetch all contacts with discord_id in one query
2. Fetch all existing tag assignments for this tag in one query
3. Use `bulk_create()` for additions
4. Use single `delete()` with filter for removals

---

## Task 3: Explain asyncio.run() Problem
**File:** `Server/dggcrm/discord/client.py:63`

### The Problem
```python
def fetch_all_member_ids(self) -> set[str]:
    return asyncio.run(self._fetch_all_member_ids())
```

`asyncio.run()` creates a **new event loop** each time it's called. This has several implications:

### Pros of Current Approach
- **Simple**: Easy to understand, works out of the box
- **Isolation**: Each call is independent
- **Compatible**: Works with sync Django views (WSGI)

### Cons of Current Approach
- **Performance**: Creating/destroying event loops has overhead
- **Incompatible with async Django**: If Django runs with ASGI (async), calling `asyncio.run()` inside an already-running loop raises `RuntimeError: This event loop is already running`
- **No connection reuse**: Each call creates new HTTP connections (no connection pooling benefits)
- **Testing complexity**: Harder to mock in async tests

### Alternative Approaches

**Option A: Use synchronous `requests` library**
- Simpler, no async complexity
- Works everywhere
- Slightly less efficient for pagination (sequential requests)

**Option B: Make the Django view async**
```python
class SyncMembershipTagsView(APIView):
    async def post(self, request):
        members = await client._fetch_all_member_ids()
```
- Requires ASGI server (uvicorn/daphne)
- More efficient, but bigger infrastructure change

**Option C: Use `asgiref.sync.async_to_sync`**
```python
from asgiref.sync import async_to_sync

def fetch_all_member_ids(self) -> set[str]:
    return async_to_sync(self._fetch_all_member_ids)()
```
- Django's recommended way to call async from sync
- Handles edge cases better than raw `asyncio.run()`

### Recommendation
For this project, **Option A (synchronous requests)** or **Option C (async_to_sync)** are safest. The current approach works but may cause issues if the project moves to ASGI.

**Decision:** Keep current approach for now with a TODO comment, as the project uses WSGI. Document the limitation.

---

## Task 4: Create Tests for View
**File:** `Server/dggcrm/discord/tests/test_views.py` (new)

**Tests needed:**
1. Unauthenticated request returns 401/403
2. Sync adds tags for members in Discord
3. Sync removes tags for contacts no longer in Discord
4. Returns 503 when Discord client not configured
5. Returns correct counts in response

---

## Task 5: Use the Fixture in Tests
**File:** `Server/dggcrm/discord/tests/conftest.py`

The `mock_discord_members` fixture exists but isn't used. Update view tests to use it.

---

## Task 6: Fix Hardcoded Tag Name
**File:** `Server/fake/main.py`

**Issue:** Hardcodes `"DGG Discord"` but env var default is `"DGG_Discord"` (with underscore).

**Fix:** Use consistent naming or read from same source.

---

## Task 7: Wrap in Transaction
**File:** `Server/dggcrm/discord/views.py`

**Fix:** Wrap the sync operation in `transaction.atomic()` to ensure consistency.

---

## Task 8: Fix Type Annotation Style
**File:** `Server/dggcrm/discord/client.py`

**Issue:** Mixed styles:
```python
from typing import Optional
_client: Optional["DiscordClient"] = None  # Old style
after: str | None = None  # New style
```

**Fix:** Use `X | None` consistently (codebase standard), remove `Optional` import.

---

## Checklist
- [x] Task 1: Permission classes
- [x] Task 2: N+1 fix
- [x] Task 3: Document asyncio issue (this document)
- [x] Task 4: View tests
- [x] Task 5: Use fixture
- [x] Task 6: Fix fake data tag name (fixed env file consistency)
- [x] Task 7: Transaction wrapper
- [x] Task 8: Type annotations

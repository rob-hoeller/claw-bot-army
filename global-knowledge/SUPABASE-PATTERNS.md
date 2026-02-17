# Supabase Access Patterns

> Shared patterns for all HBx agents to interact with Supabase — the platform's source of truth.

---

## Environment Setup

All Supabase credentials are stored in `dashboard/.env.local`. Load them before any API call:

```bash
source dashboard/.env.local
```

**Base URL:** `https://lqlnflbzsqsmufjrygvu.supabase.co`

**Headers (all requests):**
```
-H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
-H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

---

## Feature Lookups

**Rule:** When anyone asks about a feature (by ID, name, or status), **always query Supabase first**. It is the single source of truth for all feature tickets. Memory files are secondary context only.

### Look up by ID (partial match)

Feature IDs are UUIDs. Users may provide a short prefix (e.g., `026EEA42`). Use the full ID if known, or query all features and filter:

```bash
source dashboard/.env.local
# Full ID lookup
curl -s "${SUPABASE_URL:-https://lqlnflbzsqsmufjrygvu.supabase.co}/rest/v1/features?select=*&id=eq.<FULL_UUID>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### List all features (with short IDs for matching)

```bash
source dashboard/.env.local
curl -s "https://lqlnflbzsqsmufjrygvu.supabase.co/rest/v1/features?select=id,title,status,priority,assigned_to&order=created_at.desc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Look up feature comments

```bash
curl -s "https://lqlnflbzsqsmufjrygvu.supabase.co/rest/v1/feature_comments?feature_id=eq.<FULL_UUID>&select=*&order=created_at.asc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

---

## Agent Registry

The `agents` table is the canonical source for all agent configurations. Dashboard reads/writes directly.

```bash
curl -s "https://lqlnflbzsqsmufjrygvu.supabase.co/rest/v1/agents?select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

---

## Key Tables Reference

| Table | Purpose |
|-------|---------|
| `features` | Feature tickets (source of truth) |
| `feature_comments` | Comments on feature tickets |
| `agents` | Agent registry and configurations |
| `conversations` | Chat conversations |
| `messages` | Chat messages |
| `chat_media` | Media file metadata (planned) |

---

## Notes

- Always use the **service role key** for server-side queries
- UUIDs are case-insensitive — normalize to lowercase for matching
- When a user gives a partial ID, list features and match the prefix

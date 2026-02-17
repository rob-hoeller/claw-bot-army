# Feature: Global Knowledge Base → Supabase

| Field | Value |
|-------|-------|
| **Feature ID** | `a3b7c1d4` |
| **Status** | 🔄 In Progress |
| **Assigned To** | HBx_IN2 (Code Factory) |
| **Requested By** | Lance (via HBx) |
| **Priority** | High |
| **Created** | 2026-02-17 |

---

## Goal

Migrate the global knowledge base from local disk files (`/global-knowledge/*.md`) to Supabase so they're accessible from the dashboard, versionable, and editable from the UI.

## Requirements

### 1. Database: `global_knowledge` table
- id (uuid, PK)
- slug (text, unique — e.g. `code-factory`, `coordination`)
- title (text — display name)
- content (text — full markdown content)
- category (text — optional grouping)
- version (int — incremented on each edit)
- updated_by (text — user ID or agent ID)
- created_at (timestamptz)
- updated_at (timestamptz)
- RLS: authenticated users can read; admin users can write

### 2. API Routes
- `GET /api/global-knowledge` — list all docs (id, slug, title, updated_at)
- `GET /api/global-knowledge/[slug]` — fetch single doc with full content
- `PUT /api/global-knowledge/[slug]` — update content (increments version)
- `POST /api/global-knowledge` — create new doc

### 3. Dashboard UI
- Global Knowledge section/page in the dashboard
- List view showing all docs with title, last updated, version
- Click to open editor (markdown editor with preview)
- Save button that writes back to Supabase
- Version history indicator

### 4. Backfill
- Migrate existing 4 files from disk to Supabase table
- Verify content integrity

### 5. Agent Integration
- Sub-agents can query global knowledge via the API at runtime
- HBx can update global knowledge programmatically

## Acceptance Criteria
- [ ] All 4 existing files migrated to Supabase
- [ ] CRUD API working
- [ ] Dashboard UI for viewing/editing
- [ ] Commit and push to git for Vercel deployment

# Phase 5: Epic/Module Chaining — Design Spec

**Feature ID:** `2bacd64a-365d-45e4-983d-165abdac3052`
**Author:** Pipeline Sub-agent (IN1)
**Date:** 2026-02-24
**Status:** `design_review`

---

## 1. Overview

Enable grouping of related features into **Epics** — high-level work streams that track aggregate progress across multiple features. Epics provide a bird's-eye view of multi-feature initiatives with parallel pipeline visualization, aggregate progress tracking, and cross-feature dependency awareness.

---

## 2. Database Schema

### 2.1 New Table: `epics`

```sql
CREATE TABLE IF NOT EXISTS epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'archived')),
  color TEXT DEFAULT '#8B5CF6',
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_epics_status ON epics(status);
```

### 2.2 New Table: `epic_features` (join table)

```sql
CREATE TABLE IF NOT EXISTS epic_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(epic_id, feature_id)
);

CREATE INDEX idx_epic_features_epic ON epic_features(epic_id);
CREATE INDEX idx_epic_features_feature ON epic_features(feature_id);
```

### 2.3 Design Decisions
- A feature CAN belong to multiple epics (many-to-many via `epic_features`)
- Epic status auto-computes from linked features but can be manually overridden
- `color` field allows visual differentiation on the board
- `sort_order` controls feature display order within an epic

---

## 3. API Contracts

### 3.1 `GET /api/epics`
**Response:** `Epic[]`
```json
[{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "open | in_progress | completed | archived",
  "color": "#hex",
  "owner": "string | null",
  "feature_count": 0,
  "features_done": 0,
  "created_at": "iso",
  "updated_at": "iso"
}]
```

### 3.2 `POST /api/epics`
**Body:** `{ title: string, description?: string, color?: string, owner?: string }`
**Response:** `{ epic: Epic }` (201)

### 3.3 `GET /api/epics/[id]`
**Response:** Epic with nested features array:
```json
{
  "id": "uuid",
  "title": "...",
  "features": [{ "id": "...", "title": "...", "status": "...", "priority": "...", ... }],
  ...
}
```

### 3.4 `PATCH /api/epics/[id]`
**Body:** `{ title?, description?, status?, color?, owner? }`
**Response:** `{ epic: Epic }`

### 3.5 `DELETE /api/epics/[id]`
**Response:** 204. Deletes epic and all `epic_features` links (CASCADE). Does NOT delete features.

### 3.6 `POST /api/epics/[id]/features`
**Body:** `{ feature_id: string }`
**Response:** `{ link: EpicFeature }` (201). Idempotent — returns existing link if already linked.

### 3.7 `DELETE /api/epics/[id]/features`
**Body:** `{ feature_id: string }`
**Response:** 204.

---

## 4. Component Tree

```
FeatureBoard.tsx (existing — add epic filter + badge)
├── EpicFilterBar              — dropdown to filter by epic
├── SortableFeatureCard        — add EpicBadge
│   └── EpicBadge              — small colored tag showing epic name
│
EpicBoard.tsx (new page/tab)
├── EpicList                   — list of all epics with progress
│   └── EpicCard               — title, progress bar, feature count
├── EpicDetailPanel            — slide-out panel (like FeatureDetailPanel)
│   ├── EpicProgressBar        — aggregate % done
│   ├── EpicFeatureList        — linked features with pipeline mini-bars
│   ├── EpicFeatureAdder       — search + add features
│   └── EpicSettings           — edit title/desc/color/status
│
EpicSelector.tsx               — used in FeatureDetailPanel to assign epics
```

### 4.1 Props Summary
- `EpicBadge`: `{ epicId: string, title: string, color: string }`
- `EpicCard`: `{ epic: Epic & { feature_count: number, features_done: number } }`
- `EpicDetailPanel`: `{ epicId: string, onClose: () => void }`
- `EpicSelector`: `{ featureId: string, currentEpicIds: string[] }`
- `EpicProgressBar`: `{ total: number, done: number, color: string }`

---

## 5. Epic Lifecycle

1. **Create** — User creates epic with title + optional description/color
2. **Link Features** — Add existing features to the epic
3. **Track** — Epic auto-shows aggregate progress (% of features in `done` status)
4. **Complete** — When all features are done, epic can be marked `completed`
5. **Archive** — Completed epics can be archived to declutter

---

## 6. Edge Cases

| Case | Behavior |
|------|----------|
| Feature in multiple epics | Allowed. Badge shows first epic; tooltip shows all |
| Empty epic (no features) | Allowed. Shows 0/0 progress, "Add features" CTA |
| Delete epic with linked features | Epic deleted, links deleted. Features untouched |
| Delete feature linked to epic | Link auto-deleted (CASCADE). Epic progress recalculates |
| Epic with all features cancelled | Progress shows 0% done; manual archive recommended |

---

## 7. Acceptance Criteria

- [ ] Migration creates `epics` and `epic_features` tables
- [ ] All 7 API endpoints work correctly
- [ ] Epic list/board view shows all epics with progress bars
- [ ] Epic detail panel shows linked features with pipeline status
- [ ] Features can be added/removed from epics
- [ ] Feature cards on main board show epic badge(s)
- [ ] Epic filter on main board works
- [ ] TypeScript compiles with no errors
- [ ] Build succeeds

---

## 8. UI/UX Design Decisions

### 8.1 Epic Board Layout
- New tab/view accessible from main nav alongside Feature Board
- Grid layout: 2-3 columns of epic cards on desktop, 1 on mobile
- Each card shows: title, colored left border, progress bar, feature count, status badge

### 8.2 Epic Badges on Feature Board
- Small pill/tag below feature title showing epic name with epic's color
- Max 2 badges visible; "+N more" for additional
- Clicking badge navigates to epic detail

### 8.3 Aggregate Progress Visualization
- Horizontal segmented bar: green (done), yellow (in_progress), gray (not started)
- Text: "3/7 features done (43%)"

### 8.4 Epic Creation Flow
- "New Epic" button on Epic Board → inline form or modal
- Fields: Title (required), Description (optional), Color picker (6 presets)
- After creation, opens detail panel to add features

### 8.5 Color Scheme
- 6 preset epic colors: purple (#8B5CF6), blue (#3B82F6), green (#10B981), orange (#F59E0B), red (#EF4444), pink (#EC4899)
- Used for: left border on cards, badge background (at 20% opacity), progress bar

### 8.6 Visual Hierarchy
- Epic board is secondary to Feature Board (features-first philosophy)
- Epic context appears subtly on feature cards (small badge, not dominant)
- Detail panel reuses same slide-out pattern as FeatureDetailPanel

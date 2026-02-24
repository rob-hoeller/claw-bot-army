# Audit Trail Phase 4 — Diff View on Revisions

## Overview
When a pipeline phase has multiple handoff packet versions (v2+), users can view a diff of what changed between versions. This applies to `output_summary` and `output_artifacts` content fields.

## API Contract

### `GET /api/features/[id]/handoff-packets/[packetId]/diff`

**Response 200:**
```json
{
  "diff": {
    "summary": [
      { "op": "equal", "text": "unchanged text" },
      { "op": "insert", "text": "added text" },
      { "op": "delete", "text": "removed text" }
    ],
    "artifacts": [
      {
        "title": "artifact name",
        "contentDiff": [
          { "op": "equal", "text": "..." },
          { "op": "insert", "text": "..." },
          { "op": "delete", "text": "..." }
        ] | null
      }
    ]
  },
  "currentVersion": 2,
  "previousVersion": 1
}
```

**Response 400:** `{ "error": "This is version 1 — no previous version to diff against" }`
**Response 404:** `{ "error": "Handoff packet not found" }`

## Diff Algorithm
Use `diff-match-patch` (Google's library). Rationale:
- Lightweight (~50KB), well-tested, language-agnostic
- Character-level diffs produce readable inline results
- Already typed via `@types/diff-match-patch`

## Component Tree
```
StepPanelContent
├── VersionSelector (dropdown, only if phasePackets.length > 1)
│   └── shows "v1", "v2", etc. + optional "Show diff" toggle
├── DiffView (when diff mode active)
│   ├── SummaryDiff (inline colored spans)
│   └── ArtifactsDiff (per-artifact diffs)
└── [existing content when not in diff mode]
```

### Props
- `VersionSelector`: `{ versions: { id: string; version: number }[]; selected: string; onSelect: (id: string) => void; diffMode: boolean; onToggleDiff: () => void }`
- `DiffView`: `{ packetId: string; featureId: string }` — fetches diff data internally

## Edge Cases
1. **Version 1 (no previous):** API returns 400. UI hides diff toggle for v1.
2. **Large diffs:** Render inline with virtual scrolling not needed (summaries capped at 10k chars).
3. **Binary/URL-only artifacts:** Skip diff for artifacts without `content` field — show "No text content to diff".
4. **Missing previous packet:** API returns 400 gracefully.

## UI/UX Design Decisions
- **Inline diff** (not side-by-side) — matches narrow panel width in FeatureBoard
- **Colors:** Insertions: `bg-green-500/20 text-green-300`, Deletions: `bg-red-500/20 text-red-300 line-through`
- **Version selector:** Small dropdown at top of StepPanelContent, styled like existing pills (`bg-white/5 border-white/10`)
- **Diff toggle:** "Show changes" button next to version dropdown, purple accent when active
- **No animations** — instant swap to avoid complexity
- **Mobile:** Full-width inline diff works naturally in responsive layout

## Acceptance Criteria
- [ ] API returns correct diff between consecutive versions
- [ ] DiffView renders insertions in green, deletions in red with line-through
- [ ] Version selector appears only when phase has 2+ versions
- [ ] Selecting v1 hides diff toggle
- [ ] Typecheck and build pass
- [ ] No console.log in production code

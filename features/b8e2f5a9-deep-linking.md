# Feature: Dashboard Deep Linking

| Field | Value |
|-------|-------|
| **Feature ID** | `b8e2f5a9` |
| **Status** | 🔄 In Progress |
| **Assigned To** | HBx_IN2 (Code Factory) |
| **Requested By** | Lance (via HBx) |
| **Priority** | High |
| **Created** | 2026-02-17 |

---

## Goal

Add URL-based deep linking to the dashboard so any tab, feature card, or panel can be linked to directly. This enables HBx and agents to share clickable links to specific items.

## Requirements

### 1. URL Hash Routing
- Tab selection reflected in URL: `#features`, `#agents`, `#settings`, etc.
- On page load, read the hash and activate the correct tab
- Feature item selection: `#features?item=a3b7c1d4` opens the features tab AND auto-opens that item's side panel

### 2. Sidebar Tab Navigation
- Clicking a sidebar tab updates the URL hash
- Browser back/forward navigates between tabs

### 3. Feature Board Integration
- Clicking a feature card updates URL to `#features?item={id}`
- Closing the side panel removes the `?item=` param
- If URL has `?item=`, auto-open that card's detail panel on load

### 4. Shareable Links
- Any state reachable via URL can be shared/bookmarked
- Works on page refresh

## Acceptance Criteria
- [ ] Tab navigation reflected in URL hash
- [ ] `#features?item={id}` opens specific feature detail panel
- [ ] Browser back/forward works
- [ ] Page refresh preserves state
- [ ] Commit and push for Vercel deployment

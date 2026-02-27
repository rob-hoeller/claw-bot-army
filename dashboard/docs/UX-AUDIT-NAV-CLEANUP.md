# UX Audit: Navigation & Layout Cleanup
**Date:** 2026-02-26  
**Auditor:** IN5 (UI/UX Expert)  
**Scope:** HBx Dashboard Navigation & Layout Review

---

## Executive Summary

The HBx dashboard currently has **13 navigation items**, of which **5 are placeholder pages** with no functionality. The navigation lacks clear hierarchy, contains redundant paths, and presents a cluttered first impression to the CEO who uses this daily.

**Goal:** Reduce navigation to **6 primary items** maximum, establish clear visual hierarchy, and create a world-class interface inspired by Linear, Vercel, and Supabase Studio.

**Impact:** Cleaner UX, faster navigation, better daily driver experience, reduced cognitive load.

---

## 1. Current State Analysis

### Navigation Inventory (13 items)

| # | Nav Item | Status | Lines | Purpose | Issues |
|---|----------|--------|-------|---------|--------|
| 1 | Command Center | ✅ Real | ~350 | Summary dashboard, metrics, quick links | Redundant with Mission Control |
| 2 | Mission Control | ✅ Real | Complex | **PRIMARY WORKSPACE** - Pipeline, feed, detail panel | This is the main UI |
| 3 | Agent Network | ✅ Real | ~200 | OrchestratorPanel - monitor sessions | Good, but could be integrated |
| 4 | Agents | ✅ Real | 1,270 | Agent management with detail panel (chat/files/cron/memory) | Core functionality |
| 5 | Monitoring | ✅ Real | ~430 | System health: CPU, memory, load, gateway status | Essential ops view |
| 6 | Usage & Costs | ✅ Real | ~470 | Token usage tracking, cost breakdown | Essential budget view |
| 7 | Features | ⚠️ Deprecated | 1,754 | OLD Kanban board being replaced by Mission Control | Should be hidden |
| 8 | Bugs | ❌ Placeholder | 0 | "Coming soon" | Dead weight |
| 9 | Users | ❌ Placeholder | 0 | "Coming soon" | Dead weight |
| 10 | Roles | ❌ Placeholder | 0 | "Coming soon" | Dead weight |
| 11 | Business Units | ❌ Placeholder | 0 | "Coming soon" | Dead weight |
| 12 | Audit Log | ❌ Placeholder | 0 | "Coming soon" | Dead weight |
| 13 | Settings | ✅ Real | ~630 | Account, platform config, system info | Essential |

### Problems Identified

1. **Placeholder Dead Weight (5 items, 38% of nav)**  
   Bugs, Users, Roles, Business Units, Audit Log — all render "Coming soon" pages. They make the nav look unfinished and add zero value.

2. **Redundant/Confusing Paths**
   - "Command Center" vs "Mission Control" — both are dashboards, unclear which is primary
   - "Agent Network" could be integrated into Agents page as a tab or view mode

3. **Deprecated Page Still Prominent**  
   The old FeatureBoard (1,754L) is in primary nav despite being replaced by Mission Control. It should be accessible via direct link only, not nav.

4. **No Visual Hierarchy**  
   All 13 items have equal visual weight. No grouping, no collapsible sections, no indication of what's daily vs weekly vs occasional.

5. **Tab Sprawl in Detail Panels**
   - Mission Control detail panel: 4 tabs (Pipeline, Activity, Chat, Audit)
   - Agents detail panel: 4 tabs (Chat, Files, Cron, Memory)
   - Some consolidation opportunities exist

---

## 2. Proposed Navigation (Before → After)

### Comparison Table

| Before (13 items) | After (6 items) | Rationale |
|-------------------|----------------|-----------|
| Command Center | **🏠 Home** | Simplified, clear entry point |
| Mission Control | **🚀 Missions** | Primary workspace — shortest, clearest name |
| Agent Network | *(merged into Agents)* | Orchestrator sessions become "Network" tab in Agents |
| Agents | **🤖 Agents** | Core agent management, now includes Network view |
| Monitoring | **📊 Platform** | Renamed to include monitoring + usage + system info |
| Usage & Costs | *(merged into Platform)* | Becomes a tab under Platform |
| Features | *(hidden from nav)* | Accessible via direct link only |
| Bugs | *(removed)* | Add back when real |
| Users | *(removed)* | Add back when real |
| Roles | *(removed)* | Add back when real |
| Business Units | *(removed)* | Add back when real |
| Audit Log | *(removed)* | Add back when real |
| Settings | **⚙️ Settings** | Stays as-is |

### New Navigation Structure (6 items)

```
🏠 Home          — Overview, metrics, quick links, active workflows
🚀 Missions      — Mission Control (pipeline, feed, detail panel)
🤖 Agents        — Agent management + Network sessions (tabbed view)
📊 Platform      — Monitoring + Usage/Costs + System Health (tabbed view)
⚙️ Settings      — Account, platform config
```

**Admin section (collapsible, bottom of nav):**
```
👥 Admin (collapsed by default)
  ├─ Users       (future)
  ├─ Roles       (future)
  ├─ Business Units (future)
  └─ Audit Log   (future)
```

**Hidden/deprecated routes (direct link only, not in nav):**
- `/features` — old FeatureBoard (legacy access)
- `/bugs` — future placeholder
- `/design-system` — component library (future)

---

## 3. Page Merge/Rename/Remove Decisions

### ✅ Keep (with modifications)

| Page | New Name | Changes |
|------|----------|---------|
| Dashboard | **Home** | Keep but simplify — less decorative, more actionable. Focus on: active missions, attention needed, quick stats |
| Mission Control | **Missions** | No changes — this is the flagship |
| Settings | **Settings** | No changes |

### 🔀 Merge

| Original Pages | New Merged Page | Structure |
|---------------|-----------------|-----------|
| Agents + Agent Network | **Agents** | Tabbed view: `Details (current)` / `Network (orchestrator sessions)` / `Chat` / `Files` / `Cron` / `Memory` |
| Monitoring + Usage & Costs | **Platform** | Tabbed view: `Health (monitoring)` / `Usage (costs)` / `Config (system info from Settings)` |

### 🗑️ Remove from Nav (hide, keep routes)

| Page | Action | Access Method |
|------|--------|---------------|
| Features (old FeatureBoard) | Hide from nav | Direct link: `/features` (for legacy access) |
| Bugs | Remove | Add back when real |
| Users | Remove | Add back when real (under Admin section) |
| Roles | Remove | Add back when real (under Admin section) |
| Business Units | Remove | Add back when real (under Admin section) |
| Audit Log | Remove | Add back when real (under Admin section) |

---

## 4. Tab Consolidation

### Mission Control Detail Panel (Currently 4 tabs)

**Current:**  
`Pipeline | Activity | Chat | Audit Trail`

**Recommendation:** Keep as-is  
These tabs are well-defined and each serves a distinct purpose:
- **Pipeline** — visual phase diagram (primary view)
- **Activity** — real-time stream of agent actions
- **Chat** — phase-specific communication
- **Audit Trail** — handoff packets and history

**No consolidation needed.** Each tab is essential and frequently accessed during active missions.

---

### Agents Detail Panel (Currently 4 tabs)

**Current:**  
`Chat | Files | Cron | Memory`

**Recommendation:** Consider 2-tab structure
- **Console** (merge Chat + Memory + Cron)  
  - Sub-sections or accordion within the tab
  - Most users interact with chat, glance at memory, rarely modify cron
- **Files** (keep separate)  
  - File editor needs full space, distinct UX

**Alternative (safer):** Keep 4 tabs but improve labeling
- `💬 Chat`
- `📁 Files`
- `🧠 Memory` (merge Memory + Cron into one tab with sections)
- `⏰ Schedules` (rename Cron to be clearer)

**Verdict:** Start with improved labeling (safer), consider merge in v2 after usage data.

---

### New Platform Page (Merged)

**Structure:**
```
📊 Platform
  ├─ Health     — Current MonitoringPage (CPU, mem, load, gateway, sessions)
  ├─ Usage      — Current TokenUsagePage (tokens, costs, top agents/users)
  └─ Config     — System config from Settings (Supabase, Gateway, platform info)
```

This consolidation makes sense because:
- All three are **operational** views (not daily driver, but weekly/monthly check-ins)
- They share the same audience (platform admin / ops role)
- They're related: health → usage → config is a logical flow

---

### New Agents Page (Merged)

**Structure:**
```
🤖 Agents
  ├─ Details    — Current AgentsPage (agent list + detail panel)
  └─ Network    — Current Agent Network (OrchestratorPanel - sessions list + viewer)
```

This consolidation makes sense because:
- Both are about **agents** (static config vs live sessions)
- "Network" is a natural second view of the same domain
- Reduces nav clutter without losing functionality

---

## 5. Visual Hierarchy

### Primary (Daily Driver)
**Frequency:** Multiple times per day  
**Navigation placement:** Top of nav, always visible

- **🚀 Missions** — This is where work happens. Primary workspace.
- **🏠 Home** — Quick overview before diving into Missions

### Secondary (Weekly Check-in)
**Frequency:** Few times per week  
**Navigation placement:** Middle of nav

- **🤖 Agents** — Configure, deploy, monitor agents
- **📊 Platform** — Review health, usage, costs

### Tertiary (Occasional)
**Frequency:** As needed  
**Navigation placement:** Bottom of nav or user menu

- **⚙️ Settings** — Account settings, platform config

### Future/Admin (Rare)
**Frequency:** Rare / not yet implemented  
**Navigation placement:** Collapsible "Admin" section at bottom

- **👥 Users, Roles, Business Units, Audit Log** — Add when ready

---

## 6. Implementation Plan

### Phase 1: Quick Wins (<1 hour)

**Goal:** Remove dead weight, immediate visual improvement

1. **Remove placeholders from nav** (5 min)
   - Edit `src/components/Sidebar.tsx`
   - Comment out: Bugs, Users, Roles, Tenants, Audit
   - Update `navItems` array

2. **Hide old FeatureBoard from nav** (2 min)
   - Comment out Features nav item
   - Keep route in `page.tsx` for direct access

3. **Rename labels** (5 min)
   - "Command Center" → "Home"
   - "Mission Control" → "Missions"
   - "Agent Network" → (will be merged, but rename for now)
   - "Usage & Costs" → "Usage"

4. **Test nav** (5 min)
   - Verify all visible pages load
   - Confirm removed items are gone

**Deliverable:** Nav reduced to 8 items immediately (down from 13).

---

### Phase 2: Nav Grouping & Icons (1-2 hours)

**Goal:** Visual hierarchy, collapsible sections

1. **Add collapsible Admin section** (30 min)
   - Create collapsible group component
   - Add "Admin" group at bottom (collapsed by default)
   - Add future placeholders inside (hidden by default, only visible to superadmin)

2. **Update icons** (15 min)
   - Ensure consistency: Home 🏠, Missions 🚀, Agents 🤖, Platform 📊
   - Use Lucide icons consistently

3. **Add visual separators** (15 min)
   - Divider line between primary/secondary sections
   - Subtle background gradient on active nav item

4. **Responsive optimization** (30 min)
   - Collapsed nav on mobile shows only icons + tooltip
   - Desktop: full labels

**Deliverable:** Cleaner nav with clear hierarchy.

---

### Phase 3: Page Merging (2-4 hours)

**Goal:** Consolidate related pages into tabbed views

#### 3A: Merge Monitoring + Usage → Platform Page (2 hours)

1. **Create `src/components/PlatformPage.tsx`** (30 min)
   ```tsx
   <Tabs defaultValue="health">
     <TabsList>
       <TabsTrigger value="health">Health</TabsTrigger>
       <TabsTrigger value="usage">Usage</TabsTrigger>
       <TabsTrigger value="config">Config</TabsTrigger>
     </TabsList>
     <TabsContent value="health">
       <MonitoringPage />
     </TabsContent>
     <TabsContent value="usage">
       <TokenUsagePage />
     </TabsContent>
     <TabsContent value="config">
       <SystemConfigPanel />
     </TabsContent>
   </Tabs>
   ```

2. **Extract system config from Settings** (30 min)
   - Create `SystemConfigPanel.tsx`
   - Move platform config section from Settings

3. **Update routing** (15 min)
   - `page.tsx`: Add "platform" case
   - Remove "monitoring" and "usage" cases
   - Add URL param support: `/platform?tab=usage`

4. **Update nav** (15 min)
   - Sidebar: replace Monitoring + Usage with single "Platform" item

5. **Test** (30 min)
   - All three tabs load correctly
   - Data updates work
   - Responsive layout

**Deliverable:** Platform page with 3 tabs, nav down to 7 items.

---

#### 3B: Merge Agent Network → Agents Page (2 hours)

1. **Update `AgentsPage.tsx` to include Network tab** (60 min)
   - Add "Network" tab to existing tabs (Chat, Files, Cron, Memory)
   - Import `OrchestratorPanel` component
   - Add tab switching logic

2. **Update routing** (15 min)
   - Remove "network" case from `page.tsx`
   - Add URL param: `/agents?view=network`

3. **Update nav** (10 min)
   - Remove "Agent Network" from sidebar

4. **Test** (35 min)
   - Network tab shows OrchestratorPanel correctly
   - Switching between tabs works smoothly
   - Detail panels in both views work

**Deliverable:** Agents page with 5 views (Details + Network + chat/files/cron/memory), nav down to 6 items.

---

### Phase 4: Home Page Optimization (1-2 hours)

**Goal:** Make Home page more actionable, less decorative

1. **Remove quote footer** (2 min)
   - "Are you Clawd-Pilled yet?" — too playful for daily driver

2. **Prioritize Mission Control widget** (30 min)
   - Move Mission Control quick-access card to top
   - Make it more prominent (larger, better CTAs)
   - Add "Open Mission Control" primary button

3. **Simplify stats grid** (20 min)
   - Keep only 3 cards: Active Missions, Agents Online, Needs Attention
   - Remove generic stats (Uptime, Total Users)

4. **Add quick actions section** (40 min)
   - "Create New Feature" button → opens Mission Control with command bar focused
   - "View All Agents" button → navigates to Agents
   - "Check Platform Health" button → navigates to Platform

**Deliverable:** Home page becomes a true "command center" — actionable, not just informational.

---

### Phase 5: Polish & Animation (1 hour)

**Goal:** Smooth transitions, polish

1. **Nav transitions** (20 min)
   - Smooth expand/collapse animations
   - Active state transitions

2. **Page transitions** (20 min)
   - AnimatePresence for page switches
   - Consistent fade-in timing

3. **Loading states** (20 min)
   - Skeleton loaders for tabs
   - Smooth spinners

**Deliverable:** Production-ready, polished navigation experience.

---

## 7. Specific File Changes

### 7.1 Sidebar.tsx (Quick Wins)

**File:** `src/components/Sidebar.tsx`

**Changes:**
```typescript
// BEFORE (13 items)
const navItems = [
  { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
  { id: "mission-control", label: "Mission Control", icon: Rocket },
  { id: "network", label: "Agent Network", icon: Network },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "usage", label: "Usage & Costs", icon: Coins },
  { id: "features", label: "Features", icon: Lightbulb },
  { id: "bugs", label: "Bugs", icon: Bug },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "tenants", label: "Business Units", icon: Building2 },
  { id: "audit", label: "Audit Log", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
]

// AFTER (6 items) — Quick Win
const navItems = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "mission-control", label: "Missions", icon: Rocket },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "platform", label: "Platform", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

// TODO Phase 3: Remove "network" after merging into Agents
// TODO Phase 3: Add Platform page (merge monitoring + usage)
```

**Lines changed:** ~10  
**Time:** 5 minutes  

---

### 7.2 page.tsx (Routing Updates)

**File:** `src/app/page.tsx`

**Changes for Quick Win:**
```typescript
// Remove cases for:
// - "bugs", "users", "roles", "tenants", "audit"
// Keep route for "features" but hide from nav

// Rename:
// - "dashboard" stays but component changes
// - "mission-control" stays
// - "agents" stays
// - Add "platform" case (Phase 3)

const renderPage = () => {
  switch (currentPage) {
    case "dashboard":
      return <Dashboard onNavigate={setCurrentPage} />
    case "mission-control":
      return <MissionControl className="h-full" />
    case "agents":
      return <AgentsPage userEmail={user?.email} userMetadata={user?.user_metadata} />
    case "platform": // NEW in Phase 3
      return <PlatformPage />
    case "settings":
      return <Settings user={user} onUpdate={refreshUser} embedded />
    
    // Hidden routes (direct access only, not in nav)
    case "features":
      return <FeatureBoard />
    case "network": // Remove in Phase 3 (merged into Agents)
      return <OrchestratorPanel className="h-full" />
    
    default:
      return <Dashboard onNavigate={setCurrentPage} />
  }
}
```

**Lines changed:** ~15  
**Time:** 10 minutes

---

### 7.3 Create PlatformPage.tsx (Phase 3A)

**File:** `src/components/PlatformPage.tsx` (NEW)

**Content:**
```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonitoringPage } from "./MonitoringPage"
import { TokenUsagePage } from "./TokenUsagePage"
import { SystemConfigPanel } from "./SystemConfigPanel"
import PageHeader from "./PageHeader"

export function PlatformPage() {
  const [activeTab, setActiveTab] = useState("health")

  return (
    <div>
      <PageHeader
        title="Platform"
        description="Monitor system health, usage, and configuration"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="usage">Usage & Costs</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <MonitoringPage />
        </TabsContent>

        <TabsContent value="usage">
          <TokenUsagePage />
        </TabsContent>

        <TabsContent value="config">
          <SystemConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Lines:** ~40  
**Time:** 30 minutes

---

### 7.4 Extract SystemConfigPanel.tsx (Phase 3A)

**File:** `src/components/SystemConfigPanel.tsx` (NEW)

**Content:**
Extract the "Platform Configuration" section from Settings.tsx, including:
- Supabase config display
- Gateway status
- System info
- Refresh button

**Lines:** ~150 (extracted from Settings.tsx)  
**Time:** 30 minutes

---

### 7.5 Update AgentsPage.tsx (Phase 3B)

**File:** `src/components/AgentsPage.tsx`

**Changes:**
Add "Network" view alongside existing agent list view:

```typescript
// Add state for view mode
const [viewMode, setViewMode] = useState<'details' | 'network'>('details')

// Add view toggle in header
<div className="flex items-center gap-2">
  <button
    onClick={() => setViewMode('details')}
    className={cn(
      "px-3 py-1.5 text-sm rounded",
      viewMode === 'details' ? "bg-purple-500/20 text-purple-300" : "text-white/50"
    )}
  >
    Details
  </button>
  <button
    onClick={() => setViewMode('network')}
    className={cn(
      "px-3 py-1.5 text-sm rounded",
      viewMode === 'network' ? "bg-purple-500/20 text-purple-300" : "text-white/50"
    )}
  >
    Network
  </button>
</div>

// Conditional render
{viewMode === 'details' && (
  <AgentListAndDetail />
)}
{viewMode === 'network' && (
  <OrchestratorPanel className="h-full" />
)}
```

**Lines changed:** ~50  
**Time:** 60 minutes

---

### 7.6 Optimize Dashboard.tsx (Phase 4)

**File:** `src/components/Dashboard.tsx`

**Changes:**
1. Remove quote footer (~5 lines)
2. Simplify stats grid to 3 cards (~20 lines)
3. Make Mission Control card larger and more prominent (~30 lines)
4. Add quick actions section (~40 lines)

**Lines changed:** ~95  
**Time:** 90 minutes

---

## 8. Success Metrics

### Quantitative
- Nav items: **13 → 6** (54% reduction)
- Placeholder pages: **5 → 0** (100% removed)
- Click depth to Mission Control: **1** (unchanged, but more prominent on Home)
- Page load time: Same or better (no new complexity)

### Qualitative
- CEO opens dashboard → sees **actionable workspace**, not clutter
- Every nav item earns its place with **real functionality**
- Clear hierarchy → users know where to go for what
- Consolidated tabs → **less context switching**, more focus

---

## 9. Visual Inspiration

### Linear
- **Minimal nav:** 5-6 items max
- **Content-first:** No decorative elements blocking workspace
- **Command palette:** Keyboard-driven navigation (consider adding)

### Vercel
- **Clean grouping:** Related items together
- **Nothing extra:** Every element serves a purpose
- **Performance:** Fast transitions, no lag

### Supabase Studio
- **Logical sections:** Platform, Agents, Admin
- **Collapsible groups:** Admin section hidden until needed
- **Consistent icons:** Visual language throughout

---

## 10. Future Considerations

### Command Palette (Post-MVP)
Add keyboard-driven navigation:
- `Cmd+K` → Open command palette
- Quick jump to any page, agent, or mission
- Search missions, agents, sessions

### Workspace Customization (Post-MVP)
Let users reorder nav items or pin favorites:
- CEO prioritizes Missions
- Ops admin prioritizes Platform
- Agent designer prioritizes Agents

### Mobile-First Nav (Future)
Bottom tab bar on mobile instead of sidebar:
- 🏠 Home
- 🚀 Missions
- 🤖 Agents
- 📊 Platform
- More (expandable)

---

## 11. Recommendation Summary

**Immediate Actions (Phase 1):**
1. Remove 5 placeholder pages from nav
2. Hide old FeatureBoard from nav
3. Rename labels (Command Center → Home, etc.)
4. Deploy: Nav goes from 13 → 8 items in <1 hour

**Medium-Term Actions (Phase 2-3):**
1. Add collapsible Admin section (empty for now)
2. Merge Monitoring + Usage → Platform page
3. Merge Agent Network → Agents page
4. Deploy: Nav down to 6 items in 2-4 hours

**Polish (Phase 4-5):**
1. Optimize Home page for actionability
2. Add smooth transitions and animations
3. Deploy: Production-ready in 1-2 hours

**Total Implementation Time:** 6-10 hours across 5 phases

**Immediate Impact:** Cleaner, more professional nav in <1 hour  
**Full Impact:** World-class interface in 1-2 days of focused work

---

## Appendix: Before/After Screenshot Mockups

### Before: 13-item Nav (Cluttered)
```
━━━━━━━━━━━━━━━━━━
 📊 Command Center
 🚀 Mission Control
 🔗 Agent Network
 🤖 Agents
 📈 Monitoring
 💰 Usage & Costs
 💡 Features
 🐛 Bugs           ← placeholder
 👥 Users          ← placeholder
 🛡️  Roles          ← placeholder
 🏢 Business Units ← placeholder
 📋 Audit Log      ← placeholder
 ⚙️  Settings
━━━━━━━━━━━━━━━━━━
```

### After: 6-item Nav (Clean)
```
━━━━━━━━━━━━━━━━━━
 🏠 Home
 🚀 Missions       ← PRIMARY
 🤖 Agents
 📊 Platform
 ⚙️  Settings
━━━━━━━━━━━━━━━━━━
 👥 Admin          ← collapsed
    (empty for now)
━━━━━━━━━━━━━━━━━━
```

---

**End of UX Audit**

*Next Steps:*
1. Review with CEO (Lance)
2. Prioritize phases based on urgency
3. Begin Phase 1 implementation (Quick Wins)
4. Iterate based on feedback

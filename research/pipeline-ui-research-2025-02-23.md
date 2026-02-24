# Feature Card Pipeline UI — Research Report
## Expandable Phase Tracker with Embedded Collaboration
*Date: 2025-02-23 | For: HBx Platform — Schell Brothers*

---

## 1. Top Tools Analyzed

### 1.1 Linear
**What they nail:** Speed and keyboard-first UX. Issue detail is a single pane with status/priority/assignee in a compact header, then a freeform description area, then activity feed (comments + state changes interleaved chronologically).

**Patterns worth stealing:**
- **Cmd+K everywhere** — status changes without leaving context
- **Activity feed = audit trail + comments unified** — no separate "history" tab
- **Sub-issues as inline expandable list** — parent-child without leaving the card
- **Cycles + Projects as orthogonal groupings** — maps to our module-level orchestration
- **Optimistic updates everywhere** — click a status, it changes instantly, syncs in background

**Relevance to us:** Their activity feed model is the closest to what we want per-phase. But they don't have per-phase detail — everything is flat. We'd improve on Linear by scoping activity/content to each pipeline phase.

---

### 1.2 Vercel Deployment Flow
**What they nail:** The single best step-by-step pipeline UI in production software.

**Patterns worth stealing:**
- **Vertical stepper with expandable log sections** — each deploy step (Clone, Build, Deploy, Assign Domains) is a collapsible section showing real-time streaming logs
- **Step status indicators** — green check, spinning loader, red X, gray pending — instantly scannable
- **Time annotations per step** — "Building... 34s" gives immediate feedback
- **Auto-expand active step, collapse completed** — focus follows progress
- **Streaming output** — logs appear line-by-line during build

**Relevance to us:** This is the closest analog to our 8-step tracker. Adapt their pattern: vertical stepper where each step expands to show phase-specific content instead of logs.

---

### 1.3 GitHub Actions / GitHub Projects
**What they nail:** Two things — (1) Actions: expandable job steps with log output per step in a left-nav + right-detail layout. (2) Projects: flexible views (board/table/timeline) over the same data.

**Patterns worth stealing:**
- **Actions: Left sidebar lists all jobs, clicking one shows steps as expandable accordions** — each step has collapsible log output
- **Actions: Re-run from specific step** — great for our "re-run from phase" concept
- **Projects: Custom fields per item** — extensible metadata model
- **PR timeline: Interleaved commits, reviews, comments, CI status** — unified audit trail

**Relevance to us:** The Actions job-step-log pattern maps directly to our phase panels. The PR timeline is the gold standard for audit trails.

---

### 1.4 Buildkite
**What they nail:** Pipeline visualization as a horizontal graph of steps with parallel branches, each clickable to reveal logs.

**Patterns worth stealing:**
- **Pipeline-as-graph** — steps shown as connected nodes, parallel steps shown side-by-side
- **Click-to-expand log viewer per step** — full-screen takeover with streaming logs
- **Annotations** — rich content (markdown, HTML) injected into pipeline view by steps themselves
- **Build grouping** — steps can be grouped under collapsible headers
- **Manual approval gates** — "Unblock" button on specific steps (maps to our Human Review)

**Relevance to us:** Their manual gate pattern is exactly our Human Review step. Their annotation system (steps can inject rich content into the pipeline view) is worth adopting — let each phase inject its own summary card.

---

### 1.5 Retool Workflows
**What they nail:** Visual workflow builder with step inspector panel.

**Patterns worth stealing:**
- **Canvas + inspector split** — workflow graph on left, clicked step's config/output on right
- **Step output previews** — see the actual data flowing between steps
- **Conditional branching visualization** — diamond nodes for decisions

**Relevance to us:** The inspector panel pattern (click step → see details in side panel) is an alternative to our accordion approach. We chose vertical expansion (better for mobile, simpler mental model), but the inspector pattern works if we ever need a wider layout.

---

### 1.6 Airplane.dev (now acquired by Airtable)
**What they nail:** Task/runbook execution with rich step UIs.

**Patterns worth stealing:**
- **Form-driven steps** — some steps present forms for human input, others show outputs
- **Approval workflows** — specific steps pause for human approval with approve/reject buttons
- **Output rendering** — tables, JSON, files rendered inline per step

**Relevance to us:** Their approval UX is directly relevant to our Human Review phase. Present structured data with clear approve/reject/comment actions.

---

### 1.7 Shortcut (formerly Clubhouse)
**What they nail:** Story detail with iteration context and linked items.

**Patterns worth stealing:**
- **Story relationships** — blockers, blocked-by, related, duplicates — shown as chips on the card
- **Epic → Story → Task hierarchy** — three-level nesting with roll-up progress bars
- **Iteration velocity tracking** — useful for our module-level orchestration

**Relevance to us:** Their hierarchy model (Epic → Story → Task) maps to our Module → Feature → Phase pattern.

---

### 1.8 CircleCI
**What they nail:** Pipeline → Workflow → Job → Step hierarchy with drill-down.

**Patterns worth stealing:**
- **Four-level drill-down** — Pipeline list → Workflow graph → Job detail → Step logs
- **Workflow graph with timing** — each node shows duration, critical path highlighted
- **Test result integration** — failing tests surfaced directly in the step that ran them
- **Insights dashboard** — aggregate metrics across pipeline runs

**Relevance to us:** Their test result surfacing pattern maps to our QA phase. Show test results, coverage, failures directly in the QA step panel.

---

### 1.9 Notion (for collaboration patterns)
**Patterns worth stealing:**
- **Inline comments on any block** — select text, comment on it. Threaded.
- **@-mention anything** — pages, people, dates, databases
- **Synced blocks** — same content visible in multiple contexts
- **Real-time cursors** — see who's editing where

**Relevance to us:** Inline comments per-phase (not just chat) could be valuable. But avoid Notion's complexity — keep it focused.

---

### 1.10 Cursor / Windsurf / AI-Native Dev Tools
**What they nail:** Agent-driven workflows where AI proposes, human reviews.

**Patterns worth stealing:**
- **Diff-based approval** — AI proposes changes, human sees diff and approves/rejects
- **Agent activity stream** — see what the AI is doing in real-time
- **Human-in-the-loop checkpoints** — AI pauses at defined gates for human input
- **Context window as shared workspace** — both human and AI see the same state

**Relevance to us:** This IS our model. HBx (the AI) drives the pipeline, pauses at Planning and Human Review for collaboration. The diff-based approval pattern from code review tools should inform our Human Review phase UX.

---

## 2. Expandable Step/Phase Detail Patterns

### Recommended: **Vertical Stepper-Accordion Hybrid**

| Pattern | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Horizontal stepper** (MUI Stepper) | Compact, scannable | No room for rich content per step | ❌ Too cramped for our needs |
| **Vertical accordion** (Vercel-style) | Rich content per step, natural scroll flow | Can get long | ✅ **Best fit** |
| **Timeline** (GitHub PR) | Great for audit trails | Less structured for distinct phases | ✅ Good for within-phase activity |
| **Tab panel** (current design) | Familiar | Disconnects from pipeline flow | ❌ What we're replacing |
| **Side inspector** (Retool) | Keeps overview visible | Requires wide viewport | ⚠️ Good for desktop power-user mode |

**Our design:** Vertical stepper-accordion where:
- All 8 steps are always visible as a compact labeled row (like Vercel's deploy steps)
- Clicking a step expands it inline to reveal the phase panel
- Only one step expanded at a time (accordion behavior)
- Active step auto-expands on first load
- Completed steps show a 1-line summary when collapsed (e.g., "Spec approved — 3 docs, 2 decisions")

---

## 3. In-Context Collaboration Patterns

### What Works (adopt):
1. **Phase-scoped chat (Linear-style activity feed, but per-phase)** — Messages in Planning phase stay in Planning. No global chat noise.
2. **@-mention to pull people in** — "@john review this spec" in the Planning chat
3. **AI-as-participant** — HBx appears as a chat participant with a distinct avatar. It proposes, user responds. Conversational spec building.
4. **Structured prompts** — In Planning chat, HBx can post interactive cards: "I've drafted the spec. [View Spec] [Approve] [Request Changes]"
5. **Comment anchoring** — In non-chat phases (e.g., QA), allow comments on specific items (a test result, a PR) rather than open chat

### What Doesn't Work (avoid):
- ❌ **Global chat on every phase** — Creates noise. Chat only where human input is needed (Planning, Human Review)
- ❌ **Slack-style threading** — Too complex for per-phase context. Simple linear chat is enough.
- ❌ **Notification overload** — Only notify on @-mentions and phase transitions, not every AI action

### Recommended Chat UX:
- Planning phase: Persistent chat panel at bottom of expanded phase. HBx + user messages. HBx can post rich cards (spec drafts, questions, options).
- Human Review phase: Same chat + approval widget (approve/reject/request changes with comment).
- All other phases: Read-only activity log with optional comment ability on specific items.

---

## 4. Audit Trail UX

### Best Patterns from Analyzed Tools:

1. **Unified timeline (GitHub PR model):**
   - Interleave state changes, comments, commits, deployments in one chronological stream
   - Each entry has: avatar, action description, timestamp, expandable detail
   - Filter by type: "Show only state changes" / "Show only comments"

2. **Collapsible log groups (Vercel/Buildkite):**
   - Group related events: "Build phase — 12 events" → expand to see individual steps
   - Show duration per group

3. **Diff view for changes (Notion/Git):**
   - When a spec is edited, show what changed
   - When status changes, show from → to with who triggered it

### Recommended for HBx:
- **Per-phase mini-timeline** inside each expanded phase panel (shows what happened in that phase)
- **Global timeline** accessible via a single button on the header card (shows full feature history across all phases)
- Each timeline entry: `[timestamp] [actor: user or HBx] [action] [detail toggle]`

---

## 5. Scaling: Features → Modules

### The Challenge:
A module = multiple features with dependencies. Same card system needs to work at a higher level.

### Patterns That Scale:

1. **Parent-child card hierarchy (Shortcut model):**
   - Module card contains Feature cards as children
   - Module has its own 8-step pipeline (or a simplified version)
   - Module progress = aggregate of child feature progress
   - **Roll-up progress bar:** "Module: Auth System — 5/8 features complete, currently in Build phase"

2. **Dependency graph (Buildkite parallel steps):**
   - Features within a module can have dependencies: "Feature B blocked by Feature A"
   - Visualize as a mini DAG within the module card
   - Auto-advance dependent features when blockers complete

3. **Milestone tracking (GitHub Milestones):**
   - Module = milestone with target date
   - Burn-down chart showing feature completion rate
   - Critical path highlighting: "Feature C is on the critical path — blocking 3 others"

4. **Nested Kanban (Monday.com sub-items):**
   - Module appears as a card on a higher-level board
   - Expand module to see its features as a nested board
   - Roll-up status: module shows the phase of its least-advanced feature

### Recommended Architecture:
```
Module Card (same component, recursive)
├── Header: Module name, priority, aggregate progress, target date
├── Pipeline Tracker: 8 steps, but progress = aggregate of children
├── Expanded Phase Panel: Shows all features in that phase
│   ├── Feature A — [status chip] [assignee] [quick actions]
│   ├── Feature B — [status chip] [assignee] [quick actions]
│   └── + Add Feature
├── Dependency View: Toggle to see DAG of feature dependencies
└── Module Chat: Planning + Human Review for module-level decisions
```

**Key insight:** Use the SAME card component for both features and modules. A module is just a card whose phase panels contain child cards instead of spec docs / build logs.

---

## 6. Real-Time UX Patterns

### What Makes It Feel Instant:

1. **Optimistic updates (Linear):**
   - Click "Approve" → UI updates immediately → server confirms in background
   - If server rejects, roll back with toast: "Couldn't approve — [reason]"
   - Apply to: status changes, phase transitions, chat messages

2. **Presence indicators (Figma/Notion):**
   - Show avatars of who's viewing this feature card
   - In chat phases, show typing indicator for both user and HBx
   - On the Kanban board, show a subtle glow on cards being actively viewed

3. **Live phase transitions (Vercel deploy flow):**
   - When HBx moves a feature from Build to QA, anyone viewing the card sees:
     - Build step checks green ✓ with animation
     - QA step lights up purple with subtle pulse
     - Phase panel auto-expands to QA
   - Use WebSocket / SSE for push updates

4. **Streaming AI output:**
   - When HBx is generating a spec or analyzing code, stream the output token-by-token
   - Show "HBx is thinking..." with animated dots, then content streams in
   - Makes AI feel alive and responsive vs. waiting for a block of text

5. **Toast notifications for background events:**
   - "Feature: Auth Login moved to QA by HBx" — dismissible toast
   - Only show for features the user is watching

### Tech Stack Recommendations:
- **WebSocket** for bidirectional real-time (chat, presence)
- **SSE (Server-Sent Events)** for unidirectional updates (phase transitions, AI streaming)
- **Optimistic updates via React Query / SWR** mutation patterns
- **CRDT or OT** only if we add collaborative editing (not needed for V1)

---

## 7. Novel / Emerging Patterns

### AI-Native Workflow (What's Genuinely New):

1. **Agent Activity Feed (Devin, Cursor, Copilot Workspace):**
   - The AI agent narrates what it's doing: "Analyzing requirements... Generating spec draft... Creating API schema..."
   - User can interrupt: "Wait, change the approach to X"
   - **Apply to us:** Each non-chat phase (Spec Gen, Build, QA) shows HBx's activity stream in real-time

2. **Confidence Indicators:**
   - AI shows confidence level on its outputs: "Spec draft (92% aligned with requirements)" 
   - Lower confidence items get flagged for human review
   - **Apply to us:** HBx could flag uncertain decisions in the Human Review phase

3. **Suggested Next Actions (GitHub Copilot):**
   - After each phase completes, HBx suggests what to do: "Spec approved. Ready to generate architecture. [Proceed] [Modify constraints first]"
   - Reduces decision fatigue

4. **Parallel Agent Execution (CrewAI, AutoGen patterns):**
   - Multiple AI agents work on different aspects simultaneously
   - Visualize as parallel tracks within a phase: "Agent 1: Frontend spec | Agent 2: API spec | Agent 3: DB schema"
   - **Apply to us:** In Build phase, show parallel work streams

5. **Context Carry-Forward:**
   - Each phase's output becomes input context for the next phase
   - Visualize as a "context chain": Planning decisions → Spec constraints → Build guidelines → QA criteria
   - User can see what context HBx is using at each phase

---

## 8. Recommended Component Architecture

### Feature Card — Mockup-Ready Breakdown

```
┌─────────────────────────────────────────────────┐
│ HEADER CARD (always visible, sticky on scroll)  │
│ ┌─────┐                                        │
│ │ P1  │  Auth: Login Flow          [In Build]   │
│ │ 🔴  │  @sarah · $2,400 · Sprint 3            │
│ └─────┘  🏷️ auth  🏷️ mvp  🔗 Figma  🔗 PRD    │
├─────────────────────────────────────────────────┤
│ PIPELINE TRACKER (always visible)               │
│                                                 │
│ ✅ ✅ ✅ ✅ 🟣 ⚫ ⚫ ⚫                          │
│ Idea Plan Spec Design BUILD  QA  Review Deploy  │
│                  ▲                              │
│              (clickable)                        │
├─────────────────────────────────────────────────┤
│ EXPANDED PHASE PANEL (one at a time)            │
│                                                 │
│ ┌─ BUILD (Active) ──────────────────────────┐   │
│ │                                           │   │
│ │  📊 Progress: 3/7 tasks complete          │   │
│ │                                           │   │
│ │  📝 Active Tasks                          │   │
│ │  ├── LoginForm component      [In Progress]│  │
│ │  ├── Auth API endpoint        [Complete ✓] │  │
│ │  └── Session management       [Queued]     │  │
│ │                                           │   │
│ │  🔀 Recent Commits                        │   │
│ │  ├── abc1234 "Add LoginForm"  2h ago      │   │
│ │  └── def5678 "Auth endpoint"  5h ago      │   │
│ │                                           │   │
│ │  🤖 HBx Activity                          │   │
│ │  ├── Generating session mgmt code...      │   │
│ │  └── [View Agent Activity]                │   │
│ │                                           │   │
│ │  ⏱️ Phase Timeline                        │   │
│ │  └── [12 events] [Expand]                 │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ ─── Collapsed: QA (next) ──────────────────     │
│     0/3 test suites · Blocked by Build          │
│                                                 │
│ ─── Collapsed: Human Review ───────────────     │
│     Pending · @sarah assigned as reviewer       │
└─────────────────────────────────────────────────┘
```

### Component Tree:

```
<FeatureCard>
  <CardHeader />                    // Sticky, always visible
    <PriorityBadge />
    <Title />
    <StatusChip />
    <AssigneeAvatar />
    <CostDisplay />
    <TagList />
    <LinkChips />
  
  <PipelineTracker />               // Always visible, horizontal step bar
    <PhaseStep />                   // × 8, clickable
      <StepIcon status={done|active|future} />
      <StepLabel />
  
  <PhasePanel phase={activePhase}>  // Expanded for selected step
    // Renders different content per phase type:
    
    <PlanningPhase>                 // Chat-enabled
      <SpecSummary />
      <DecisionLog />
      <ChatPanel participant="hbx" />
    </PlanningPhase>
    
    <BuildPhase>                    // Activity-focused
      <TaskList />
      <CommitFeed />
      <AgentActivityStream />
    </BuildPhase>
    
    <QAPhase>                       // Results-focused
      <TestResultsSummary />
      <CoverageReport />
      <IssueList />
    </QAPhase>
    
    <HumanReviewPhase>              // Chat + approval
      <ReviewChecklist />
      <DiffViewer />
      <ApprovalWidget />
      <ChatPanel participant="hbx" />
    </HumanReviewPhase>
    
    <DeployPhase>                   // Confirmation-focused
      <DeployConfig />
      <DeployLog />
      <RollbackButton />
    </DeployPhase>
    
    // Common sub-components in every phase:
    <PhaseTimeline />               // Collapsible audit trail
    <PhaseComments />               // Optional anchored comments
  </PhasePanel>
  
  <CollapsedPhaseSummary />         // 1-line summary for non-expanded phases
</FeatureCard>
```

---

## 9. Risks & Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Our Mitigation |
|---|---|---|
| **Over-expanding** — all phases open at once | Information overload, lost focus | Accordion: only one phase expanded at a time |
| **Tab soup** — separate tabs for details, activity, comments, history | Fragments context, users miss things | Everything in the phase panel, no tabs |
| **Notification spam** — every AI action triggers alerts | Users disable notifications, miss important ones | Only notify on phase transitions + @-mentions |
| **Chat everywhere** — chat on every phase | Fragments conversations, creates noise | Chat ONLY on Planning + Human Review |
| **Flat audit trail** — dump all events in one undifferentiated list | Impossible to scan | Group by phase, filter by type, collapse by default |
| **Blocking UI on AI operations** — spinner while HBx works | Feels slow, user can't do other things | Streaming output + background processing with toast updates |
| **Deep nesting** — Module → Epic → Feature → Task → Subtask | Cognitive overload | Max 2 levels: Module → Feature. Tasks are within feature phases, not separate cards |
| **Premature dependency graphs** — showing complex DAGs before users need them | Intimidating, over-engineered feel | Start with simple "blocked by" chips. Add graph view as opt-in toggle |
| **Custom everything** — letting users customize phases | Maintenance nightmare, inconsistent experience | Fixed 8-phase pipeline. Customization via phase panel content, not phase structure |

---

## 10. Summary Recommendations

### Immediate (V1):
1. **Vertical stepper-accordion** as primary navigation (replace tabs)
2. **Phase-specific panels** with tailored content per phase type
3. **Chat in Planning + Human Review only** with HBx as AI participant
4. **Optimistic updates** on all status changes
5. **Collapsed phase summaries** (1-line) for scanability
6. **Per-phase mini-timeline** for audit trail

### Near-term (V2):
7. **Streaming AI activity** in Build/QA/Spec phases
8. **Presence indicators** on cards
9. **Module cards** using same component (recursive)
10. **Simple dependency tracking** (blocked-by chips)

### Future (V3):
11. **Dependency DAG visualization** for modules
12. **Parallel agent tracks** within phases
13. **Confidence indicators** on AI outputs
14. **Cross-feature context chain** visualization

---

*Research compiled from analysis of: Linear, Vercel, GitHub Actions/Projects, Buildkite, Retool Workflows, Airplane.dev, Shortcut, CircleCI, Notion, Cursor/Copilot Workspace, and emerging AI-native workflow patterns.*

# Audit Trail Phase 3 — Design Spec: Chat on Plan + Review with @-Mentions

**Feature ID:** `a16d3efc-6073-4e4f-b899-71c3f03e8718`
**Author:** IN5 (UI/UX Expert)
**Date:** 2026-02-24

---

## 1. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Chat renders below handoff packet content with a `border-t border-white/10` divider — **not collapsible** | Keep conversation visible; collapsing hides context. Planning/review are decision phases where chat is essential. |
| 2 | Message style: **match existing bridge chat** (see `BridgeChatMessage` in FeatureBoard.tsx) | Consistency. Users already see the same bubble pattern in the feature detail chat tab. |
| 3 | @-mention dropdown: **absolute positioned below cursor**, max-h-48, filtered live | Standard pattern (Slack/GitHub). Floating above would clip against panel bottom. |
| 4 | @-mention in messages: **inline badge** with agent emoji + id, `bg-purple-500/20 text-purple-300 rounded px-1` | Visually distinct but not heavy. Purple matches agent theming. |
| 5 | Input area: **lighter-weight** than ChatInput — no file attachments, just textarea + send + @-mention | Phase chat is text-only discussion. Attachments belong in handoff artifacts. |
| 6 | Empty state: centered muted text with MessageSquare icon | Inviting but unobtrusive. |
| 7 | Progress bar chat indicator: **small dot badge** on Plan/Review segments when messages exist | Subtle visual cue without cluttering the progress bar. |

---

## 2. Component Tree

```
FeatureDetailPanel (existing)
  └─ StepDetailPanel (existing, renders when progress bar segment clicked)
       ├─ HandoffPacketContent (existing — summary, artifacts, decisions, timeline)
       ├─ <div className="border-t border-white/10 mt-4" /> ← divider
       └─ PhaseChatPanel (NEW — only for phase="planning" | "review")
            ├─ PhaseChatMessages
            │    └─ PhaseChatBubble (per message)
            │         └─ MentionBadge (inline, per @-mention)
            └─ PhaseChatInput
                 └─ MentionAutocomplete (floating dropdown)
```

---

## 3. Component Specifications

### 3.1 PhaseChatPanel

**File:** `dashboard/src/components/features/audit-trail/PhaseChatPanel.tsx`

```tsx
interface PhaseChatPanelProps {
  featureId: string;
  phase: "planning" | "review";
}
```

**Container classes:**
```
mt-4 flex flex-col
```

No max-height on the panel itself — it lives inside the already-scrollable step detail area. Messages list gets `max-h-[320px] overflow-y-auto`.

**Conditional render logic:**
```tsx
// In StepDetailPanel or wherever the step content renders:
{(phase === "planning" || phase === "review") && (
  <>
    <div className="border-t border-white/10 mt-4" />
    <PhaseChatPanel featureId={featureId} phase={phase} />
  </>
)}
```

---

### 3.2 PhaseChatMessages

**File:** `dashboard/src/components/features/audit-trail/PhaseChatMessages.tsx`

```tsx
interface PhaseChatMessagesProps {
  messages: PhaseChatMessage[];
  agents: Agent[];
}
```

**Outer container:**
```
max-h-[320px] overflow-y-auto space-y-2 py-3 px-1
scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
```

**Empty state (when messages.length === 0):**
```tsx
<div className="flex flex-col items-center justify-center py-8 text-white/30">
  <MessageSquare className="h-5 w-5 mb-2 opacity-50" />
  <p className="text-[11px]">No messages yet. Start the conversation...</p>
</div>
```

**Auto-scroll:** `useRef` on a sentinel `<div>` at bottom, `scrollIntoView({ behavior: 'smooth' })` on message array change.

---

### 3.3 PhaseChatBubble

**Inline within PhaseChatMessages — not a separate file.**

Layout mirrors `BridgeChatMessage` from FeatureBoard.tsx:

```tsx
<div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
  <span className="text-sm flex-shrink-0 mt-0.5">{emoji}</span>
  <div className={cn(
    "max-w-[80%] rounded-lg px-2.5 py-1.5",
    isUser
      ? "bg-blue-600/20 border border-blue-500/20"
      : "bg-white/[0.04] border border-white/10"
  )}>
    {/* Header row */}
    <div className={cn("flex items-baseline gap-2 mb-0.5", isUser && "flex-row-reverse")}>
      <span className="text-[10px] font-medium text-white/70">{senderName}</span>
      <span className="text-[9px] text-white/25">
        {new Date(createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
    {/* Content with inline mention badges */}
    <p className={cn("text-[11px] text-white/70 whitespace-pre-wrap", isUser && "text-right")}>
      {renderContentWithMentions(content, mentions)}
    </p>
  </div>
</div>
```

---

### 3.4 MentionBadge

**Inline component rendered by `renderContentWithMentions()`:**

```tsx
<span className="inline-flex items-center gap-0.5 bg-purple-500/20 text-purple-300 rounded px-1 py-0 text-[10px] font-medium mx-0.5 align-baseline">
  {agentEmoji && <span className="text-[9px]">{agentEmoji}</span>}
  @{agentId}
</span>
```

**`renderContentWithMentions` logic:**
- Regex: `/@(\w+)/g`
- For each match, look up agent in agents list
- Replace with `<MentionBadge>` component
- Non-matched text rendered as plain text spans

---

### 3.5 PhaseChatInput

**File:** `dashboard/src/components/features/audit-trail/PhaseChatInput.tsx`

```tsx
interface PhaseChatInputProps {
  onSend: (content: string, mentions: string[]) => void;
  disabled?: boolean;
  agents: Agent[];
}
```

**Layout:**
```tsx
<div className="flex items-end gap-2 pt-2">
  <div className="flex-1 relative">
    <textarea
      value={message}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      placeholder="Type a message... Use @ to mention"
      rows={1}
      className={cn(
        "w-full resize-none rounded-xl border border-white/10 bg-white/5",
        "px-3 py-2 text-[11px] text-white placeholder:text-white/30",
        "focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20",
        "max-h-[100px]"
      )}
    />
    {/* MentionAutocomplete renders here when active */}
    {showMentions && (
      <MentionAutocomplete
        agents={filteredAgents}
        onSelect={handleMentionSelect}
        activeIndex={mentionActiveIndex}
      />
    )}
  </div>
  <Button
    onClick={handleSend}
    disabled={disabled || !message.trim()}
    className="h-8 w-8 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 flex-shrink-0"
  >
    <Send className="h-3.5 w-3.5" />
  </Button>
</div>
<p className="text-[9px] text-white/25 mt-1.5 text-center">
  Enter to send · Shift+Enter for new line · @ to mention
</p>
```

**Textarea auto-resize:** Same pattern as ChatInput — `textarea.style.height = 'auto'; textarea.style.height = Math.min(scrollHeight, 100) + 'px'`

**@-mention detection:**
- On every keystroke, check character before cursor
- Walk backwards to find `@` preceded by whitespace or start-of-string
- Extract query = text between `@` and cursor
- If query found → `setShowMentions(true)`, filter agents by query
- On select, replace `@query` with `@{agentId} ` (trailing space)
- Track mentions in state array `string[]`, passed to `onSend`

**Keyboard in mention mode:**
- ArrowUp/ArrowDown: navigate dropdown
- Enter: select highlighted (prevent send)
- Escape: close dropdown
- Any other key: continue filtering

---

### 3.6 MentionAutocomplete

**File:** `dashboard/src/components/features/audit-trail/MentionAutocomplete.tsx`

```tsx
interface MentionAutocompleteProps {
  agents: Agent[];
  onSelect: (agentId: string) => void;
  activeIndex: number;
}
```

**Position:** Absolute, anchored to bottom-left of textarea, opens **upward** (since input is at bottom of panel).

```tsx
<div className="absolute bottom-full left-0 mb-1 w-56 max-h-48 overflow-y-auto
  bg-black/95 border border-white/10 rounded-lg shadow-xl shadow-black/50 py-1 z-50">
  {agents.map((agent, i) => (
    <button
      key={agent.id}
      onClick={() => onSelect(agent.id)}
      className={cn(
        "w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors",
        i === activeIndex
          ? "bg-purple-500/20 text-purple-300"
          : "text-white/70 hover:bg-white/5"
      )}
    >
      <span className="text-sm">{agent.emoji}</span>
      <div>
        <span className="font-medium">{agent.id}</span>
        <span className="text-white/40 ml-1.5">{agent.name}</span>
      </div>
    </button>
  ))}
  {agents.length === 0 && (
    <div className="px-3 py-2 text-[10px] text-white/30">No matches</div>
  )}
</div>
```

**Search behavior:** Case-insensitive prefix match on both `agent.id` and `agent.name`. Show max 6 results (first 6 matches).

---

### 3.7 Progress Bar Chat Indicator

In `PipelineProgress` component, add a tiny dot to segments that have chat:

```tsx
// Add prop: chatPhases?: Set<string> (phases with messages)
{isCurrent && chatPhases?.has(s) && (
  <span className="absolute -top-1 right-0 w-1.5 h-1.5 rounded-full bg-purple-400" />
)}
```

Each segment needs `relative` positioning. Dot is `absolute -top-1 right-0`.

---

## 4. Data Hook

**File:** `dashboard/src/hooks/usePhaseChatMessages.ts`

```tsx
interface PhaseChatMessage {
  id: string;
  feature_id: string;
  phase: "planning" | "review";
  sender_type: "user" | "agent" | "orchestrator";
  sender_id: string;
  sender_name: string;
  content: string;
  mentions: string[];
  created_at: string;
}

function usePhaseChatMessages(featureId: string, phase: "planning" | "review") {
  // 1. GET /api/features/[id]/phase-chat?phase={phase} on mount
  // 2. Subscribe to supabase realtime INSERT on phase_chat_messages
  //    filter: feature_id=eq.{featureId}
  //    client-side filter: msg.phase === phase
  // 3. De-dupe by id before appending
  // 4. Return { messages, loading, error, sendMessage }
  // 5. sendMessage: POST /api/features/[id]/phase-chat
  //    body: { phase, sender_type: 'user', sender_id: 'Lance', sender_name: 'Lance', content, mentions }
  //    Optimistic insert with opt-{timestamp} id, replace on server response
}
```

---

## 5. Spacing & Layout Summary

| Element | Spacing |
|---------|---------|
| Divider above chat | `mt-4 border-t border-white/10` |
| Messages container | `max-h-[320px] overflow-y-auto space-y-2 py-3 px-1` |
| Message bubble | `max-w-[80%] rounded-lg px-2.5 py-1.5` |
| Input row | `pt-2 gap-2` |
| Send button | `h-8 w-8` |
| Mention dropdown | `w-56 max-h-48 bottom-full mb-1` |
| Helper text | `text-[9px] text-white/25 mt-1.5` |

---

## 6. Color Palette (consistent with existing UI)

| Element | Classes |
|---------|---------|
| User bubble | `bg-blue-600/20 border-blue-500/20` |
| Agent/system bubble | `bg-white/[0.04] border-white/10` |
| @-mention badge | `bg-purple-500/20 text-purple-300` |
| Send button | `bg-purple-500 hover:bg-purple-600` |
| Mention dropdown active | `bg-purple-500/20 text-purple-300` |
| Empty state | `text-white/30` |
| Chat indicator dot | `bg-purple-400` |

---

## 7. Files to Create/Modify

### New Files:
1. `dashboard/src/components/features/audit-trail/PhaseChatPanel.tsx`
2. `dashboard/src/components/features/audit-trail/PhaseChatMessages.tsx`
3. `dashboard/src/components/features/audit-trail/PhaseChatInput.tsx`
4. `dashboard/src/components/features/audit-trail/MentionAutocomplete.tsx`
5. `dashboard/src/hooks/usePhaseChatMessages.ts`
6. `dashboard/src/app/api/features/[id]/phase-chat/route.ts`

### Modified Files:
7. `dashboard/src/components/features/FeatureBoard.tsx` — import PhaseChatPanel, render below step content for plan/review phases; add chatPhases prop to PipelineProgress
8. `dashboard/src/components/features/audit-trail/types.ts` — add `PhaseChatMessage` interface
9. `dashboard/src/lib/agents.ts` (new) — extract `demoAgents` array from FeatureBoard to shared module

---

## 8. Handoff to IN2

**What to build:**
- 6 new files, 3 modified files as listed above
- API route: GET + POST on `/api/features/[id]/phase-chat`
- Supabase table `phase_chat_messages` already exists (per IN1 spec)
- Extract `demoAgents` to `lib/agents.ts` for shared use
- Realtime subscription in `usePhaseChatMessages` hook
- Conditional render: chat only on `planning` and `review` phases

**Key constraints:**
- No file attachments in phase chat (text + mentions only)
- Reuse bridge chat bubble style exactly (BridgeChatMessage pattern)
- Mention dropdown opens upward (input is at panel bottom)
- Max 6 results in dropdown, prefix search on id + name
- Optimistic message insertion with de-dupe on realtime callback

**Acceptance criteria:**
- [ ] Chat visible only on Plan and Review step panels
- [ ] Messages persist via API and appear in realtime
- [ ] @-mention autocomplete triggers on `@` keystroke
- [ ] Mentions render as purple badges in message bubbles
- [ ] Empty state shows when no messages
- [ ] Enter sends, Shift+Enter newlines
- [ ] Progress bar shows dot indicator for phases with messages
- [ ] Typecheck passes, no console errors

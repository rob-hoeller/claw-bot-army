# Design Spec: Unified Feature Creation — Streaming Planning Chat

**Feature ID:** `f03e11f5-2dd2-460e-a330-d6d5fd63a025`
**Author:** HBx_IN5 (UI/UX Expert)
**Date:** 2026-02-21
**Status:** Design Complete

---

## 1. Streaming Chat in CreateFeaturePanel

### Pattern: Match ChatPanel SSE Streaming

The existing `ChatPanel.tsx` has a proven SSE streaming pattern with `parseSSEStream`, `isStreaming`/`streamingContent` state, and a typing indicator that transitions to streamed text. The CreateFeaturePanel must adopt this exact pattern.

**State additions to CreateFeaturePanel:**
```typescript
const [isStreaming, setIsStreaming] = useState(false)
const [streamingContent, setStreamingContent] = useState("")
const abortControllerRef = useRef<AbortController | null>(null)
```

**Streaming behavior:**
1. User sends message → optimistic append to `chatMessages`
2. Show **typing indicator** (existing bounce dots) while waiting for first token
3. On first token: replace dots with a **streaming message bubble** showing accumulated text
4. On `[DONE]`: finalize message in `chatMessages` array, clear streaming state

**Streaming message rendering** (insert between the `chatMessages.map` and the `chatEndRef`):
```tsx
{isStreaming && streamingContent && (
  <div className="flex gap-2">
    <span className="text-sm flex-shrink-0 mt-0.5">🏗️</span>
    <div className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 whitespace-pre-wrap bg-white/[0.04] border border-white/10">
      <ReactMarkdown>{streamingContent}</ReactMarkdown>
      <span className="inline-block w-1.5 h-3 bg-purple-400/60 animate-pulse ml-0.5" />
    </div>
  </div>
)}
```

The blinking cursor (▎) provides visual feedback that tokens are still arriving.

**Identity change:**
- Emoji: `📐` → `🏗️`
- Initial message: `"👋 I'm **IN1** — your Product Architect. Let's plan this feature together.\n\nWhat problem are you looking to solve?"`

### API Call Pattern

Replace `fetch → JSON` with streaming `ReadableStream` parsing. Extract `parseSSEStream` from `ChatPanel.tsx` into a shared utility (`@/lib/sse-utils.ts`) and reuse in both components.

```typescript
// @/lib/sse-utils.ts — extracted from ChatPanel
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (content: string) => void,
  onDone: (fullContent: string, receivedDone: boolean) => void
): Promise<void>
```

---

## 2. "Create Feature" from Chat Mode

### Button Placement

Add a **sticky action bar** at the bottom of the chat area, above the input, that appears after ≥2 assistant messages (indicating enough planning context):

```
┌──────────────────────────────────────┐
│  [chat messages scroll area]         │
│                                      │
├──────────────────────────────────────┤
│  ✨ Create Feature from Chat         │  ← action bar (conditional)
├──────────────────────────────────────┤
│  [input field]                [send] │
└──────────────────────────────────────┘
```

**Styling:**
```tsx
{chatMessages.filter(m => m.role === 'assistant').length >= 2 && (
  <div className="flex-shrink-0 px-3 py-2 border-t border-white/5">
    <Button
      onClick={handleCreateFromChat}
      className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
      disabled={saving || chatting}
    >
      <Sparkles className="h-3 w-3 mr-1.5" />
      Create Feature from Chat
    </Button>
  </div>
)}
```

### What Gets Extracted

On click:
1. Format full chat transcript as markdown (alternating `**User:**` / `**IN1:**` blocks)
2. Store as `feature_spec`
3. Title: extracted from IN1's last structured summary (look for `# ` or `**Title:**`) — fallback to first user message truncated to 80 chars
4. `status: 'planning'`, `assigned_to: 'HBx_IN1'`, `requested_by: 'Lance'`

**No confirmation modal** — the action is low-risk (feature starts in `planning` status and can be edited). Show a brief toast/inline success message instead.

### Helper text update
Replace `"Chat to plan, then switch to Form to create"` with:
`"Plan with IN1, then create directly • Or use Form tab for quick entry"`

---

## 3. Transition: Planning Chat → Feature Detail Panel

After successful feature creation:

1. **Close** CreateFeaturePanel
2. **Open** FeatureDetailPanel for the new feature (call `onCreated(data)` which should trigger detail view)
3. **Chat continuity:** The detail panel loads chat from `feature_spec` as read-only history, then connects to the live `/api/features/plan` streaming endpoint for continued conversation
4. **Visual indicator:** Show a divider in the chat: `── Feature created · Continue planning below ──`

The detail panel chat reuses the same streaming infrastructure. Store ongoing messages in `work_item_messages` table (keyed by feature ID).

---

## 4. Approve Button UX

### In Feature Detail Panel (planning status)

Place "Approve Spec" as a **prominent fixed button** at the bottom of the detail panel, distinct from the chat input:

```
┌──────────────────────────────────────┐
│  Feature: [title]          [status]  │
├──────────────────────────────────────┤
│  [IN1 chat / spec content]           │
│                                      │
├──────────────────────────────────────┤
│  [chat input]                [send]  │
├──────────────────────────────────────┤
│  ✅ Approve Spec & Advance to Design │  ← green/emerald CTA
└──────────────────────────────────────┘
```

**Button states:**
- Default: `bg-emerald-600 hover:bg-emerald-500` — "Approve Spec"
- Loading: spinner + "Approving..."
- Success: checkmark + "Approved!" (1.5s, then panel updates to show `design_review` status)
- Error: red flash + inline error message, button re-enabled

**Confirmation:** Use a simple inline confirmation — first click changes text to "Confirm Approve?" (2s timeout to revert). This prevents accidental approval without a heavy modal.

---

## 5. UI States

### Loading
- Reuse ChatPanel's skeleton pattern (alternating left/right message placeholders)
- Scaled down to match CreateFeaturePanel's compact sizing (11px text, tighter spacing)

### Streaming
- Typing dots → streaming text with blinking cursor → final message
- Input disabled during stream (`disabled={chatting || isStreaming}`)
- Send button shows `<Loader2 className="animate-spin" />`

### Error
- **Connection error:** Inline banner above input: `"Connection lost. Retrying..."` with auto-retry (3 attempts, exponential backoff)
- **API error:** Message bubble with red-tinted background: `"Sorry, I encountered an error. Please try again."`
- **Create error:** Toast notification, button re-enabled

### Empty
- Initial state with IN1's welcome message (never truly empty)

---

## 6. Accessibility

- **Keyboard:** Enter sends, Shift+Enter newline (matches ChatInput pattern)
- **Focus management:** Auto-focus input on panel open; return focus to input after message send
- **Screen reader:** `role="log"` on chat container, `aria-live="polite"` for streaming content, `aria-busy` during streaming
- **Announce:** New messages announced via `aria-live` region
- **Buttons:** All have visible labels or `aria-label`; "Create Feature from Chat" button has `aria-describedby` linking to a visually hidden description of what will happen

---

## 7. Responsive Behavior

The CreateFeaturePanel is already `w-full max-w-md` with fixed positioning. No changes needed for responsive — it's a slide-over panel that works at all viewport widths.

On mobile (`< 640px`): panel takes full width (already does via `w-full`).

---

## 8. Consistency Checklist

| Aspect | ChatPanel Pattern | CreateFeaturePanel Design |
|--------|------------------|--------------------------|
| SSE parsing | `parseSSEStream` + `ReadableStream` | Same (shared util) |
| Typing indicator | Bounce dots → streaming text | Same |
| Streaming cursor | Via `MessageBubble isStreaming` | Inline blinking cursor |
| Message styling | `MessageBubble` component | Inline (compact variant) — acceptable given panel's tight layout |
| Input pattern | `ChatInput` with attachments | Simplified `<Input>` — **keep as-is**, attachments not needed for planning |
| Error handling | Banner + inline | Same approach |
| Scroll behavior | `scrollIntoView({ behavior: 'smooth' })` | Same (already implemented) |

---

## 9. Implementation Notes

- **Extract `parseSSEStream`** into `@/lib/sse-utils.ts` — it's currently embedded in ChatPanel. Both components need it.
- **Markdown rendering** in streaming bubble: use lightweight `react-markdown` (already a project dependency) for IN1's structured spec output
- **Chat transcript formatting** for `feature_spec`: clean markdown, not raw JSON. Format as structured sections.
- **No new dependencies required**

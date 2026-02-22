# Design Review: File Attachment Processing

**Feature ID:** 40f82dfe-4824-46f0-9358-066f06e49936  
**Reviewer:** IN5 (UI/UX Expert)  
**Date:** 2026-02-22  
**Status:** Design Review Complete

---

## 1. UX Flow: Upload → Processing → Ready

### Current State
- User attaches file via paperclip/image button or drag-and-drop in `ChatInput`
- File uploads to Supabase Storage (`chat-media` bucket) via `/api/chat/upload`
- On send, `ChatInput` calls `onSend(message, attachments)` with uploaded URLs
- `/api/chat/send` resolves attachments inline — PDFs currently show `[Attached PDF: ... not yet supported.]`
- Non-image files render as a download link in `MessageBubble` (`AttachmentPreview` → file type)

### Proposed Flow (with file processing)

```
[1] User selects/drops file
      ↓
[2] File appears in pending area (existing 16×16 thumbnail/icon)
      ↓
[3] User clicks Send
      ↓
[4] Upload to Supabase Storage (existing flow)
      ↓  simultaneously:
[5a] Message appears in chat with file attachment indicator
[5b] For PDFs: synchronous extraction attempted (≤10s timeout)
      ↓
[6a] Success → extracted text injected into agent context
[6b] Timeout → placeholder shown, async processing continues
[6c] Error → error state shown in message bubble
```

### Design Recommendation
The spec's approach of **synchronous extraction with async fallback** is correct for chat UX. Users expect the agent to "see" the file immediately. The 10-second timeout is reasonable.

---

## 2. Upload Progress & Processing Status UI

### Current State
- `ChatInput` shows a `Loader2` spinner on the send button during upload
- Textarea placeholder changes to "Uploading files..."
- No per-file progress, no processing status

### Recommendations

#### 2a. Per-file upload progress (Nice-to-have, Phase 2)
The current all-or-nothing spinner is acceptable for Phase 1 since most files are small. For Phase 2 (larger files up to 50MB), add:
- Progress bar on each pending file thumbnail during upload
- Use `XMLHttpRequest` or `fetch` with `ReadableStream` for progress events

#### 2b. Processing status indicator
Add a processing state to the `Attachment` type:

```ts
export interface Attachment {
  type: 'image' | 'video' | 'file'
  url: string
  name: string
  size?: number
  mimeType?: string
  // New fields:
  processingStatus?: 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review'
  fileRecordId?: string  // links to file_attachments.id
}
```

In `MessageBubble`, the file attachment indicator should show:
- **Processing:** Subtle pulsing dot or spinner next to filename — "Extracting content..."
- **Completed:** Green checkmark or no indicator (clean state)
- **Failed:** Orange warning icon — "Could not extract content"
- **Needs Review:** Yellow icon — "Password required" with action button

**However**, given the synchronous-first approach in the spec, most PDFs will be processed before the message renders. The processing indicator is only needed for the async fallback case (>10s extraction). **Recommend deferring this UI to Phase 2** — for Phase 1, if extraction times out, just show the placeholder text in the agent response.

---

## 3. Extracted Content Display in Chat

### How it appears
The spec injects extracted text as `--- PDF: filename ---\n...\n--- End ---` into the agent's context. This is **not shown to the user** — it's part of the LLM input. The user sees:

1. Their message bubble with the file attachment (download link)
2. The agent's response, which can reference PDF content naturally

### Recommendation: No change needed
This is the correct approach. Do NOT show extracted text to the user — it's context for the agent. The user already sees the file attachment indicator and can download the original.

### Edge case: Async fallback
When extraction times out and falls back to async, the agent sees `[PDF attached: report.pdf — processing (status: processing)]`. The agent should be instructed (via system prompt) to acknowledge this: *"I see you've attached report.pdf. It's still being processed — I'll be able to reference its contents shortly."*

**Spec gap:** No guidance on how the agent handles the async placeholder. Add a note about expected agent behavior.

---

## 4. Error States UX

### 4a. Encrypted PDF
- **Agent context:** `[PDF attached: report.pdf — password required]`
- **User sees:** Normal file attachment in their message + agent response asking for password
- **Future (Phase 2):** Inline "Enter password" UI in the attachment indicator

### 4b. Corrupt file
- **Agent context:** `[PDF attached: report.pdf — extraction failed: corrupt or invalid file]`
- **User sees:** File attachment with subtle error indicator + agent response noting the issue

### 4c. Too large (>50MB)
- **Intercept at upload time** — before message sends
- Show toast/inline error: "File exceeds 50MB limit"
- File removed from pending area
- **Note:** Current `chat/upload` limit is 20MB. The spec raises this to 50MB for `file-attachments` bucket. Need to clarify: does the chat upload route also move to 50MB, or do PDFs route through the new `/api/files/upload` endpoint?

### 4d. Unsupported type
- For Phase 1, unsupported types (DOCX, XLSX, etc.) fall through to the existing `[Attached file: ... binary file]` path
- No error needed — just no extraction. Agent can note it can't read the format.

### Design Recommendation
All error communication should flow through the **agent's response**, not through custom UI components. This keeps the chat interface clean and conversational. The agent is the intermediary.

**Exception:** File size rejection should be immediate client-side feedback (toast or inline).

---

## 5. File Attachment Indicators in Message Bubbles

### Current State
`AttachmentPreview` in `MessageBubble` renders:
- **Images:** Inline preview with lightbox on click
- **Videos:** Inline `<video>` player
- **Files:** Download link with `FileText` icon + filename + `Download` icon

### Recommendations for Phase 1

The current file attachment UI is adequate. Minor enhancements:

1. **File type icon:** Replace generic `FileText` with type-specific icons:
   - PDF → red PDF icon or `FileText` with "PDF" badge
   - TXT/CSV/MD → code/text icon
   - Keep it simple — Lucide icons are sufficient

2. **File size display:** Add human-readable size to the attachment chip:
   ```
   📄 report.pdf (2.3 MB)  ⬇
   ```

3. **Processing badge (Phase 2):** Small status dot on the attachment chip for async processing state.

### No new component needed
The existing `AttachmentPreview` component handles this. Just add size formatting.

---

## 6. Spec Gaps & UX Concerns

### Gap 1: Chat upload routing unclear
The spec creates a new `/api/files/upload` endpoint but also modifies `/api/chat/send`. It's unclear whether the chat flow uses:
- **Option A:** Existing `/api/chat/upload` → then `/api/chat/send` extracts inline (spec §2.5 suggests this)
- **Option B:** New `/api/files/upload` from `ChatInput`, then reference the file record in send

**Recommendation:** Option A is simpler and matches the spec. The extraction happens inside `chat/send` when it encounters a PDF attachment. No changes needed to `ChatInput` or the upload flow. The `/api/files/` endpoints are for standalone/programmatic use.

### Gap 2: File size limit mismatch
- `chat/upload`: 20MB limit
- `file-attachments` spec: 50MB limit
- Need to decide: bump chat upload to 50MB, or keep separate limits?

**Recommendation:** Keep 20MB for chat (real-time UX), allow 50MB only via `/api/files/upload` (background processing).

### Gap 3: Duplicate storage
Under Option A, the file is stored in both `chat-media` (via upload route) and `file-attachments` (via processing). This wastes storage.

**Recommendation:** For chat-originated PDFs, skip the `file-attachments` storage bucket. Just extract text in-memory during `chat/send` and store the `file_attachments` DB record pointing to the existing `chat-media` path. Add a `storage_bucket` field that can be either `chat-media` or `file-attachments`.

### Gap 4: No polling/webhook for async status
When extraction falls back to async, there's no mechanism for the frontend to know when processing completes. The user would need to re-send or ask the agent.

**Recommendation (Phase 2):** Add SSE or polling endpoint for file processing status. For Phase 1, the async fallback is rare enough that agent-mediated communication suffices.

### Gap 5: Agent system prompt update
No mention of updating agent system prompts to handle file-related context gracefully (e.g., "I'm still processing your PDF" or "I extracted X pages from your document").

**Recommendation:** Add a brief instruction to the agent system prompt about file attachment handling.

### Gap 6: Attachment type needs `base64Data` in the interface
The `Attachment` type in `types.ts` doesn't include `base64Data`, but `chat/send` uses it via `AttachmentInput`. These types should be aligned or the send route should continue using its own internal type (current approach is fine).

---

## 7. Summary of Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Extracted text visibility | Hidden from user (agent context only) | Keeps chat clean; agent references content naturally |
| Error communication | Via agent response, not custom UI | Conversational UX; reduces UI complexity |
| Processing indicators | Phase 1: none needed (sync-first) | <10s extraction covers 95%+ of PDFs |
| File size rejection | Client-side toast/inline error | Immediate feedback before upload attempt |
| Upload routing | No change to ChatInput; extraction in send route | Minimal frontend changes; backward compatible |
| Storage dedup | Point file_attachments to chat-media path | Avoid double storage for chat-originated files |
| Async fallback UI | Defer to Phase 2 | Rare case; agent can communicate status |

---

## 8. Phase 1 Frontend Changes Required

1. **`chat/send/route.ts`** — Replace PDF placeholder with inline extraction (per spec §2.5)
2. **`types.ts`** — Optionally add `processingStatus` and `fileRecordId` to `Attachment` (future-proofing)
3. **`MessageBubble.tsx`** — Add file size display to `AttachmentPreview` file type
4. **No changes to `ChatInput.tsx`** — existing upload flow works as-is

**Estimated frontend effort:** ~2-4 hours (mostly in send route backend logic)

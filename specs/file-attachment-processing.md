# Feature Spec: File Attachment Processing System

**Feature ID:** 40f82dfe-4824-46f0-9358-066f06e49936
**Status:** Design Review
**Priority:** High
**Author:** HBx_IN1 (Product Architect)
**Date:** 2026-02-22

---

## 1. Goals

Replace the current placeholder behavior (`[Attached PDF: ... — PDF content extraction not yet supported.]` in `chat/send/route.ts`) with a working file processing pipeline that:

1. Extracts text from PDF files (phase 1), extensible to TXT, CSV, DOCX (phase 2+)
2. Stores files in Supabase Storage with metadata in a `file_attachments` DB table
3. Processes files asynchronously — upload returns immediately
4. Makes extracted content referenceable by agents via filename or record ID
5. Handles errors gracefully (corrupted, encrypted, scanned PDFs → user prompt)

## 2. Architecture

### 2.1 Library: `/src/lib/file-processor/`

```
/src/lib/file-processor/
├── index.ts          # processFile(file, opts) — factory, picks parser by mime
├── types.ts          # FileRecord, ParserResult, ProcessingStatus, ParserOptions
├── storage.ts        # uploadToStorage(), getSignedUrl(), deleteFromStorage()
├── parsers/
│   ├── base.ts       # IParser interface: parse(buffer, opts) → ParserResult
│   ├── pdf.ts        # PDF parser using pdf-parse
│   └── txt.ts        # Plain text passthrough (UTF-8 decode, truncate)
```

**IParser interface:**
```ts
interface ParserResult {
  text: string           // extracted text (max 500KB stored)
  pageCount?: number     // for PDFs
  metadata: Record<string, unknown>  // title, author, etc.
  warnings: string[]     // e.g. "Some pages appear scanned"
}

interface IParser {
  mimeTypes: string[]
  parse(buffer: Buffer, options?: { password?: string }): Promise<ParserResult>
}
```

### 2.2 DB Table: `file_attachments`

```sql
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,           -- mime type
  file_size BIGINT NOT NULL,         -- bytes
  storage_bucket TEXT NOT NULL DEFAULT 'file-attachments',
  storage_path TEXT NOT NULL,
  extracted_text TEXT,               -- full extracted text (max ~500KB)
  metadata JSONB DEFAULT '{}',       -- page_count, author, title, warnings, etc.
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading','processing','completed','failed','needs_review')),
  error_message TEXT,
  uploaded_by TEXT,                   -- user/agent ID
  access_level TEXT NOT NULL DEFAULT 'admin',
  conversation_id TEXT,              -- optional link to chat conversation
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_file_attachments_status ON file_attachments(status);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX idx_file_attachments_filename ON file_attachments(filename);
```

**Supabase Storage bucket:** `file-attachments` (private, 50MB max file size)

### 2.3 API Endpoints

All under `/src/app/api/files/`

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/files/upload` | POST | Multipart upload → store file → insert DB row (status=uploading) → trigger processing → return record |
| `/api/files/[id]/route.ts` | GET | Return file record with extracted_text |
| `/api/files/[id]/route.ts` | DELETE | Delete file from storage + DB |
| `/api/files/[id]/raw/route.ts` | GET | Stream/redirect to original file download |
| `/api/files/process` | POST | Internal endpoint: receives `{ fileId }`, runs parser, updates DB |

### 2.4 Processing Flow

```
User uploads file
  → POST /api/files/upload
    → Validate (size ≤ 50MB, allowed mime type)
    → Upload buffer to Supabase Storage (bucket: file-attachments)
    → Insert file_attachments row (status: 'uploading')
    → Call POST /api/files/process with { fileId } (fire-and-forget via fetch, no await)
    → Return { id, filename, status: 'processing' } immediately

POST /api/files/process (runs async)
  → Fetch file from storage
  → Pick parser by mime type
  → Try parse
    → Success: UPDATE status='completed', extracted_text=..., metadata=...
    → Recoverable error (encrypted PDF): UPDATE status='needs_review', error_message='Password required'
    → Fatal error: UPDATE status='failed', error_message=...
```

### 2.5 Chat Integration

Modify `/api/chat/send/route.ts` to replace the PDF placeholder:

```ts
// Before (current):
} else if (mediaType === 'application/pdf') {
  contentParts.push({ type: 'input_text', text: `[Attached PDF: ... not yet supported.]` })

// After:
} else if (mediaType === 'application/pdf') {
  // Upload to file processor, get extracted text
  const record = await uploadAndProcessFile(buffer, filename, mediaType)
  if (record.extracted_text) {
    contentParts.push({ type: 'input_text', text: `--- PDF: ${filename} ---\n${record.extracted_text}\n--- End ---` })
  } else {
    contentParts.push({ type: 'input_text', text: `[PDF attached: ${filename} — processing (status: ${record.status})]` })
  }
}
```

For chat, we need **synchronous** extraction (user expects content in the same message). So the chat integration should call `processFile()` directly (not the async endpoint) with a timeout of ~10s. If it exceeds timeout, fall back to async with a placeholder.

### 2.6 Agent Reference

Agents can reference files via:
- Direct text inclusion in chat context (automatic for chat uploads)
- GET `/api/files/:id` to retrieve extracted content programmatically
- Search by filename: GET `/api/files?filename=report.pdf` (add later)

## 3. Dependencies

| Package | Purpose | Install |
|---|---|---|
| `pdf-parse` | PDF text extraction | `npm install pdf-parse` |

No other new deps needed. `@supabase/supabase-js` already installed.

## 4. File Scope (Implementation Checklist)

| # | File | Action |
|---|---|---|
| 1 | `src/lib/file-processor/types.ts` | Create — types & interfaces |
| 2 | `src/lib/file-processor/parsers/base.ts` | Create — IParser interface |
| 3 | `src/lib/file-processor/parsers/pdf.ts` | Create — PDF parser with pdf-parse |
| 4 | `src/lib/file-processor/parsers/txt.ts` | Create — Plain text parser |
| 5 | `src/lib/file-processor/storage.ts` | Create — Supabase Storage helpers |
| 6 | `src/lib/file-processor/index.ts` | Create — processFile factory |
| 7 | `src/app/api/files/upload/route.ts` | Create — upload endpoint |
| 8 | `src/app/api/files/process/route.ts` | Create — async processing endpoint |
| 9 | `src/app/api/files/[id]/route.ts` | Create — GET/DELETE file record |
| 10 | `src/app/api/files/[id]/raw/route.ts` | Create — download original file |
| 11 | `src/app/api/chat/send/route.ts` | Modify — integrate PDF extraction |
| 12 | SQL migration | Create `file_attachments` table |
| 13 | Supabase Storage | Create `file-attachments` bucket |
| 14 | `package.json` | Add `pdf-parse` dependency |

## 5. Acceptance Criteria

- [ ] **AC1:** POST `/api/files/upload` accepts a PDF ≤50MB, stores in Supabase Storage, creates DB record, returns `{ id, filename, status }`
- [ ] **AC2:** PDF text extraction works — upload a text-based PDF, `extracted_text` is populated, status becomes `completed`
- [ ] **AC3:** Encrypted PDF sets status to `needs_review` with error_message containing "password" / "encrypted"
- [ ] **AC4:** Corrupted/invalid PDF sets status to `failed` with descriptive error_message
- [ ] **AC5:** Files >50MB are rejected with 413 status
- [ ] **AC6:** GET `/api/files/:id` returns the full record including extracted_text
- [ ] **AC7:** DELETE `/api/files/:id` removes both the storage object and DB record
- [ ] **AC8:** GET `/api/files/:id/raw` returns the original file for download
- [ ] **AC9:** TXT file upload works — extracted_text equals file content (UTF-8)
- [ ] **AC10:** Chat PDF attachment shows extracted text in agent context (not the placeholder message)
- [ ] **AC11:** `file_attachments` table exists with all specified columns and indexes
- [ ] **AC12:** Library is importable from `@/lib/file-processor` — not coupled to any specific route

## 6. Test Scenarios (for IN6 QA)

### 6.1 Unit Tests
| # | Test | Input | Expected |
|---|---|---|---|
| T1 | PDF parser extracts text | Simple 2-page PDF with known text | `extracted_text` contains expected strings, `pageCount === 2` |
| T2 | PDF parser handles encrypted PDF | Password-protected PDF | Throws recognizable error (contains "encrypt" or "password") |
| T3 | PDF parser handles corrupt file | Random binary data with .pdf extension | Throws error, doesn't crash |
| T4 | TXT parser extracts content | UTF-8 text file | `extracted_text` matches file content |
| T5 | TXT parser truncates large files | 1MB text file | `extracted_text` ≤ 500KB, truncation marker present |
| T6 | Factory picks correct parser | PDF mime → pdf parser, text/plain → txt parser | Correct parser selected |
| T7 | Factory rejects unsupported type | application/zip | Returns error/null, doesn't crash |

### 6.2 Integration Tests (API)
| # | Test | Steps | Expected |
|---|---|---|---|
| T8 | Upload PDF end-to-end | POST multipart to `/api/files/upload` with a real PDF | 200 response with `{ id, filename, status }`, DB record created, file in storage |
| T9 | Process + retrieve | Upload PDF → wait for processing → GET `/api/files/:id` | `status === 'completed'`, `extracted_text` populated |
| T10 | Delete file | Upload → DELETE `/api/files/:id` | 200, DB record gone, storage object gone |
| T11 | Download raw | Upload → GET `/api/files/:id/raw` | Returns original file bytes, correct content-type |
| T12 | Reject oversized | POST 51MB file | 413 response |
| T13 | Chat PDF integration | Send chat message with PDF attachment | Agent receives extracted PDF text (not placeholder) |

### 6.3 Test Files Needed
- `test-simple.pdf` — 2-page PDF with known text content
- `test-encrypted.pdf` — password-protected PDF
- `test-corrupt.pdf` — invalid/truncated binary
- `test-scanned.pdf` — scanned image PDF (text extraction should return minimal/no text + warning)
- `test-large.txt` — 1MB+ text file
- `test-simple.txt` — small UTF-8 text file

## 7. Error Handling Matrix

| Condition | Status | Error Message | User Action |
|---|---|---|---|
| Encrypted PDF | `needs_review` | "PDF is password-protected" | Provide password or delete |
| Scanned/image PDF | `completed` (with warning) | metadata.warnings: ["Extracted text is minimal — PDF may contain scanned images"] | Accept or delete |
| Corrupt file | `failed` | "Failed to parse PDF: [error detail]" | Delete and re-upload |
| Storage upload fails | `failed` | "Storage upload failed: [detail]" | Retry |
| File too large | rejected (413) | "File exceeds 50MB limit" | Upload smaller file |
| Unsupported type | rejected (400) | "Unsupported file type: [mime]" | Upload supported type |

## 8. Supported File Types (Phase 1)

| Type | Mime | Parser | Status |
|---|---|---|---|
| PDF | `application/pdf` | `pdf.ts` | Phase 1 ✅ |
| Plain text | `text/plain` | `txt.ts` | Phase 1 ✅ |
| CSV | `text/csv` | `txt.ts` (reuse) | Phase 1 ✅ |
| Markdown | `text/markdown` | `txt.ts` (reuse) | Phase 1 ✅ |

**Phase 2 (future):** DOCX, XLSX, HTML, JSON, XML

## 9. Security & Access

- All endpoints require authentication (follow existing dashboard auth pattern)
- `access_level` defaults to `'admin'` — only admin users can access files
- Files stored in private Supabase Storage bucket (no public URLs)
- Signed URLs generated on-demand for downloads (1-hour expiry)
- File content sanitized before storage (no script injection in extracted_text)

## 10. Existing Patterns to Follow

- **Upload pattern:** Mirror `src/app/api/chat/upload/route.ts` — same Supabase client init, storage path format (`YYYY/MM/DD/uuid-filename`), error handling
- **Service client:** Use `getServiceClient()` pattern with `SUPABASE_SERVICE_ROLE_KEY`
- **Bucket:** Create new `file-attachments` bucket (separate from `chat-media`)
- **No `pdf-parse` currently installed** — must add to dependencies
- **No `file_attachments` table exists** — must create via migration

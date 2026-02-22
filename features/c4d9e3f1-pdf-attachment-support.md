# Feature: PDF Attachment Extraction

| Field | Value |
|-------|-------|
| **Feature ID** | `c4d9e3f1` |
| **Status** | 🔄 In Progress |
| **Assigned To** | TBD |
| **Requested By** | Rob (via HBx) |
| **Priority** | High |
| **Created** | 2026-02-21 |

---

## Goal

Enable PDF file attachments to be parsed and extracted so their content can be read and processed by agents in chat. Currently, file attachments route through successfully (PR #44), but PDF content extraction is not yet supported.

## Requirements

### 1. PDF Parsing
- Extract text content from uploaded PDF files
- Handle multi-page documents
- Preserve basic structure (headings, paragraphs, tables where possible)

### 2. Integration with Chat
- Extracted PDF text should be included in the message context sent to the LLM
- Support PDFs sent via webchat, Telegram, and dashboard chat

### 3. Edge Cases
- Large PDFs: truncate or chunk with clear indication
- Scanned/image-only PDFs: detect and inform user (OCR out of scope for v1)
- Encrypted/password-protected PDFs: graceful error message

## Context

- PR #44 (merged 2026-02-20) fixed routing of non-image file attachments
- Test confirmed: PDF arrives but content shows "PDF content extraction not yet supported"
- This feature closes the gap so attachments are fully functional

## Acceptance Criteria

- [ ] PDF files attached in chat have their text content extracted
- [ ] Extracted text is passed to the LLM as message context
- [ ] Graceful handling of unsupported PDFs (scanned, encrypted)
- [ ] Works across webchat and Telegram channels

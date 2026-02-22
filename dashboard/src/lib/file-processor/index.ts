import type { ParserResult } from './types'
import { PdfParser } from './parsers/pdf'
import { TxtParser } from './parsers/txt'

export type { ParserResult, FileRecord, ProcessingStatus, IParser } from './types'
export { downloadFromStorage, insertFileRecord, updateFileRecord } from './storage'

const parsers = [new PdfParser(), new TxtParser()]

function getParser(mimeType: string) {
  return parsers.find(p => p.mimeTypes.includes(mimeType)) || null
}

export function getSupportedMimeTypes(): string[] {
  return parsers.flatMap(p => p.mimeTypes)
}

export function isSupported(mimeType: string): boolean {
  return getParser(mimeType) !== null
}

/**
 * Extract text from a file buffer. Synchronous (no DB/storage interaction).
 * Use this in chat/send for inline extraction.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  options?: { password?: string }
): Promise<ParserResult> {
  const parser = getParser(mimeType)
  if (!parser) {
    return {
      text: '',
      metadata: {},
      warnings: [`Unsupported file type: ${mimeType}`],
    }
  }
  return parser.parse(buffer, options)
}

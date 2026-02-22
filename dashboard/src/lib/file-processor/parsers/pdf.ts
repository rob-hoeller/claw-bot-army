import type { IParser, ParserResult } from '../types'

const MAX_TEXT_LENGTH = 500 * 1024 // 500KB

export class PdfParser implements IParser {
  mimeTypes = ['application/pdf']

  async parse(buffer: Buffer, _options?: { password?: string }): Promise<ParserResult> {
    // pdf-parse v1 uses CommonJS default export
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (
      buffer: Buffer
    ) => Promise<{ numpages: number; text: string; info: Record<string, string> }>

    const result = await pdfParse(buffer)

    let text = result.text || ''
    const warnings: string[] = []

    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated at 500KB ...]'
      warnings.push('Text was truncated to 500KB')
    }

    // Detect likely scanned/image PDFs
    if (result.numpages > 0 && text.trim().length < result.numpages * 50) {
      warnings.push('Extracted text is minimal — PDF may contain scanned images')
    }

    return {
      text,
      pageCount: result.numpages,
      metadata: {
        title: result.info?.Title || null,
        author: result.info?.Author || null,
        creator: result.info?.Creator || null,
        producer: result.info?.Producer || null,
        pageCount: result.numpages,
      },
      warnings,
    }
  }
}

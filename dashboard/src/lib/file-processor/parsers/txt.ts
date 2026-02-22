import type { IParser, ParserResult } from '../types'

const MAX_TEXT_LENGTH = 500 * 1024 // 500KB

export class TxtParser implements IParser {
  mimeTypes = ['text/plain', 'text/csv', 'text/markdown']

  async parse(buffer: Buffer, _options?: { password?: string }): Promise<ParserResult> {
    let text = buffer.toString('utf-8')
    const warnings: string[] = []

    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated at 500KB ...]'
      warnings.push('Text was truncated to 500KB')
    }

    return {
      text,
      metadata: { charCount: text.length },
      warnings,
    }
  }
}

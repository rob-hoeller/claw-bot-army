/**
 * Shared SSE stream parser — extracted from ChatPanel for reuse.
 * Parses OpenAI-compatible SSE format (data: JSON chunks + data: [DONE]).
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (fullContent: string) => void,
  onDone: (fullContent: string, receivedDone: boolean) => void
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ""
  let fullContent = ""
  let receivedDoneSignal = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            receivedDoneSignal = true
            onDone(fullContent, true)
            return
          }
          try {
            const parsed = JSON.parse(data)
            const content =
              parsed.choices?.[0]?.delta?.content ||
              (parsed.type === 'response.output_text.delta' ? parsed.delta : '') ||
              ''
            if (content) {
              fullContent += content
              onChunk(fullContent)
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
    onDone(fullContent, receivedDoneSignal)
  } catch (err) {
    onDone(fullContent, false)
    throw err
  }
}

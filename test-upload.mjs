// Test file upload flow replicating buildResponsesBody logic from send/route.ts

const GATEWAY_URL = 'https://ip-172-31-70-66.tailf479a9.ts.net'
const TOKEN = '6ZZLEB16Cg6okuW5sutV8qfeBai3ose1'
const MODEL = 'openclaw:HBx'

// --- Test 1: Text file attachment ---
const textContent = `# Project Notes\n\nThis is a test markdown file.\n- Item one\n- Item two\n- The secret word is "pineapple"\n\nEnd of notes.`
const textBase64 = Buffer.from(textContent).toString('base64')

// --- Test 2: Tiny 1x1 red PNG ---
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

async function sendTest(name, input) {
  console.log(`\n${'='.repeat(60)}\nTEST: ${name}\n${'='.repeat(60)}`)
  const body = { model: MODEL, input, stream: false }
  console.log('Request body (input part):', JSON.stringify(input.slice(-1), null, 2))

  const res = await fetch(`${GATEWAY_URL}/v1/responses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  console.log(`Status: ${res.status}`)
  const text = await res.text()
  
  // Try to parse SSE or JSON
  if (text.startsWith('{')) {
    const data = JSON.parse(text)
    const content = data.output?.[0]?.content?.[0]?.text || JSON.stringify(data, null, 2)
    console.log('Response:', content)
  } else {
    // SSE - extract text deltas
    let full = ''
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const evt = JSON.parse(line.slice(6))
          if (evt.type === 'response.output_text.delta') full += evt.delta || ''
          else if (evt.type === 'response.completed') {
            const c = evt.response?.output?.[0]?.content?.[0]?.text
            if (c) full = c
          }
        } catch {}
      }
    }
    console.log('Response:', full || text.slice(0, 500))
  }
}

// Test 1: Text file (the fixed path - input_text with decoded content)
await sendTest('Text file (markdown) via input_text', [
  {
    type: 'message', role: 'user', content: [
      {
        type: 'input_text',
        text: `--- File: notes.md (text/markdown) ---\n${textContent}\n--- End of file ---`,
      },
      { type: 'input_text', text: 'What is the secret word in the attached file?' },
    ]
  }
])

// Test 2: Image attachment via input_image
await sendTest('Image via input_image (1x1 red PNG)', [
  {
    type: 'message', role: 'user', content: [
      {
        type: 'input_image',
        source: { type: 'base64', media_type: 'image/png', data: pngBase64 },
      },
      { type: 'input_text', text: 'Describe this image. What color is it?' },
    ]
  }
])

console.log('\n✅ Tests complete')

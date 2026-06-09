# AI Integration

This module exposes a multi-provider AI service via `AiService` and two HTTP endpoints.

---

## Supported providers

| `AI_PROVIDER` | Provider | SDK | Default model |
|---|---|---|---|
| `nvidia` (default) | NVIDIA NIM | `openai` | `google/gemma-4-31b-it` |
| `openai` | OpenAI | `openai` | `gpt-4o-mini` |
| `deepseek` | DeepSeek | `openai` | `deepseek-chat` |
| `kimi` | Kimi (Moonshot AI) | `openai` | `moonshot-v1-8k` |
| `groq` | Groq | `openai` | `llama-3.3-70b-versatile` |
| `anthropic` | Claude (Anthropic) | `@anthropic-ai/sdk` | `claude-haiku-4-5` |
| `gemini` | Google Gemini | `@google/genai` | `gemini-2.0-flash` |
| `custom` | Any OpenAI-compatible endpoint | `openai` | `llama3` |

To switch providers, change `AI_PROVIDER` in `.env` — no code changes needed.

---

## Get a free API key (NVIDIA NIM)

1. Go to [https://build.nvidia.com](https://build.nvidia.com)
2. Create an account and generate an API key
3. Set `NVIDIA_API_KEY=nvapi-...` in `.env`
4. Browse available models at [https://build.nvidia.com/explore/discover](https://build.nvidia.com/explore/discover)

Recommended free models:
- `google/gemma-4-31b-it`
- `meta/llama-4-scout-17b-16e-instruct`
- `deepseek-ai/deepseek-r1`
- `mistralai/mistral-small-3.2-24b-instruct`

---

## Environment variables

```env
AI_PROVIDER=nvidia        # active provider
AI_MODEL=                 # override the default model (optional)

NVIDIA_API_KEY=nvapi-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
KIMI_API_KEY=...
GROQ_API_KEY=...

# For provider=custom (any OpenAI-compatible endpoint)
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=...
```

---

## HTTP endpoints

### POST /ai/chat

Full response (non-streaming).

```bash
curl -X POST http://localhost:3000/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Explain what NestJS is in one sentence." }
    ],
    "options": {
      "maxTokens": 200,
      "temperature": 0.7
    }
  }'
```

Response:
```json
{
  "content": "NestJS is a progressive Node.js framework...",
  "model": "google/gemma-4-31b-it",
  "provider": "nvidia",
  "usage": {
    "promptTokens": 42,
    "completionTokens": 38,
    "totalTokens": 80
  }
}
```

### POST /ai/chat/stream

Server-Sent Events (SSE) — each chunk arrives in real time.

```bash
curl -X POST http://localhost:3000/ai/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

Event format:
```
data: {"content":"Hello"}
data: {"content":"! How"}
data: {"content":" can I help you?"}
data: [DONE]
```

---

## Using `AiService` in other modules

```typescript
import { AiService } from './ai/ai.service';

@Injectable()
export class MyService {
  constructor(private readonly ai: AiService) {}

  async summarize(text: string): Promise<string> {
    const response = await this.ai.chat([
      { role: 'system', content: 'Summarize the text in up to 3 sentences.' },
      { role: 'user', content: text },
    ]);
    return response.content;
  }

  async *streamChat(question: string): AsyncIterable<string> {
    yield* this.ai.chatStream([{ role: 'user', content: question }]);
  }
}
```

Since `AiModule` is exported and imported via `AppModule`, you can inject `AiService` directly into any module.

---

## Consuming SSE on the frontend (React)

```typescript
async function streamChat(message: string, onChunk: (text: string) => void) {
  const response = await fetch('/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      const data = JSON.parse(line.slice(6)) as { content: string };
      onChunk(data.content);
    }
  }
}
```

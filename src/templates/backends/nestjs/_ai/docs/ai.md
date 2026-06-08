# AI Integration

Este módulo expõe um serviço de IA multi-provider via `AiService` e dois endpoints HTTP.

---

## Providers suportados

| `AI_PROVIDER` | Provedor | SDK | Modelo padrão |
|---|---|---|---|
| `nvidia` (default) | NVIDIA NIM | `openai` | `google/gemma-4-31b-it` |
| `openai` | OpenAI | `openai` | `gpt-4o-mini` |
| `deepseek` | DeepSeek | `openai` | `deepseek-chat` |
| `kimi` | Kimi (Moonshot AI) | `openai` | `moonshot-v1-8k` |
| `groq` | Groq | `openai` | `llama-3.3-70b-versatile` |
| `anthropic` | Claude (Anthropic) | `@anthropic-ai/sdk` | `claude-haiku-4-5` |
| `gemini` | Google Gemini | `@google/genai` | `gemini-2.0-flash` |
| `custom` | Qualquer endpoint OpenAI-compatible | `openai` | `llama3` |

Para trocar de provider, edite `AI_PROVIDER` no `.env` — nenhum código precisa mudar.

---

## Obter API key grátis (NVIDIA NIM)

1. Acesse [https://build.nvidia.com](https://build.nvidia.com)
2. Crie uma conta e gere uma API key
3. Defina `NVIDIA_API_KEY=nvapi-...` no `.env`
4. Explore os modelos disponíveis em [https://build.nvidia.com/explore/discover](https://build.nvidia.com/explore/discover)

Modelos gratuitos recomendados:
- `google/gemma-4-31b-it`
- `meta/llama-4-scout-17b-16e-instruct`
- `deepseek-ai/deepseek-r1`
- `mistralai/mistral-small-3.2-24b-instruct`

---

## Variáveis de ambiente

```env
AI_PROVIDER=nvidia        # provider ativo
AI_MODEL=                 # sobrescreve o modelo padrão (opcional)

NVIDIA_API_KEY=nvapi-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
KIMI_API_KEY=...
GROQ_API_KEY=...

# Para provider=custom (qualquer endpoint OpenAI-compatible)
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=...
```

---

## Endpoints HTTP

### POST /ai/chat

Resposta completa (não-streaming).

```bash
curl -X POST http://localhost:3000/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      { "role": "system", "content": "Você é um assistente útil." },
      { "role": "user", "content": "Explique o que é NestJS em uma frase." }
    ],
    "options": {
      "maxTokens": 200,
      "temperature": 0.7
    }
  }'
```

Resposta:
```json
{
  "content": "NestJS é um framework Node.js progressivo...",
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

Server-Sent Events (SSE) — cada chunk chega em tempo real.

```bash
curl -X POST http://localhost:3000/ai/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Olá!"}]}'
```

Formato de cada evento:
```
data: {"content":"Olá"}
data: {"content":"! Como"}
data: {"content":" posso ajudar?"}
data: [DONE]
```

---

## Usando `AiService` em outros módulos

```typescript
import { AiService } from './ai/ai.service';

@Injectable()
export class MyService {
  constructor(private readonly ai: AiService) {}

  async summarize(text: string): Promise<string> {
    const response = await this.ai.chat([
      { role: 'system', content: 'Resuma o texto em até 3 frases.' },
      { role: 'user', content: text },
    ]);
    return response.content;
  }

  async *streamChat(question: string): AsyncIterable<string> {
    yield* this.ai.chatStream([{ role: 'user', content: question }]);
  }
}
```

Como `AiModule` é exportado e importado via `AppModule`, basta injetar `AiService` diretamente.

---

## Consumindo SSE no frontend (React)

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

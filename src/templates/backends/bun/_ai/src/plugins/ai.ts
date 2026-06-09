import { Elysia, t } from 'elysia';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

const OPENAI_COMPAT_CONFIGS: Record<string, { baseURL: string; keyEnv: string; defaultModel: string }> = {
  nvidia: { baseURL: 'https://integrate.api.nvidia.com/v1', keyEnv: 'NVIDIA_API_KEY', defaultModel: 'google/gemma-4-31b-it' },
  openai: { baseURL: 'https://api.openai.com/v1', keyEnv: 'OPENAI_API_KEY', defaultModel: 'gpt-4o-mini' },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', keyEnv: 'DEEPSEEK_API_KEY', defaultModel: 'deepseek-chat' },
  kimi: { baseURL: 'https://api.moonshot.cn/v1', keyEnv: 'KIMI_API_KEY', defaultModel: 'moonshot-v1-8k' },
  groq: { baseURL: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY', defaultModel: 'llama-3.3-70b-versatile' },
  custom: { baseURL: Bun.env.AI_BASE_URL ?? '', keyEnv: 'AI_API_KEY', defaultModel: 'llama3' },
};

function createProvider(providerName: string) {
  if (providerName === 'anthropic') {
    const client = new Anthropic({ apiKey: Bun.env.ANTHROPIC_API_KEY });
    const defaultModel = Bun.env.AI_MODEL ?? 'claude-haiku-4-5';

    return {
      name: 'anthropic',
      model: defaultModel,
      async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResponse> {
        const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
        const filtered = messages.filter((m) => m.role !== 'system') as Anthropic.MessageParam[];
        const res = await client.messages.create({
          model: opts.model ?? defaultModel,
          max_tokens: opts.maxTokens ?? 1024,
          ...(system ? { system } : {}),
          messages: filtered,
        });
        const text = res.content[0].type === 'text' ? res.content[0].text : '';
        return { content: text, model: res.model, provider: 'anthropic', usage: { promptTokens: res.usage.input_tokens, completionTokens: res.usage.output_tokens, totalTokens: res.usage.input_tokens + res.usage.output_tokens } };
      },
      async *chatStream(messages: ChatMessage[], opts: ChatOptions = {}): AsyncIterable<string> {
        const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
        const filtered = messages.filter((m) => m.role !== 'system') as Anthropic.MessageParam[];
        const stream = client.messages.stream({ model: opts.model ?? defaultModel, max_tokens: opts.maxTokens ?? 1024, ...(system ? { system } : {}), messages: filtered });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text;
        }
      },
    };
  }

  if (providerName === 'gemini') {
    const client = new GoogleGenAI({ apiKey: Bun.env.GEMINI_API_KEY ?? '' });
    const defaultModel = Bun.env.AI_MODEL ?? 'gemini-2.0-flash';

    return {
      name: 'gemini',
      model: defaultModel,
      async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResponse> {
        const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
        const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : m.role, parts: [{ text: m.content }] }));
        const res = await client.models.generateContent({ model: opts.model ?? defaultModel, contents, config: { ...(system ? { systemInstruction: system } : {}), maxOutputTokens: opts.maxTokens } });
        return { content: res.text ?? '', model: opts.model ?? defaultModel, provider: 'gemini' };
      },
      async *chatStream(messages: ChatMessage[], opts: ChatOptions = {}): AsyncIterable<string> {
        const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
        const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : m.role, parts: [{ text: m.content }] }));
        const stream = await client.models.generateContentStream({ model: opts.model ?? defaultModel, contents, config: { ...(system ? { systemInstruction: system } : {}), maxOutputTokens: opts.maxTokens } });
        for await (const chunk of stream) { if (chunk.text) yield chunk.text; }
      },
    };
  }

  const cfg = OPENAI_COMPAT_CONFIGS[providerName] ?? OPENAI_COMPAT_CONFIGS.nvidia;
  const client = new OpenAI({ baseURL: cfg.baseURL, apiKey: Bun.env[cfg.keyEnv] ?? '' });
  const defaultModel = Bun.env.AI_MODEL ?? cfg.defaultModel;

  return {
    name: providerName,
    model: defaultModel,
    async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResponse> {
      const res = await client.chat.completions.create({ model: opts.model ?? defaultModel, messages, max_tokens: opts.maxTokens, temperature: opts.temperature });
      const choice = res.choices[0];
      return { content: choice.message.content ?? '', model: res.model, provider: providerName, usage: res.usage ? { promptTokens: res.usage.prompt_tokens, completionTokens: res.usage.completion_tokens, totalTokens: res.usage.total_tokens } : undefined };
    },
    async *chatStream(messages: ChatMessage[], opts: ChatOptions = {}): AsyncIterable<string> {
      const stream = await client.chat.completions.create({ model: opts.model ?? defaultModel, messages, max_tokens: opts.maxTokens, temperature: opts.temperature, stream: true });
      for await (const chunk of stream) { const delta = chunk.choices[0]?.delta?.content; if (delta) yield delta; }
    },
  };
}

const provider = createProvider(Bun.env.AI_PROVIDER ?? 'nvidia');

const MessageSchema = t.Object({ role: t.Union([t.Literal('system'), t.Literal('user'), t.Literal('assistant')]), content: t.String() });
const RequestSchema = t.Object({ messages: t.Array(MessageSchema), options: t.Optional(t.Object({ model: t.Optional(t.String()), maxTokens: t.Optional(t.Number()), temperature: t.Optional(t.Number()) })) });

export const aiPlugin = new Elysia({ name: 'ai', prefix: '/ai' })
  .post('/chat', async ({ body }) => provider.chat(body.messages, body.options), { body: RequestSchema })
  .post('/chat/stream', async ({ body, set }) => {
    set.headers['content-type'] = 'text/event-stream';
    set.headers['cache-control'] = 'no-cache';
    set.headers['connection'] = 'keep-alive';

    const stream = provider.chatStream(body.messages, body.options);
    return new Response(
      new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      }),
      { headers: { 'content-type': 'text/event-stream' } },
    );
  }, { body: RequestSchema });

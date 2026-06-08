import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import type { ChatMessage, ChatOptions, ChatResponse } from '../ai.interfaces';
import { BaseAiProvider } from './base-ai.provider';

interface ProviderConfig {
  baseURL: string;
  keyEnv: string;
  defaultModel: string;
  label: string;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  nvidia: {
    baseURL: 'https://integrate.api.nvidia.com/v1',
    keyEnv: 'NVIDIA_API_KEY',
    defaultModel: 'google/gemma-4-31b-it',
    label: 'nvidia',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    label: 'openai',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    label: 'deepseek',
  },
  kimi: {
    baseURL: 'https://api.moonshot.cn/v1',
    keyEnv: 'KIMI_API_KEY',
    defaultModel: 'moonshot-v1-8k',
    label: 'kimi',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    label: 'groq',
  },
};

export class OpenAiCompatProvider extends BaseAiProvider {
  private readonly client: OpenAI;
  private readonly config: ProviderConfig;

  constructor(private readonly configService: ConfigService) {
    super();
    const providerName = configService.get<string>('AI_PROVIDER') ?? 'nvidia';
    const cfg = PROVIDER_CONFIGS[providerName] ?? this.resolveCustom();
    this.config = cfg;
    this.client = new OpenAI({
      apiKey: configService.get<string>(cfg.keyEnv) ?? '',
      baseURL: cfg.baseURL,
    });
  }

  private resolveCustom(): ProviderConfig {
    return {
      baseURL: this.configService.get<string>('AI_BASE_URL') ?? 'http://localhost:11434/v1',
      keyEnv: 'AI_API_KEY',
      defaultModel: 'llama3',
      label: 'custom',
    };
  }

  get providerName(): string {
    return this.config.label;
  }

  get defaultModel(): string {
    return this.configService.get<string>('AI_MODEL') ?? this.config.defaultModel;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP,
    });

    const choice = completion.choices[0];
    return {
      content: choice.message.content ?? '',
      model: completion.model,
      provider: this.providerName,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

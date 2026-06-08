import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import type { ChatMessage, ChatOptions, ChatResponse } from '../ai.interfaces';
import { BaseAiProvider } from './base-ai.provider';

export class AnthropicProvider extends BaseAiProvider {
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Anthropic({
      apiKey: configService.get<string>('ANTHROPIC_API_KEY') ?? '',
    });
  }

  readonly providerName = 'anthropic';
  readonly defaultModel = 'claude-haiku-4-5';

  private get activeModel(): string {
    return this.configService.get<string>('AI_MODEL') ?? this.defaultModel;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: options?.model ?? this.activeModel,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemMsg?.content,
      messages: userMessages,
      temperature: options?.temperature,
      top_p: options?.topP,
    });

    const block = response.content[0];
    return {
      content: block.type === 'text' ? block.text : '',
      model: response.model,
      provider: this.providerName,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = this.client.messages.stream({
      model: options?.model ?? this.activeModel,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemMsg?.content,
      messages: userMessages,
      temperature: options?.temperature,
      top_p: options?.topP,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }
}

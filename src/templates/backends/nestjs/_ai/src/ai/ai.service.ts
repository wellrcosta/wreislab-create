import { Injectable, Inject } from '@nestjs/common';
import type { ChatMessage, ChatOptions, ChatResponse } from './ai.interfaces';
import type { BaseAiProvider } from './providers/base-ai.provider';

@Injectable()
export class AiService {
  constructor(@Inject('AI_PROVIDER') private readonly provider: BaseAiProvider) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    return this.provider.chat(messages, options);
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    yield* this.provider.chatStream(messages, options);
  }

  get providerName(): string {
    return this.provider.providerName;
  }

  get modelName(): string {
    return this.provider.defaultModel;
  }
}

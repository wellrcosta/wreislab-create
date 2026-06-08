import type { ChatMessage, ChatOptions, ChatResponse } from '../ai.interfaces';

export abstract class BaseAiProvider {
  abstract readonly providerName: string;
  abstract readonly defaultModel: string;

  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  abstract chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}

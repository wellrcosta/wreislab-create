import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import type { ChatMessage, ChatOptions, ChatResponse } from '../ai.interfaces';
import { BaseAiProvider } from './base-ai.provider';

export class GeminiProvider extends BaseAiProvider {
  private readonly client: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new GoogleGenAI({
      apiKey: configService.get<string>('GEMINI_API_KEY') ?? '',
    });
  }

  readonly providerName = 'gemini';
  readonly defaultModel = 'gemini-2.0-flash';

  private get activeModel(): string {
    return this.configService.get<string>('AI_MODEL') ?? this.defaultModel;
  }

  private toGeminiContents(messages: ChatMessage[]) {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const contents = this.toGeminiContents(messages);

    const result = await this.client.models.generateContent({
      model: options?.model ?? this.activeModel,
      contents,
      config: {
        systemInstruction: systemMsg?.content,
        maxOutputTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
      },
    });

    return {
      content: result.text ?? '',
      model: options?.model ?? this.activeModel,
      provider: this.providerName,
      usage: result.usageMetadata
        ? {
            promptTokens: result.usageMetadata.promptTokenCount ?? 0,
            completionTokens: result.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: result.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const contents = this.toGeminiContents(messages);

    const stream = await this.client.models.generateContentStream({
      model: options?.model ?? this.activeModel,
      contents,
      config: {
        systemInstruction: systemMsg?.content,
        maxOutputTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}

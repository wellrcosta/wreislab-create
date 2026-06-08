import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { BaseAiProvider } from './providers/base-ai.provider';
import { OpenAiCompatProvider } from './providers/openai-compat.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  controllers: [AiController],
  providers: [
    {
      provide: 'AI_PROVIDER',
      useFactory: (config: ConfigService): BaseAiProvider => {
        const provider = config.get<string>('AI_PROVIDER') ?? 'nvidia';
        switch (provider) {
          case 'anthropic':
            return new AnthropicProvider(config);
          case 'gemini':
            return new GeminiProvider(config);
          default:
            return new OpenAiCompatProvider(config);
        }
      },
      inject: [ConfigService],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}

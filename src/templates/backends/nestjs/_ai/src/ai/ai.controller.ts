import { Body, Controller, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AiService } from './ai.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiService.chat(dto.messages, dto.options);
  }

  @Post('chat/stream')
  async chatStream(@Body() dto: ChatRequestDto, @Res() res: FastifyReply): Promise<void> {
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');
    res.raw.flushHeaders?.();

    try {
      for await (const chunk of this.aiService.chatStream(dto.messages, dto.options)) {
        res.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    } finally {
      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    }
  }
}

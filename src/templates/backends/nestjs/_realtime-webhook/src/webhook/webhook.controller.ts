import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as crypto from 'node:crypto';
import { FastifyRequest } from 'fastify';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post()
  @ApiOperation({ summary: 'Receive external webhook events' })
  @ApiResponse({ status: 200, description: 'Event received' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async receive(
    @Body() body: unknown,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<FastifyRequest>,
  ): Promise<{ received: boolean }> {
    const secret = process.env.WEBHOOK_SECRET;

    if (secret && signature) {
      const raw = (req.rawBody as Buffer | undefined)?.toString('utf8') ?? JSON.stringify(body);
      const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
      if (signature !== expected) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    this.logger.log({ body }, 'Webhook event received');

    // Process event here — replace with your business logic
    return { received: true };
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';

class PublishDto {
  @ApiProperty({ example: 'user.created' })
  pattern!: string;

  @ApiProperty()
  data!: unknown;
}

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('publish')
  @ApiOperation({ summary: 'Publish a message to RabbitMQ' })
  @ApiResponse({ status: 201, description: 'Message published' })
  publish(@Body() dto: PublishDto): { published: boolean } {
    this.queueService.publish(dto.pattern, dto.data);
    return { published: true };
  }
}

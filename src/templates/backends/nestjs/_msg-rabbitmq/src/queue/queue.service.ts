import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_CLIENT } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  publish(pattern: string, data: unknown): void {
    this.client.emit(pattern, data);
  }
}

import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { WsManagerService } from './ws-manager.service';

@Module({
  providers: [EventsGateway, WsManagerService],
  exports: [EventsGateway, WsManagerService],
})
export class EventsModule {}

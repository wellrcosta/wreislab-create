import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';
import type { WebSocket } from 'ws';
import { WsManagerService } from './ws-manager.service';

interface WsClient extends WebSocket {
  id: string;
}

export interface ChatMessage {
  from: string;
  text: string;
  type: 'user' | 'bot';
}

@WebSocketGateway({ path: '/ws' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly wsManager: WsManagerService) {}

  handleConnection(client: WsClient): void {
    client.id = Math.random().toString(36).slice(2, 10);
  }

  handleDisconnect(_client: WsClient): void {
    // to leave a room: this.wsManager.leave(room, client)
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: WsClient,
  ): void {
    const userMsg: ChatMessage = { from: client.id, text: data.text, type: 'user' };
    const botMsg: ChatMessage = { from: 'server', text: `Received: ${data.text}`, type: 'bot' };
    this.server.clients.forEach((c) => {
      if (c.readyState === 1) {
        c.send(JSON.stringify(userMsg));
        c.send(JSON.stringify(botMsg));
      }
    });
  }

  broadcast(data: unknown): void {
    this.wsManager.broadcastAll(data);
  }

  broadcastToRoom(room: string, data: unknown): void {
    this.wsManager.broadcast(room, data);
  }
}

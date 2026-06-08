import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface ChatMessage {
  from: string;
  text: string;
  type: 'user' | 'bot';
}

@WebSocketGateway({
  cors: { origin: process.env.WS_CORS_ORIGIN ?? 'http://localhost:5173' },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: Socket,
  ): void {
    this.server.emit('message', { from: client.id, text: data.text, type: 'user' } satisfies ChatMessage);
    this.server.emit('message', { from: 'server', text: `Received: ${data.text}`, type: 'bot' } satisfies ChatMessage);
  }

  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data);
  }
}

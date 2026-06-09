import { Elysia } from 'elysia';
import type { ServerWebSocket } from 'bun';

interface WsData {
  id: string;
}

export class WsManager {
  private readonly rooms = new Map<string, Set<ServerWebSocket<WsData>>>();

  join(room: string, ws: ServerWebSocket<WsData>): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(ws);
  }

  leave(room: string, ws: ServerWebSocket<WsData>): void {
    this.rooms.get(room)?.delete(ws);
    if (this.rooms.get(room)?.size === 0) this.rooms.delete(room);
  }

  broadcast(room: string, data: unknown): void {
    const msg = JSON.stringify(data);
    this.rooms.get(room)?.forEach((ws) => ws.send(msg));
  }

  broadcastAll(data: unknown): void {
    const msg = JSON.stringify(data);
    this.rooms.forEach((room) => room.forEach((ws) => ws.send(msg)));
  }
}

export const wsManager = new WsManager();

export const wsPlugin = new Elysia({ name: 'ws' })
  .decorate('wsManager', wsManager)
  .ws('/ws', {
    open(ws) {
      ws.data.id = Math.random().toString(36).slice(2, 10);
    },
    close(ws) {
      // call wsManager.leave(room, ws) for each joined room
    },
    message(ws, message) {
      const data = typeof message === 'string' ? JSON.parse(message) : message;

      // Echo pattern — replace with your business logic
      // Use ws.data.id to identify the sender
      // Use wsManager.broadcast(room, data) for room messaging
      ws.send(JSON.stringify({ from: 'server', text: `Received: ${data.text ?? ''}`, type: 'bot' }));
    },
  });

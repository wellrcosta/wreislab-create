import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';

@Injectable()
export class WsManagerService {
  private readonly rooms = new Map<string, Set<WebSocket>>();

  join(room: string, ws: WebSocket): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(ws);
  }

  leave(room: string, ws: WebSocket): void {
    this.rooms.get(room)?.delete(ws);
    if (this.rooms.get(room)?.size === 0) this.rooms.delete(room);
  }

  broadcast(room: string, data: unknown): void {
    const msg = JSON.stringify(data);
    this.rooms.get(room)?.forEach((c) => {
      if (c.readyState === 1) c.send(msg);
    });
  }

  broadcastAll(data: unknown): void {
    const msg = JSON.stringify(data);
    this.rooms.forEach((room) =>
      room.forEach((c) => {
        if (c.readyState === 1) c.send(msg);
      }),
    );
  }
}

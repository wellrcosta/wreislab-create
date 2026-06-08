import { io, Socket } from 'socket.io-client';
import { env } from './env';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.VITE_API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

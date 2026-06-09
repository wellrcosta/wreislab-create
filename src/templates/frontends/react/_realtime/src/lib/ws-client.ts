import { env } from './env';

export interface WsClient {
  send: (data: unknown) => void;
  close: () => void;
}

export function createWsClient(opts: {
  onMessage?: (data: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
} = {}): WsClient {
  const url = env.VITE_API_BASE_URL.replace(/^http/, 'ws') + '/ws';
  let ws: WebSocket;
  let delay = 1000;
  let stopped = false;

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => {
      delay = 1000;
      opts.onConnect?.();
    };
    ws.onclose = () => {
      opts.onDisconnect?.();
      if (!stopped) {
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      }
    };
    ws.onmessage = (e) => {
      try {
        opts.onMessage?.(JSON.parse(e.data as string));
      } catch {
        opts.onMessage?.(e.data);
      }
    };
  }

  connect();

  return {
    send: (data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    },
    close: () => {
      stopped = true;
      ws.close();
    },
  };
}

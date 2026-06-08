import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface Message {
  id: number;
  event: string;
  data: unknown;
  timestamp: string;
}

export function LiveFeed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage = (data: unknown) => {
      setMessages((prev) => [
        {
          id: ++counterRef.current,
          event: 'message',
          data,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 49),
      ]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', onMessage);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message', onMessage);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-muted-foreground">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="rounded-md border divide-y max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Waiting for events...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="p-3 text-xs font-mono">
              <span className="text-muted-foreground">{msg.timestamp}</span>
              <pre className="mt-1">{JSON.stringify(msg.data, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

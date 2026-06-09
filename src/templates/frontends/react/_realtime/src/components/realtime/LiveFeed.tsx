import { useEffect, useRef, useState } from 'react';
import { createWsClient } from '@/lib/ws-client';

interface Message {
  id: number;
  data: unknown;
  timestamp: string;
}

export function LiveFeed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    const client = createWsClient({
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onMessage: (data) => {
        setMessages((prev) => [
          {
            id: ++counterRef.current,
            data,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);
      },
    });
    return () => client.close();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-muted-foreground">
          {connected ? 'Connected' : 'Reconnecting...'}
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

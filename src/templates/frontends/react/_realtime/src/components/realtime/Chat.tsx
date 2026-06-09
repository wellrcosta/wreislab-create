import { useEffect, useRef, useState } from 'react';
import { createWsClient, type WsClient } from '@/lib/ws-client';

interface ChatMessage {
  id: number;
  from: string;
  text: string;
  type: 'user' | 'bot';
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const clientRef = useRef<WsClient | null>(null);

  useEffect(() => {
    const client = createWsClient({
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onMessage: (data) => {
        const msg = data as Omit<ChatMessage, 'id'>;
        setMessages((prev) => [...prev, { ...msg, id: ++counterRef.current }]);
      },
    });
    clientRef.current = client;
    return () => client.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || !connected) return;
    clientRef.current?.send({ text });
    setInput('');
  };

  return (
    <div className="flex flex-col h-[560px] rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">Real-time Chat</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {connected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Send a message to start
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  msg.type === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.type === 'bot' && (
                  <p className="text-xs font-medium opacity-60 mb-1">server</p>
                )}
                <p>{msg.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t">
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
          placeholder={connected ? 'Type a message...' : 'Reconnecting...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={!connected}
        />
        <button
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          onClick={send}
          disabled={!connected || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

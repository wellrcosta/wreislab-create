import { Chat } from '@/components/realtime/Chat';

export function RealtimePage() {
  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Real-time</h1>
        <p className="text-sm text-muted-foreground mt-1">
          WebSocket chat — the server echoes every message back.
          Replace the gateway handler to integrate your own logic.
        </p>
      </div>
      <Chat />
    </div>
  );
}

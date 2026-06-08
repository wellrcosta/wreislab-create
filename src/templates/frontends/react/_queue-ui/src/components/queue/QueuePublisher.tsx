import { useState } from 'react';
import { api } from '@/lib/api';

export function QueuePublisher() {
  const [pattern, setPattern] = useState('user.action');
  const [payload, setPayload] = useState('{"key": "value"}');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const publish = async () => {
    setStatus('sending');
    try {
      let data: unknown;
      try {
        data = JSON.parse(payload);
      } catch {
        data = payload;
      }
      await api.post('queue/publish', { json: { pattern, data } }).json();
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <h2 className="text-sm font-medium">Publish to Queue</h2>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">Pattern</label>
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm font-mono"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Payload (JSON)</label>
          <textarea
            className="mt-1 w-full rounded border px-2 py-1 text-sm font-mono"
            rows={3}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={publish}
        disabled={status === 'sending'}
        className="rounded-md bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Sent!' : status === 'error' ? 'Error' : 'Publish'}
      </button>
    </div>
  );
}

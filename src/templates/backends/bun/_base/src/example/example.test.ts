import { describe, expect, it } from 'bun:test';
import { createApp } from '../app';

const app = createApp();

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.handle(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

describe('GET /items', () => {
  it('returns an array', async () => {
    const res = await app.handle(new Request('http://localhost/items'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

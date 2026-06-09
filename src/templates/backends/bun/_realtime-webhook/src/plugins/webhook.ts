import { Elysia } from 'elysia';

export const webhookPlugin = new Elysia({ name: 'webhook' }).post(
  '/webhook',
  async ({ body, request, error }) => {
    const secret = Bun.env.WEBHOOK_SECRET;
    const signature = request.headers.get('x-webhook-signature');

    if (secret && signature) {
      const raw = JSON.stringify(body);
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
      const expected = `sha256=${Buffer.from(mac).toString('hex')}`;
      if (signature !== expected) return error(401, { message: 'Invalid webhook signature' });
    }

    console.log('Webhook event received:', body);
    // Replace with your business logic

    return { received: true };
  },
);

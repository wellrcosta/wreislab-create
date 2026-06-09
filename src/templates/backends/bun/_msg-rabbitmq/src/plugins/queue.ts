import { Elysia } from 'elysia';
import amqplib from 'amqplib';

const RABBITMQ_URL = Bun.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'tasks';

const connection = await amqplib.connect(RABBITMQ_URL);
const channel = await connection.createChannel();
await channel.assertQueue(QUEUE_NAME, { durable: true });

async function publish(data: unknown): Promise<void> {
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), { persistent: true });
}

async function consume(handler: (data: unknown) => Promise<void>): Promise<void> {
  await channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;
    try {
      await handler(JSON.parse(msg.content.toString()));
      channel.ack(msg);
    } catch {
      channel.nack(msg, false, false);
    }
  });
}

// Start consumer — replace with your business logic
await consume(async (data) => {
  console.log('Received task:', data);
});

export const queuePlugin = new Elysia({ name: 'queue' })
  .decorate('queue', { publish, consume })
  .post('/queue/publish', async ({ body, queue }) => {
    await queue.publish(body);
    return { queued: true };
  });

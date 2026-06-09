import { Elysia, t } from 'elysia';

interface Item {
  id: number;
  name: string;
  createdAt: string;
}

const items: Item[] = [];
let nextId = 1;

export const examplePlugin = new Elysia({ name: 'example', prefix: '/items' })
  .get('/', () => items)
  .post(
    '/',
    ({ body }) => {
      const item: Item = { id: nextId++, name: body.name, createdAt: new Date().toISOString() };
      items.push(item);
      return item;
    },
    { body: t.Object({ name: t.String({ minLength: 1 }) }) },
  )
  .get(
    '/:id',
    ({ params, error }) => {
      const item = items.find((i) => i.id === Number(params.id));
      return item ?? error(404, { message: 'Item not found' });
    },
    { params: t.Object({ id: t.String() }) },
  )
  .delete(
    '/:id',
    ({ params, error }) => {
      const idx = items.findIndex((i) => i.id === Number(params.id));
      if (idx === -1) return error(404, { message: 'Item not found' });
      items.splice(idx, 1);
      return { deleted: true };
    },
    { params: t.Object({ id: t.String() }) },
  );

import { createHandler } from './handler.ts';
import { createRepository } from './repository.ts';

const repository = createRepository(Deno.env.toObject());
Deno.serve(createHandler({ repository, defer: (task) => EdgeRuntime.waitUntil(task) }));

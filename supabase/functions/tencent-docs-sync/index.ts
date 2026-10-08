import { createHandler } from "./handler.js";
Deno.serve(createHandler(Deno.env.toObject()));

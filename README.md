# strong-api

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

С помощью этой штуки можно писать ебейшие ендпоинты с типизацией и валидацией запросов на основе zod схем
если будет не впаду я добавлю openapi и будет сваггер

```ts

const my_env = compose_envs([db_env("SERIALIZED"), logger_env]);

type User = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
};

export const create_user_endpoint = mk_zod_endpoint({
  middlewares: [],
  env: my_env,
  path: "/users/:create",
  input: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    created_at: z.date(),
    headers: z.record(z.string(), z.string()),
  }),
  handler: async ({ input, env, request }) => {
    const [db, logger] = env;

    const get_existing = async () => {
      const users = await db.find_by<User>({ email: input.email });
      return users[0] ? users[0] : null;
    };

    const create_new = async () => {
      const user: User = {
        id: randomUUIDv7(),
        name: input.name,
        email: input.email,
        created_at: new Date(),
      };

      await db.save(user);
      logger.info("user created, id:", user.id);
      return user;
    };

    const user = (await await get_existing()) ?? (await create_new());

    const headers = Object.fromEntries(request.headers.entries());
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      headers: headers,
    };
  },
});
```
Есть еще возможность писать енпоинты на уровне Middleware как в Giraffe

```ts
export const say_hello = compose([
  method("GET"),
  route("/hello"),
  set_header("content-type", "text/plain"),
  set_body_text("hello"),
]);
```

это приложение обрабатывает hello create-user и 404

```ts
import im from "immutable";
import { choose, compose, early_return, type Context } from "./src/core";
import { set_status_code, set_body_json } from "./src/response";
import { create_user_endpoint } from "./endpoints/create-user";
import { say_hello } from "./endpoints/say-hello";
import { handle_request } from "./bun-helper";

const not_found = compose([
  set_status_code(404),
  set_body_json({ message: "not found" }),
]);

const app = choose([say_hello, create_user_endpoint, not_found]);

Bun.serve({
  port: 3000,
  fetch: handle_request(app),
});
```


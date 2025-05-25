import { randomUUIDv7 } from "bun";
import z from "zod";
import { db_env, logger_env } from "../envs";
import { compose_envs, mk_zod_endpoint } from "../src/zod-enpoints";

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

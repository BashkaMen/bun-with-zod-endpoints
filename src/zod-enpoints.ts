import z, { ZodError } from "zod";
import type {
  Middleware,
  Context,
  NextMiddleware,
  Request,
  Response,
} from "./core";
import { compose, early_return } from "./core";
import { set_body_json, set_status_code } from "./response";
import { route, method } from "./request";

export type DisponseContext = {
  result: any | null;
  error: any | null;
};

export type DisposableEnv<TEnv> = {
  value: TEnv;
  dispose: (_: DisponseContext) => Promise<void>;
};

export type EnvBuilder<TEnv> = (_: {
  request: Request;
}) => Promise<DisposableEnv<TEnv>>;

export const compose_envs = <TEnvs extends Record<string, any>>(builders: {
  [K in keyof TEnvs]: EnvBuilder<TEnvs[K]>;
}): EnvBuilder<TEnvs> => {
  return async (args) => {
    const disposableEnvs = await Promise.all(
      Object.values(builders).map((builder) => builder(args))
    );

    const composedValue = disposableEnvs.reduce(
      (acc, env) => [...acc, env.value],
      []
    );

    const dispose = async ({ result, error }: DisponseContext) => {
      await Promise.all(
        disposableEnvs.map((env) => env.dispose({ result, error }))
      );
    };

    return {
      value: composedValue,
      dispose: dispose,
    };
  };
};

const mk_default_env = async <TEnv>(
  args: any
): Promise<DisposableEnv<TEnv>> => ({
  value: {} as TEnv,
  dispose: (_: DisponseContext) => Promise.resolve(),
});

const handle_zod_error = (arg: {
  status_code: number;
  message: string;
  error: ZodError;
  ctx: Context;
}): Promise<Context | null> =>
  compose([
    set_status_code(arg.status_code),
    set_body_json({
      message: arg.message,
      details: arg.error.flatten().fieldErrors,
    }),
  ])({ context: arg.ctx, next: early_return });

export const mk_zod_endpoint = <
  TReq extends z.ZodSchema,
  TRes extends z.ZodSchema,
  TEnv
>(args: {
  path: string;
  input: TReq;
  output: TRes;
  middlewares?: Middleware[];
  env?: EnvBuilder<TEnv>;
  handler: (_: {
    request: Request;
    env: TEnv;
    scope: any;
    input: z.infer<TReq>;
  }) => Promise<z.infer<TRes>>;
}): Middleware =>
  compose([
    ...(args.middlewares ?? []),
    route(args.path),
    method("POST"),
    async ({ context, next }) => {
      args.env ??= ({ request }) => mk_default_env(request);

      const body = await context.request.body();
      const decoded_body = new TextDecoder().decode(body);
      const input = args.input.safeParse(JSON.parse(decoded_body));
      if (!input.success) {
        return await handle_zod_error({
          ctx: context,
          status_code: 400,
          message: "invalid request data",
          error: input.error,
        });
      }

      const env = await args.env({ request: context.request });

      try {
        const res = await args.handler({
          request: context.request,
          scope: context.scope,
          input: input.data,
          env: env.value,
        });

        const response = args.output.safeParse(res);
        if (!response.success) {
          return await handle_zod_error({
            ctx: context,
            status_code: 500,
            message: "internal server error",
            error: response.error,
          });
        }
        const result = await set_body_json(response.data)({ context, next });

        await env.dispose({ result: response, error: null });
        return result;
      } catch (error) {
        await env.dispose({ result: null, error: error });
        throw error;
      }
    },
  ]);

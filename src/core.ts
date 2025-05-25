import im from "immutable";

export type Request = {
  path: string;
  method: string;
  headers: im.Map<string, string>;
  body: () => Promise<Uint8Array>;
};

export type Response = {
  body: () => Promise<Uint8Array>;
  code: number;
  headers: im.Map<string, string>;
};

export type Context = {
  scope: any;
  request: Request;
  response: Response;
};

export type NextMiddleware = (context: Context) => Promise<Context | null>;

export type Middleware = (_: {
  context: Context;
  next: NextMiddleware;
}) => Promise<Context | null>;

export const early_return: NextMiddleware = (ctx) => Promise.resolve(ctx);
export const skip: NextMiddleware = (ctx) => Promise.resolve(null);

export const compose =
  (middlewares: Middleware[]): Middleware =>
  ({ context, next }) => {
    const next_middleware = middlewares.reduceRight((next, middleware) => {
      return (ctx) => middleware({ context: ctx, next });
    }, next);

    return next_middleware(context);
  };

export const choose =
  (middlewares: Middleware[]): Middleware =>
  async ({ context, next }) => {
    for (const middleware of middlewares) {
      const res = await middleware({ context, next });
      if (res) return res;
    }
    return null;
  };

import type { Middleware } from "./core";

export const route =
  (path: string): Middleware =>
  async ({ context, next }) => {
    if (context.request.path !== path) return null;

    return await next(context);
  };

export const method =
  (method: string): Middleware =>
  async ({ context, next }) => {
    if (context.request.method !== method) return null;
    return await next(context);
  };

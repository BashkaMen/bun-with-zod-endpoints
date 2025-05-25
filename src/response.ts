import type {
  Middleware,
  Context,
  NextMiddleware,
  Request,
  Response,
} from "./core";

import { compose } from "./core";

export const map_response =
  (f: (r: Response) => Response): Middleware =>
  ({ context, next }) => {
    return next({ ...context, response: f(context.response) });
  };

export const set_body =
  (body: () => Promise<Uint8Array>): Middleware =>
  async ({ context, next }) => {
    return next({ ...context, response: { ...context.response, body } });
  };

export const set_body_text = (body: string): Middleware => {
  const fn = () => Promise.resolve(new TextEncoder().encode(body));
  return set_body(fn);
};

export const set_body_json = (body: any): Middleware =>
  compose([
    set_header("content-type", "application/json"),
    set_body_text(JSON.stringify(body)),
  ]);

export const set_header =
  (key: string, value: string): Middleware =>
  ({ context, next }) => {
    return next({
      ...context,
      response: {
        ...context.response,
        headers: context.response.headers.set(key, value),
      },
    });
  };

export const set_status_code = (code: number): Middleware =>
  map_response((response) => ({ ...response, code }));

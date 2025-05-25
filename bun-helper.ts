import im from "immutable";
import { early_return, type Context, type Middleware } from "./src/core";

export const handle_request = (app: Middleware) => async (req: Request) => {
  const context: Context = {
    scope: {},
    request: {
      body: async () => new Uint8Array(await req.arrayBuffer()),
      headers: im.Map<string, string>(req.headers.entries()),
      method: req.method,
      path: new URL(req.url).pathname,
    },
    response: {
      body: async () => new Uint8Array(0),
      code: 200,
      headers: im.Map<string, string>(),
    },
  };

  const res = await app({
    context,
    next: early_return,
  });

  if (!res) return Response.json({ message: "server error" }, { status: 500 });

  const body = await res.response.body();
  return new Response(body, {
    status: res.response.code,
    headers: Object.fromEntries(res.response.headers),
  });
};

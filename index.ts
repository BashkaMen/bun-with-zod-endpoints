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

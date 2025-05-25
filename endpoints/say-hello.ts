import { compose } from "../src/core";
import { method, route } from "../src/request";
import { set_header, set_body_text } from "../src/response";

export const say_hello = compose([
  method("GET"),
  route("/hello"),
  set_header("content-type", "text/plain"),
  set_body_text("hello"),
]);

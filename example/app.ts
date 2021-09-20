import "https://deno.land/x/dotenv/load.ts";
import {
  Application,
  Router,
  render,
  RedisStore,
} from "./deps.ts";

import {CsrfVerify} from "https://deno.land/x/oak_csrf@0.0.1/mod.ts"

const key = Deno.env.get("CSRF_KEY") as string;

const app = new Application();
const store = new RedisStore({
  host: "redis",
  port: 6379,
});
await store.init();

const csrfVerify = new CsrfVerify(key, store);

const router = new Router();

router.get("/", async (context) => {
  console.log("get /");

  const flash = await context.state.session.get("_flash");
  const name = !flash.name ? "" : flash.name;
  const csrfUnVerify = flash.csrfUnVerify ? flash.csrfUnVerify : false;

  const csrfToken = await context.state.session.get("csrfToken");

  const body = render(Deno.readTextFileSync("./page/form.html"), {
    token: csrfToken,
    name,
    csrfUnVerify
  });

  context.response.body = body;
});

router.post("/", async (context) => {
  console.log("post /");

  const value = await context.request.body({ type: "form" }).value;
  const name = value.get("name");

  await context.state.session.flash("name", name);

  context.response.redirect("/");
});

app.use(csrfVerify.verify());
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8080 });

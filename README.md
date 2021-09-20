# oak_csrf
Extension of oak using deno_csrf.  
This module influenced by [oak_Session](https://github.com/jcs224/oak_sessions).  
Filled with gratitude.  

# Usage

```ts
// Requires encryption key. It would be better to use environment variables
const key = Deno.env.get("CSRF_KEY") as string;

// Use one of the store published in https://deno.land/x/sessions@v1.5.4/mod.ts 
const store = new RedisStore({
  host: "redis",
  port: 6379,
});
await store.init();

const csrfVerify = new CsrfVerify(key, store);

router.get("/", async (context) => {
  const csrfToken = await context.state.session.get("csrfToken");
  // Please embed token in template
  const body = render(Deno.readTextFileSync("./page/form.html"), {
    token: csrfToken
  });

  context.response.body = body;
});

const app = new Application();
app.use(csrfVerify.verify());
```
import {
  getCookies,
  setCookie,
  computeHmacTokenPair,
  computeVerifyHmacTokenPair,
  Session,
  Context,
  MemoryStore,
  SqliteStore,
  RedisStore,
  WebdisStore,
  Cookie,
  Middleware,
} from "../deps.ts";

type Store = MemoryStore | SqliteStore | RedisStore | WebdisStore | null;

interface VerifyState {
  state: boolean;
  redirectPath: string;
  message: string;
}

const getTask = async function (ctx: Context, key: string): Promise<void> {
  const tokenPair = computeHmacTokenPair(key, 360);

  await ctx.state.session.set("csrfToken", tokenPair.tokenStr);

  const cookie: Cookie = {
    name: "cookies_token",
    value: tokenPair.cookieStr,
  };
  setCookie(ctx.response, cookie);
};

const postTask = async function (
  ctx: Context,
  key: string
): Promise<VerifyState> {
  const value = await ctx.request.body({ type: "form" }).value;
  const csrfToken = value.get("csrf_token");
  const cookies = getCookies(ctx.request);

  const referer = ctx.request.headers.get("referer");

  let state = false,
    redirectPath = "",
    message = "";

  // referer が無い
  if (!referer) {
    message = "Not huve referer!";
    redirectPath = "/";
    return { state, redirectPath, message };
  }

  // トークンが無い
  if (!csrfToken) {
    message = "Not found csrf token into form!";
    ctx.state.session.flash("csrfUnVerify", true);
    redirectPath = referer;
    return { state, redirectPath, message };
  }

  // csrfトークン検証エラー
  if (!computeVerifyHmacTokenPair(key, csrfToken, cookies.cookies_token)) {
    message = "Not verify csrf token!";
    ctx.state.session.flash("csrfUnVerify", true);
    redirectPath = referer;
    return { state, redirectPath, message };
  }

  state = true;
  return { state, redirectPath, message };
};

export class CsrfVerify extends Session {
  private key: string;

  constructor(key: string, store: Store = null) {
    super(store || null);
    this.key = key;
  }
  verify(): Middleware {
    const verifyFunc = async (
      ctx: Context,
      next: () => Promise<void>
    ): Promise<void> => {
      const sid = await ctx.cookies.get("sid");

      if (sid && (await this.sessionExists(sid))) {
        ctx.state.session = this.getSession(sid);
      } else {
        ctx.state.session = await this.createSession();
        ctx.cookies.set("sid", ctx.state.session.id);
      }

      if (ctx.request.method === "GET") {
        await getTask(ctx, this.key);
      } else if (ctx.request.method === "POST") {
        // トークン検証
        const { state, redirectPath, message } = await postTask(ctx, this.key);

        if (!state) {
          console.error(message);
          return ctx.response.redirect(redirectPath);
        }

        // トークン再設定
        await getTask(ctx, this.key);
      }
      ctx.state.session.set("_flash", {});

      await next();
    };
    return verifyFunc as Middleware;
  }
}

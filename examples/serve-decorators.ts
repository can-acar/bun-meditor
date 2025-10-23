import "reflect-metadata";
import { Mediator } from "../src/mediator";
import { Handle } from "../src/decorators";
import type { Request as MedRequest, Notification as MedNotification } from "../src/types";
import { LoggingBehavior, TimeoutBehavior } from "../src/behaviors";
import { CancellationToken } from "bun-cancellation-token";
import { Container } from "bun-ioc/container";

// Define request/notification contracts
interface SumReq extends MedRequest<number> { a: number; b: number }
interface PingEvt extends MedNotification { msg: string }

// Handlers via decorators
class MyApi {
  @Handle({ key: "sum", kind: "request" })
  async sum(req: SumReq): Promise<number> {
    return req.a + req.b;
  }

  @Handle({ key: "ping", kind: "notification" })
  async onPing(evt: PingEvt): Promise<void> {
    console.log("ping:", evt.msg);
  }
}

// Minimal container (not used by handlers here but required by Mediator)
const container = new Container();
const mediator = new Mediator(container);
mediator.useBehavior(new LoggingBehavior());
mediator.useBehavior(new TimeoutBehavior(2000));

// Scan decorated methods and register as handlers
const api = new MyApi();
mediator.scanHandles(api);

const server = Bun.serve({
  port: 3001,
  fetch: async (req: Request) => {
    try {
      const url = new URL(req.url);

      if (req.method === "POST" && url.pathname === "/sum") {
        const body: any = await req.json().catch(() => ({} as any));
        const a = Number(body?.a);
        const b = Number(body?.b);
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
          return new Response(JSON.stringify({ error: "Invalid numbers" }), { status: 400, headers: { "content-type": "application/json" } });
        }
        const ct = new CancellationToken(req.signal);
        const result = await mediator.send<SumReq, number>("sum", { a, b }, { ct, timeoutMs: 1500, meta: { path: "/sum" } });
        return new Response(JSON.stringify({ result }), { headers: { "content-type": "application/json" } });
      }

      if (req.method === "POST" && url.pathname === "/ping") {
        const body: any = await req.json().catch(() => ({} as any));
        const msg = String(body?.msg ?? "");
        const ct = new CancellationToken(req.signal);
        await mediator.publish<PingEvt>("ping", { msg }, { ct, timeoutMs: 1000, meta: { path: "/ping" } });
        return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      const status = 500;
      return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status, headers: { "content-type": "application/json" } });
    }
  }
});

console.log(`HTTP server (decorators) on http://localhost:${server.port}`);
console.log("POST /sum { a, b } | POST /ping { msg }");

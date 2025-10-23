import "reflect-metadata";
import { Container, token } from "bun-ioc/container";
import { Mediator } from "../src/mediator";
import type { Request as MedRequest, RequestHandler, PipelineContext } from "../src/types";
import { LoggingBehavior, TimeoutBehavior } from "../src/behaviors";
import { CancellationToken } from "bun-cancellation-token";

// Define a simple request
interface SumReq extends MedRequest<number> { a: number; b: number }
const SumT = token<RequestHandler<SumReq, number>>("example:ServeSum");

class SumHandler implements RequestHandler<SumReq, number> {
  async handle(req: SumReq, _ctx: PipelineContext): Promise<number> { return req.a + req.b; }
}

const container = new Container();
container.register(SumT, () => new SumHandler(), "singleton");

const mediator = new Mediator(container);
mediator.useBehavior(new LoggingBehavior());
mediator.useBehavior(new TimeoutBehavior(2000));
mediator.registerRequest<SumReq, number>("sum", SumT);

const server = Bun.serve({
  port: 3000,
  fetch: async (req: Request) => {
    try {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/sum") {
        const body: any = await req.json().catch(() => ({} as any));
        const a = Number((body as any).a);
        const b = Number((body as any).b);
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
          return new Response(JSON.stringify({ error: "Invalid numbers" }), { status: 400, headers: { "content-type": "application/json" } });
        }
        const ct = new CancellationToken(req.signal);
        const result = await mediator.send<SumReq, number>("sum", { a, b }, { ct, timeoutMs: 1500, meta: { path: "/sum" } });
        return new Response(JSON.stringify({ result }), { headers: { "content-type": "application/json" } });
      }
      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      const status = 500;
      return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status, headers: { "content-type": "application/json" } });
    }
  }
});

console.log(`HTTP server running on http://localhost:${server.port} (POST /sum { a, b })`);

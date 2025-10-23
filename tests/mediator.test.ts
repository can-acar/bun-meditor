import { describe, it, expect } from "bun:test";
import { Container, token } from "bun-ioc/container";
import { Mediator } from "../src/mediator";
import type { Request, RequestHandler, Notification, NotificationHandler, PipelineBehavior, PipelineContext, MetricsSink } from "../src/types";
import { CanceledError, HandlerNotFoundError } from "../src/types";
import { Handle } from "../src/decorators";

// Types for testing
interface SumReq extends Request<number> { a: number; b: number }
class SumHandler implements RequestHandler<SumReq, number> {
  calls: number = 0;
  async handle(req: SumReq, _ctx: PipelineContext): Promise<number> {
    this.calls++;
    return req.a + req.b;
  }
}

interface PingEvt extends Notification { msg: string }
class PingHandler implements NotificationHandler<PingEvt> {
  constructor(private log: string[]) {}
  async handle(evt: PingEvt, _ctx: PipelineContext): Promise<void> { this.log.push(evt.msg); }
}

// Custom behavior to verify ordering and context bag usage
class TraceBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
  constructor(private label: string, public order: number, private trace: string[]) {}
  async handle(_req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes> {
    this.trace.push(`${this.label}:before`);
    ctx.bag.set(this.label, true);
    const res = await next();
    this.trace.push(`${this.label}:after`);
    return res;
  }
}

// Metrics sink that records events
class TestMetrics implements MetricsSink {
  public events: Array<{ name: string; type: string; ms?: number; err?: unknown }> = [];
  onRequestStart(name: string): void { this.events.push({ name, type: "start" }); }
  onRequestOk(name: string, ms: number): void { this.events.push({ name, type: "ok", ms }); }
  onRequestError(name: string, ms: number, err: unknown): void { this.events.push({ name, type: "error", ms, err }); }
}

// Helper delay
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

describe("Mediator - send/publish basics", () => {
  it("sends request via token-registered handler and returns result", async () => {
    const c = new Container();
    const H = token<RequestHandler<SumReq, number>>("SumHandler");
    const impl = new SumHandler();
    c.register(H, () => impl, "singleton");

    const med = new Mediator(c);
    med.registerRequest<SumReq, number>("sum", H);

    const out = await med.send<SumReq, number>("sum", { a: 2, b: 5 });
    expect(out).toBe(7);
    expect(impl.calls).toBe(1);
  });

  it("publishes notification to all handlers", async () => {
    const c = new Container();
    const log: string[] = [];
    const H1 = token<NotificationHandler<PingEvt>>("PingHandler1");
    const H2 = token<NotificationHandler<PingEvt>>("PingHandler2");
    c.register(H1, () => new PingHandler(log), "transient");
    c.register(H2, () => new PingHandler(log), "transient");

    const med = new Mediator(c);
    med.registerNotification<PingEvt>("ping", H1);
    med.registerNotification<PingEvt>("ping", H2);

    await med.publish<PingEvt>("ping", { msg: "hello" });
    expect(log).toEqual(["hello", "hello"]);
  });
});

describe("Mediator - behaviors and ordering", () => {
  it("applies behaviors by ascending order (lower runs first)", async () => {
    const c = new Container();
    const H = token<RequestHandler<SumReq, number>>("SumHandler2");
    c.register(H, () => ({
      async handle(req: SumReq) { return req.a * req.b; }
    }), "singleton");

    const med = new Mediator(c);
    med.registerRequest<SumReq, number>("mul", H);

    const trace: string[] = [];
    med.useBehavior(new TraceBehavior<SumReq, number>("B", 50, trace));
    med.useBehavior(new TraceBehavior<SumReq, number>("A", 10, trace));

    const out = await med.send<SumReq, number>("mul", { a: 3, b: 4 });
    expect(out).toBe(12);
    // A has lower order => runs before B, and after-sequence is symmetric
    expect(trace).toEqual(["A:before", "B:before", "B:after", "A:after"]);
  });
});

describe("Mediator - metrics and timeout/cancellation", () => {
  it("records metrics on success and error (cancellation)", async () => {
    const c = new Container();
    const metrics = new TestMetrics();

    // fast success handler
    const HF = token<RequestHandler<SumReq, number>>("Fast");
    c.register(HF, () => ({ async handle(req: SumReq) { return req.a - req.b; } }), "singleton");

    // slow handler used to trigger timeout
    const HS = token<RequestHandler<SumReq, number>>("Slow");
    c.register(HS, () => ({ async handle(_req: SumReq) { await sleep(40); return 42; } }), "singleton");

    const med = new Mediator(c);

    // Success path
    med.useMetrics(metrics);
    med.registerRequest<SumReq, number>("fast-op", HF);
    const ok = await med.send<SumReq, number>("fast-op", { a: 10, b: 3 });
    expect(ok).toBe(7);

    // Error path via timeout; we register and call with timeoutMs < handler time
    med.registerRequest<SumReq, number>("slow-op", HS);
  const slowCall = med.send<SumReq, number>("slow-op", { a: 1, b: 2 }, { timeoutMs: 10 });
  await expect(slowCall).rejects.toBeInstanceOf(CanceledError);

    const names = metrics.events.map(e => e.name);
    const types = metrics.events.map(e => e.type);
    expect(names).toEqual(["fast-op", "fast-op", "slow-op", "slow-op"]); // start/ok then start/error
    expect(types).toEqual(["start", "ok", "start", "error"]);
  });
});

describe("Mediator - decorator-based scanHandles", () => {
  it("registers handlers via @Handle and scanHandles", async () => {
    const c = new Container();
    const med = new Mediator(c);

    class MyApi {
      @Handle({ key: "sum-req", kind: "request" })
      async sum(req: SumReq): Promise<number> { return req.a + req.b; }

      @Handle({ key: "ping-evt", kind: "notification" })
      async onPing(evt: PingEvt): Promise<void> { (evt as any).acked = true; }
    }

    const api = new MyApi();
    med.scanHandles(api);

    const r = await med.send<SumReq, number>("sum-req", { a: 4, b: 6 });
    expect(r).toBe(10);

    const evt: PingEvt & { acked?: boolean } = { msg: "hi" };
  await med.publish<PingEvt>("ping-evt", evt);
  expect(evt.acked).toBe(true);
  });
});

describe("Mediator - errors", () => {
  it("throws when no request handler registered", async () => {
    const c = new Container();
    const med = new Mediator(c);
  await expect(med.send<SumReq, number>("missing", { a: 1, b: 1 })).rejects.toBeInstanceOf(HandlerNotFoundError);
  });
});

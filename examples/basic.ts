import { Container, token } from "bun-ioc/container";
import { Mediator } from "../src/mediator";
import type { Request, RequestHandler, Notification, NotificationHandler, PipelineContext } from "../src/types";

// Request/Handler
interface SumReq extends Request<number> { a: number; b: number }
const SumHandlerT = token<RequestHandler<SumReq, number>>("example:SumHandler");

class SumHandler implements RequestHandler<SumReq, number> {
  async handle(req: SumReq, _ctx: PipelineContext): Promise<number> {
    return req.a + req.b;
  }
}

// Notification/Handler
interface LogEvt extends Notification { msg: string }
const LogHandlerT = token<NotificationHandler<LogEvt>>("example:LogHandler");

class LogHandler implements NotificationHandler<LogEvt> {
  async handle(evt: LogEvt): Promise<void> { console.log("[evt]", evt.msg); }
}

async function main() {
  const c = new Container();
  c.register(SumHandlerT, () => new SumHandler(), "singleton");
  c.register(LogHandlerT, () => new LogHandler(), "transient");

  const med = new Mediator(c);
  med.registerRequest<SumReq, number>("sum", SumHandlerT);
  med.registerNotification<LogEvt>("log", LogHandlerT);

  const r = await med.send<SumReq, number>("sum", { a: 2, b: 5 });
  console.log("sum result:", r);
  await med.publish<LogEvt>("log", { msg: "hello world" });
}

main().catch(err => { console.error(err); process.exit(1); });

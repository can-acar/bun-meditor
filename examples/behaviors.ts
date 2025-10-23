import { Container, token } from "bun-ioc/container";
import { Mediator } from "../src/mediator";
import type { Request, RequestHandler, PipelineContext } from "../src/types";
import { LoggingBehavior, RetryBehavior, TimeoutBehavior } from "../src/behaviors";

interface FlakyReq extends Request<number> {}
const FlakyT = token<RequestHandler<FlakyReq, number>>("example:Flaky");

class Flaky implements RequestHandler<FlakyReq, number> {
  private tries = 0;
  async handle(_req: FlakyReq, _ctx: PipelineContext): Promise<number> {
    this.tries++;
    if (this.tries < 3) throw new Error("intermittent failure");
    return 42;
  }
}

async function main() {
  const c = new Container();
  c.register(FlakyT, () => new Flaky(), "singleton");
  const med = new Mediator(c);

  med.useBehavior(new LoggingBehavior());
  med.useBehavior(new RetryBehavior(3, 50));
  med.useBehavior(new TimeoutBehavior(1000));
  med.registerRequest<FlakyReq, number>("flaky", FlakyT);

  const val = await med.send<FlakyReq, number>("flaky", {});
  console.log("flaky result:", val);
}

main().catch(err => { console.error(err); process.exit(1); });

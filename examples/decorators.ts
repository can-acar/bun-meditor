import "reflect-metadata";
import { Mediator } from "../src/mediator";
import { Handle } from "../src/decorators";

interface SumReq { a: number; b: number }
interface PingEvt { msg: string }

class MyApi {
  @Handle({ key: "sum", kind: "request" })
  async sum(req: SumReq): Promise<number> { return req.a + req.b; }

  @Handle({ key: "ping", kind: "notification" })
  async onPing(evt: PingEvt): Promise<void> { console.log("ping:", evt.msg); }
}

async function main() {
  const api = new MyApi();
  // This example uses scanHandles with callables; no DI container needed
  // Provide a minimal fake container interface for ctx if needed by handlers (here it's unused)
  const fakeContainer: any = { resolve: () => undefined };
  const med = new Mediator(fakeContainer);
  med.scanHandles(api);

  const r = await med.send<any, number>("sum", { a: 4, b: 6 });
  console.log("sum via decorators:", r);
  await med.publish<any>("ping", { msg: "hello" });
}

main().catch(err => { console.error(err); process.exit(1); });

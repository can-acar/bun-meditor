# bun-meditor

Basit, performanslı ve Bun dostu bir Mediator kütüphanesi. Request/Response (send) ve Publish/Subscribe (publish) desenlerini; IoC, davranış (pipeline) katmanı, iptal/timeout ve dekoratörlerle birleştirir.

## Özellikler

- Send (Request/Response) ve Publish (Notification) akışları
- IoC entegrasyonu: handler’ları `bun-ioc` token’larıyla veya doğrudan fonksiyon olarak kaydedin
- Davranış (Pipeline) desteği: sıralanabilir `Logging`, `Retry`, `Timeout` vb.
- İptal/Timeout: `bun-cancellation-token` ile propagation ve timeout
- Dekoratörler: `@Handle` ve `mediator.scanHandles(instance)`
- Metrikler: basit bir `MetricsSink` arayüzü ile custom raporlama
- TypeScript first, Bun ile hızlı çalışır

## Kurulum

```bash
bun install
```

Dekoratörleri kullanacaksanız `tsconfig.json` içerisinde şu bayraklar açık olmalı:

- `"experimentalDecorators": true`
- `"emitDecoratorMetadata": true`

Ve örneklerde olduğu gibi dekoratörler için `reflect-metadata` import edin:

```ts
import "reflect-metadata";
```

## Hızlı Başlangıç

```ts
import { Container, token } from "bun-ioc/container";
import { Mediator } from "./src/mediator";
import type { Request, RequestHandler, Notification, NotificationHandler, PipelineContext } from "./src/types";

// Request/Handler
interface SumReq extends Request<number> { a: number; b: number }
const SumHandlerT = token<RequestHandler<SumReq, number>>("SumHandler");

class SumHandler implements RequestHandler<SumReq, number> {
	async handle(req: SumReq, _ctx: PipelineContext) { return req.a + req.b; }
}

// Notification/Handler
interface LogEvt extends Notification { msg: string }
const LogHandlerT = token<NotificationHandler<LogEvt>>("LogHandler");

class LogHandler implements NotificationHandler<LogEvt> {
	async handle(evt: LogEvt) { console.log("evt:", evt.msg); }
}

const c = new Container();
c.register(SumHandlerT, () => new SumHandler(), "singleton");
c.register(LogHandlerT, () => new LogHandler(), "transient");

const med = new Mediator(c);
med.registerRequest<SumReq, number>("sum", SumHandlerT);
med.registerNotification<LogEvt>("log", LogHandlerT);

const r = await med.send<SumReq, number>("sum", { a: 2, b: 5 }); // 7
await med.publish<LogEvt>("log", { msg: "hello" });
```

## Davranışlar (Pipeline)

```ts
import { LoggingBehavior, RetryBehavior, TimeoutBehavior } from "./src/behaviors";

med.useBehavior(new LoggingBehavior());
med.useBehavior(new RetryBehavior(3, 50));
med.useBehavior(new TimeoutBehavior(1000));
```

Order küçük olan önce çalışır. Kendi `PipelineBehavior`’ınızı tanımlayabilirsiniz.

## Dekoratörler ve scanHandles

```ts
import "reflect-metadata";
import { Handle } from "./src/decorators";

class MyApi {
	@Handle({ key: "sum", kind: "request" })
	async sum(req: { a: number; b: number }) { return req.a + req.b; }

	@Handle({ key: "ping", kind: "notification" })
	async onPing(evt: { msg: string }) { console.log("ping:", evt.msg); }
}

const api = new MyApi();
med.scanHandles(api); // @Handle ile işaretli metodlar otomatik kaydedilir
```

## Bun.serve Entegrasyonu

Hazır örnekler ile çalıştırabilirsiniz:

```bash
# Basic HTTP örneği (POST /sum)
bun run examples/serve.ts
curl -s http://localhost:3000/sum -H 'content-type: application/json' -d '{"a":4,"b":6}'

# Dekoratörlü HTTP örneği (POST /sum, POST /ping)
bun run examples/serve-decorators.ts
curl -s http://localhost:3001/sum -H 'content-type: application/json' -d '{"a":3,"b":9}'
curl -s http://localhost:3001/ping -H 'content-type: application/json' -d '{"msg":"hello"}'
```

## Testler

```bash
bun test
```

## API Kısa Özeti

- `Mediator`
	- `registerRequest(key, token)` / `registerNotification(key, token)` / `registerCallable(key, kind, ref)`
	- `useBehavior(behavior)` / `useMetrics(sink)`
	- `scanHandles(instance)` — `@Handle` ile işaretli metodları kaydeder
	- `send(key, req, { timeoutMs, ct, meta })` — `Promise<TRes>`
	- `publish(key, evt, { timeoutMs, ct, meta })` — `Promise<void>`
- Tipler
	- `Request<T>`, `Notification`, `RequestHandler`, `NotificationHandler`
	- `PipelineBehavior`, `PipelineContext` (ct, container, meta, bag)
	- Hatalar: `HandlerNotFoundError`, `CanceledError`, `AmbiguousHandlerError`

## Örnekleri Çalıştır

```bash
bun run examples/basic.ts
bun run examples/behaviors.ts
bun run examples/decorators.ts
bun run examples/serve.ts
bun run examples/serve-decorators.ts
```

## Lisans

MIT © 2025 Can Acar


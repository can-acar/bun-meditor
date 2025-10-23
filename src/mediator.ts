import { token, type Container, type Token } from "bun-ioc";
import type {
  Request, RequestHandler, Notification, NotificationHandler,
  PipelineBehavior, PipelineContext, MetricsSink,
  HandlerRegistration, HandlerRef
} from "./types";
import { withTimeout, anyToken, CancellationToken } from "bun-cancellation-token";
import { CanceledError, HandlerNotFoundError } from "./types";

type Ctor<T> = new (...args: any[]) => T;

export const MEDIATOR = token<Mediator>("core:Mediator");

export interface SendOptions {
  timeoutMs?: number;                 // isteğe özel timeout
  ct?: CancellationToken;             // üst token (saga/endpoint’ten gelir)
  meta?: Record<string, unknown>;     // traceId, userId...
}

export class Mediator {
  private req = new Map<string, HandlerRef[]>();   // aynı key için çoklu kayıt desteklenir (policy ile seçebilirsin)
  private evt = new Map<string, HandlerRef[]>();
  private behaviors: PipelineBehavior<any, any>[] = [];
  private metrics?: MetricsSink;

  constructor(private container: Container) { }

  useBehavior<TReq extends Request<TRes>, TRes>(b: PipelineBehavior<TReq, TRes>) {
    this.behaviors.push(b as any);
    this.behaviors.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
  useMetrics(sink: MetricsSink) { this.metrics = sink; }

  // ----- Kayıt API’leri (DI token veya callable) -----
  registerRequest<TReq extends Request<TRes>, TRes>(key: string, handlerToken: Token<RequestHandler<TReq, TRes>>) {
    const arr = this.req.get(key) ?? []; arr.push({ kind: "token", token: handlerToken as unknown as symbol }); this.req.set(key, arr);
  }
  registerNotification<T extends Notification>(key: string, handlerToken: Token<NotificationHandler<T>>) {
    const arr = this.evt.get(key) ?? []; arr.push({ kind: "token", token: handlerToken as unknown as symbol }); this.evt.set(key, arr);
  }
  registerCallable(key: string, kind: "request" | "notification", ref: HandlerRef) {
    const map = kind === "request" ? this.req : this.evt;
    const arr = map.get(key) ?? []; arr.push(ref); map.set(key, arr);
  }

  // ----- @Handle ile işaretlenmiş sınıf örneğini tara ve kaydet -----
  scanHandles(instance: object) {
    const ctor = (instance as any).constructor;
    const list: Array<{ method: string; key: string; kind: "request" | "notification" }> =
      Reflect.getOwnMetadata("mediator:handles", ctor) ?? [];
    for (const it of list) {
      const fn = (instance as any)[it.method].bind(instance);
      const ref: HandlerRef = { kind: "callable", fn: async (payload, ctx) => fn(payload, ctx) };
      this.registerCallable(it.key, it.kind, ref);
    }
  }

  // ====== SEND ======
  async send<TReq extends Request<TRes>, TRes>(key: string, req: TReq, options: SendOptions = {}): Promise<TRes> {
    const { timeoutMs, ct: parent, meta = {} } = options;

    // 🕒 CancellationToken hazırlığı
    const base = parent ?? new CancellationToken(new AbortController().signal);
    const cts = (timeoutMs != null) ? withTimeout(timeoutMs, base) : undefined;
    const ct = (cts ? anyToken(base, cts.token) : base);

    const ctx: PipelineContext = {
      ct, container: this.container, meta: { ...meta, key }, bag: new Map<string, unknown>()
    };

    const arr = this.req.get(key) ?? [];
    if (arr.length === 0) throw new HandlerNotFoundError(key);
    // Şimdilik ilkini seçiyoruz (ileri: policy / named / priority ile seçim yapılabilir)
    const ref = arr[0];
    if (!ref) throw new HandlerNotFoundError(key);

    const handlerInvoke = async (): Promise<TRes> => {
      if (ref.kind === "token") {
        const h = this.container.resolve(ref.token) as RequestHandler<TReq, TRes>;
        return await h.handle(req, ctx);
      } else {
        return await ref.fn(req, ctx);
      }
    };

    const invokeWithBehaviors = this.behaviors
      .reduceRight<() => Promise<TRes>>((next, b) => () => b.handle(req, next, ctx), handlerInvoke);

    // metrics
    this.metrics?.onRequestStart(key, ctx.meta as any);
    const started = performance.now();

    try {
      // cancel check
      if (ct.isCancellationRequested) throw new CanceledError();

      const result = await invokeWithBehaviors();

      // cancel check after completion (race)
      if (ct.isCancellationRequested) throw new CanceledError();

      this.metrics?.onRequestOk(key, performance.now() - started, ctx.meta as any);
      return result;
    } catch (e) {
      this.metrics?.onRequestError(key, performance.now() - started, e, ctx.meta as Record<string, unknown>);
      throw e;
    } finally {
      cts?.token.onCancelled(() => { }); // GC hint
    }
  }

  // ====== PUBLISH ======
  async publish<T extends Notification>(key: string, evt: T, options: SendOptions = {}): Promise<void> {
    const { timeoutMs, ct: parent, meta = {} } = options;
    const base = parent ?? new CancellationToken(new AbortController().signal);
    const cts = (timeoutMs != null) ? withTimeout(timeoutMs, base) : undefined;
    const ct = (cts ? anyToken(base, cts.token) : base);

    const ctx: PipelineContext = {
      ct, container: this.container, meta: { ...meta, key }, bag: new Map<string, unknown>()
    };

    const arr = this.evt.get(key) ?? [];
    if (arr.length === 0) return;

    // Bildirimlerde tüm handler’ları çalıştır
    await Promise.all(arr.map(async (ref) => {
      if (ct.isCancellationRequested) return;
      if (ref.kind === "token") {
        const h = this.container.resolve(ref.token) as NotificationHandler<T>;
        await h.handle(evt, ctx);
      } else {
        await ref.fn(evt, ctx);
      }
    }));
  }
}

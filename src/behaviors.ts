import type { PipelineBehavior, Request } from "./types";
import type { PipelineContext } from "./types";

export class LoggingBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
  readonly order = 10;
  async handle(req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes> {
    const t0 = performance.now();
    try {
      const res = await next();
      const ms = performance.now() - t0;
      console.log(`[MED] OK ${req.constructor.name} ${ms.toFixed(1)}ms`);
      return res;
    } catch (e) {
      const ms = performance.now() - t0;
      console.error(`[MED] ERR ${req.constructor.name} ${ms.toFixed(1)}ms`, e);
      throw e;
    }
  }
}

export class TimeoutBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
  readonly order = 20;
  constructor(private ms = 3000) {}
  async handle(_req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes> {
    ctx.ct.throwIfCancellationRequested();
    return await Promise.race([
      next(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Mediator timeout ${this.ms}ms`)), this.ms))
    ]);
  }
}

export class RetryBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
  readonly order = 30;
  constructor(private attempts = 3, private delayMs = 50, private shouldRetry = (_: unknown) => true) {}
  async handle(_req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes> {
    let last: any;
    for (let i=1;i<=this.attempts;i++){
      ctx.ct.throwIfCancellationRequested();
      try { return await next(); }
      catch (e){ last = e; if (i < this.attempts && this.shouldRetry(e)) await new Promise(r => setTimeout(r, this.delayMs)); else break; }
    }
    throw last;
  }
}

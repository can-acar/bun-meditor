// @bun
// src/behaviors.ts
class LoggingBehavior {
  order = 10;
  async handle(req, next, ctx) {
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

class TimeoutBehavior {
  ms;
  order = 20;
  constructor(ms = 3000) {
    this.ms = ms;
  }
  async handle(_req, next, ctx) {
    ctx.ct.throwIfCancellationRequested();
    return await Promise.race([
      next(),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`Mediator timeout ${this.ms}ms`)), this.ms))
    ]);
  }
}

class RetryBehavior {
  attempts;
  delayMs;
  shouldRetry;
  order = 30;
  constructor(attempts = 3, delayMs = 50, shouldRetry = (_) => true) {
    this.attempts = attempts;
    this.delayMs = delayMs;
    this.shouldRetry = shouldRetry;
  }
  async handle(_req, next, ctx) {
    let last;
    for (let i = 1;i <= this.attempts; i++) {
      ctx.ct.throwIfCancellationRequested();
      try {
        return await next();
      } catch (e) {
        last = e;
        if (i < this.attempts && this.shouldRetry(e))
          await new Promise((r) => setTimeout(r, this.delayMs));
        else
          break;
      }
    }
    throw last;
  }
}
export {
  TimeoutBehavior,
  RetryBehavior,
  LoggingBehavior
};

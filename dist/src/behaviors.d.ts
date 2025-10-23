import type { PipelineBehavior, Request } from "./types";
import type { PipelineContext } from "./types";
export declare class LoggingBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
    readonly order = 10;
    handle(req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes>;
}
export declare class TimeoutBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
    private ms;
    readonly order = 20;
    constructor(ms?: number);
    handle(_req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes>;
}
export declare class RetryBehavior<TReq extends Request<TRes>, TRes> implements PipelineBehavior<TReq, TRes> {
    private attempts;
    private delayMs;
    private shouldRetry;
    readonly order = 30;
    constructor(attempts?: number, delayMs?: number, shouldRetry?: (_: unknown) => boolean);
    handle(_req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes>;
}

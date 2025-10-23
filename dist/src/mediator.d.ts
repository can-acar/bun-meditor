import { type Container, type Token } from "bun-ioc";
import type { Request, RequestHandler, Notification, NotificationHandler, PipelineBehavior, MetricsSink, HandlerRef } from "./types";
import { CancellationToken } from "bun-cancellation-token";
export declare const MEDIATOR: Token<Mediator>;
export interface SendOptions {
    timeoutMs?: number;
    ct?: CancellationToken;
    meta?: Record<string, unknown>;
}
export declare class Mediator {
    private container;
    private req;
    private evt;
    private behaviors;
    private metrics?;
    constructor(container: Container);
    useBehavior<TReq extends Request<TRes>, TRes>(b: PipelineBehavior<TReq, TRes>): void;
    useMetrics(sink: MetricsSink): void;
    registerRequest<TReq extends Request<TRes>, TRes>(key: string, handlerToken: Token<RequestHandler<TReq, TRes>>): void;
    registerNotification<T extends Notification>(key: string, handlerToken: Token<NotificationHandler<T>>): void;
    registerCallable(key: string, kind: "request" | "notification", ref: HandlerRef): void;
    scanHandles(instance: object): void;
    send<TReq extends Request<TRes>, TRes>(key: string, req: TReq, options?: SendOptions): Promise<TRes>;
    publish<T extends Notification>(key: string, evt: T, options?: SendOptions): Promise<void>;
}

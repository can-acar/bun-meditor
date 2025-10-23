import type { CancellationToken } from "bun-cancellation-token";
import type { Container } from "bun-ioc";
export interface Request<TResponse = any> {
}
export interface RequestHandler<TReq extends Request<TRes>, TRes> {
    handle(req: TReq, ctx: PipelineContext): Promise<TRes>;
}
export interface Notification {
}
export interface NotificationHandler<T extends Notification> {
    handle(evt: T, ctx: PipelineContext): Promise<void>;
}
/** PipelineContext: tüm davranış zincirine ve handler'a taşınır */
export interface PipelineContext {
    ct: CancellationToken;
    container: Container;
    meta: Record<string, unknown>;
    bag: Map<string, unknown>;
}
export interface PipelineBehavior<TReq extends Request<TRes>, TRes> {
    readonly order?: number;
    handle(req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes>;
}
/** İsteğe bağlı metrik çıkışı */
export interface MetricsSink {
    onRequestStart(name: string, meta: Record<string, unknown>): void;
    onRequestOk(name: string, ms: number, meta: Record<string, unknown>): void;
    onRequestError(name: string, ms: number, err: unknown, meta: Record<string, unknown>): void;
}
/** Üretim için anlaşılır hata tipleri */
export declare class MediatorError extends Error {
    constructor(msg: string);
}
export declare class HandlerNotFoundError extends MediatorError {
    constructor(key: string);
}
export declare class AmbiguousHandlerError extends MediatorError {
    constructor(key: string);
}
export declare class CanceledError extends MediatorError {
    constructor();
}
/** Dahili kayıt modeli (DI token veya callable) */
export type HandlerRef = {
    kind: "token";
    token: symbol;
} | {
    kind: "callable";
    fn: (payload: any, ctx: PipelineContext) => Promise<any>;
};
export interface HandlerRegistration {
    key: string;
    type: "request" | "notification";
    ref: HandlerRef;
}

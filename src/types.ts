import type { CancellationToken } from "bun-cancellation-token";
import type { Container } from "bun-ioc";

export interface Request<TResponse = any> { }
export interface RequestHandler<TReq extends Request<TRes>, TRes> {
  handle(req: TReq, ctx: PipelineContext): Promise<TRes>;
}

export interface Notification { }
export interface NotificationHandler<T extends Notification> {
  handle(evt: T, ctx: PipelineContext): Promise<void>;
}

/** PipelineContext: tüm davranış zincirine ve handler'a taşınır */
export interface PipelineContext {
  ct: CancellationToken;                 // ✔ iptal/timeout/propagation
  container: Container;                  // ✔ DI erişimi
  meta: Record<string, unknown>;         // ✔ traceId, userId vs.
  bag: Map<string, unknown>;             // ✔ behavior/handler arası paylaşım
}

export interface PipelineBehavior<TReq extends Request<TRes>, TRes> {
  readonly order?: number; // küçük önce
  handle(req: TReq, next: () => Promise<TRes>, ctx: PipelineContext): Promise<TRes>;
}

/** İsteğe bağlı metrik çıkışı */
export interface MetricsSink {
  onRequestStart(name: string, meta: Record<string, unknown>): void;
  onRequestOk(name: string, ms: number, meta: Record<string, unknown>): void;
  onRequestError(name: string, ms: number, err: unknown, meta: Record<string, unknown>): void;
}

/** Üretim için anlaşılır hata tipleri */
export class MediatorError extends Error { constructor(msg: string) { super(msg); this.name = "MediatorError"; } }
export class HandlerNotFoundError extends MediatorError { constructor(key: string) { super(`Handler not found for "${key}"`); } }
export class AmbiguousHandlerError extends MediatorError { constructor(key: string) { super(`Ambiguous handlers for "${key}"`); } }
export class CanceledError extends MediatorError { constructor() { super("Operation cancelled"); } }

/** Dahili kayıt modeli (DI token veya callable) */
export type HandlerRef =
  | { kind: "token"; token: symbol; }
  | { kind: "callable"; fn: (payload: any, ctx: PipelineContext) => Promise<any> };

export interface HandlerRegistration {
  key: string;
  type: "request" | "notification";
  ref: HandlerRef;
}

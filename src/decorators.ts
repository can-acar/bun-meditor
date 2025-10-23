import "reflect-metadata";
import { token } from "bun-ioc/container";
import type { HandlerRef } from "./types";

/** Opsiyonel: sınıflara/handler’lara anahtar atamak için */
export function RequestKey(key: string) {
  return function (target: any) { Reflect.defineMetadata("mediator:reqkey", key, target); };
}
export function NotificationKey(key: string) {
  return function (target: any) { Reflect.defineMetadata("mediator:notifkey", key, target); };
}

/**
 * @Handle — sınıf METODLARINI handler'a çevirir.
 *  Usage:
 *   class X {
 *     @Handle({ key: "GetUser", kind: "request" })
 *     async getUser(req: GetUser, ctx: PipelineContext) { ... }
 *   }
 */
export function Handle(opts: { key: string; kind: "request" | "notification" }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const list: any[] = Reflect.getOwnMetadata("mediator:handles", target.constructor) ?? [];
    list.push({ method: propertyKey, key: opts.key, kind: opts.kind });
    Reflect.defineMetadata("mediator:handles", list, target.constructor);
  };
}

/**
 * Fonksiyonları handler’a çevirmek için helper (dekoratör kullanmak istemeyenler için).
 *  Usage:
 *    export const getUserHandler = asHandler("GetUser", "request", async (req, ctx)=>{...});
 */
export function asHandler(key: string, kind: "request" | "notification", fn: (payload: any, ctx: any) => Promise<any>): HandlerRef {
  return { kind: "callable", fn: async (p, ctx) => fn(p, ctx) };
}

/** İsteğe bağlı: class decorator ek key override (şimdilik basit tutuyoruz) */
export const REQUEST = (name: string) => token<any>(`req:${name}`);
export const NOTIF = (name: string) => token<any>(`evt:${name}`);

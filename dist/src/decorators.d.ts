import "reflect-metadata";
import type { HandlerRef } from "./types";
/** Opsiyonel: sınıflara/handler’lara anahtar atamak için */
export declare function RequestKey(key: string): (target: any) => void;
export declare function NotificationKey(key: string): (target: any) => void;
/**
 * @Handle — sınıf METODLARINI handler'a çevirir.
 *  Usage:
 *   class X {
 *     @Handle({ key: "GetUser", kind: "request" })
 *     async getUser(req: GetUser, ctx: PipelineContext) { ... }
 *   }
 */
export declare function Handle(opts: {
    key: string;
    kind: "request" | "notification";
}): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
/**
 * Fonksiyonları handler’a çevirmek için helper (dekoratör kullanmak istemeyenler için).
 *  Usage:
 *    export const getUserHandler = asHandler("GetUser", "request", async (req, ctx)=>{...});
 */
export declare function asHandler(key: string, kind: "request" | "notification", fn: (payload: any, ctx: any) => Promise<any>): HandlerRef;
/** İsteğe bağlı: class decorator ek key override (şimdilik basit tutuyoruz) */
export declare const REQUEST: (name: string) => import("bun-ioc").Token<any>;
export declare const NOTIF: (name: string) => import("bun-ioc").Token<any>;

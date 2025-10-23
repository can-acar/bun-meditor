bun-meditor, Bun için hafif bir Mediator kütüphanesidir. Request/Response (send) ve Publish/Subscribe (publish) desenlerini; IoC (bun-ioc), davranış (pipeline) katmanı, iptal/timeout (bun-cancellation-token) ve dekoratör desteğiyle bir araya getirir.

Öne çıkanlar:
- Send ve Publish akışları
- IoC ile token tabanlı veya callable handler kaydı
- Sıralanabilir pipeline davranışları: Logging, Retry, Timeout
- Cancellation/Timeout desteği ve üst düzeyden propagation
- `@Handle` dekoratörü ve `scanHandles()` ile otomatik kayıt
- Basit metrik arayüzü (MetricsSink)
- TypeScript ve Bun uyumlu

Hızlı başlamak için `examples/` klasörüne göz atın: basic, behaviors, decorators, serve ve serve-decorators örnekleri hazırdır.

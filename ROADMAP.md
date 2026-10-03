# Ticketing Platform — Yol Haritası

Çok satıcılı etkinlik biletleme platformu: organizatörler etkinlik ve koltuk haritası yönetir, alıcılar public siteden bilet alır, ödeme ve teslimat arka planda işlenir.

## Yatay kurallar (her dilimde geçerli)

- **Test yatay disiplin.** Entegrasyon testleri gerçek Postgres/Redis'e karşı koşar (docker compose); her kırma deneyi bitince kalıcı bir teste dönüşür (tenant sızma paketi, fazla satış kanıtı). Piramit değil trofi: az unit, çok entegrasyon, kritik akışlarda birkaç Playwright.
- **Hazır UI bileşen kütüphanesi yok.** Public site ve dashboard'un temel katmanı (token'lar, layout, form, dialog, menü) kendi yazımız: Grid, container query, `@layer`, `:has()`, native `<dialog>`/popover. Erişilebilirlik için headless primitif (örn. React Aria) dashboard diliminde karar notuyla değerlendirilir.
- **Her dilim bir lab notu bırakır** (`labs/`): ne kırdık, önce/sonra ölçüm, ne öğrendik. `docs/` karar notları için, `labs/` kanıt için. İkisi de düz markdown, alt klasör yok.

## Ürün yüzeyleri

| Yüzey                     | Kim kullanır           | Render stratejisi                                   | Neden bu strateji                                         |
| ------------------------- | ---------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| **Public site**           | Bilet alan herkes      | SSR / streaming / ISR (Next.js)                     | SEO ve paylaşım önizlemesi şart, LCP kritik               |
| **Organizer dashboard**   | Etkinlik sahipleri     | Saf CSR SPA (Vite + React)                          | Oturumlu, ağır etkileşimli; SSR sadece maliyet            |
| **Seat map editor**       | Organizatör            | Dashboard içinde, DOM/canvas kararı dilimde verilir | 10k+ koltuk; render maliyeti belirleyici                  |
| **API**                   | Üç yüzey + webhook'lar | Fastify, OpenAPI sözleşmesi                         | Şema tabanlı doğrulama ve serileştirme                    |
| **Workers**               | Sistem                 | Kuyruk tüketicileri                                 | PDF bilet, e-posta, mutabakat                             |
| **Mock payment provider** | Sistem                 | Ayrı küçük servis                                   | Webhook, imza, replay, kesinti senaryolarını biz üretiriz |

## Teknoloji seçimi (gerekçeli)

| Alan                   | Seçim                                                    | Gerekçe                                                                        |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Runtime                | Node 24 LTS, TypeScript strict                           | `using`, `node:test`, yerleşik fetch; tip kaynaklı hataları derlemede yakalama |
| Monorepo               | pnpm workspaces                                          | Paket sınırları, catalog ile tek sürüm kaynağı                                 |
| API                    | Fastify                                                  | Şema doğrulama + serileştirme hızlandırması, plugin encapsulation              |
| Veritabanı             | PostgreSQL 18                                            | Transaction ve kilit semantiği, `uuidv7()`, tek doğruluk kaynağı               |
| Veri erişimi           | Drizzle + gerekince raw SQL                              | Üretilen SQL okunur; migration'lar elle gözden geçirilir, expand/contract      |
| Cache / kilit / kuyruk | Redis                                                    | Rate limiter, hold TTL, pub/sub                                                |
| Kuyruk                 | Önce PG `SKIP LOCKED` ile kendi kuyruğumuz, sonra BullMQ | Önce içini görmek, sonra hazırını kullanmak                                    |
| Public site            | Next.js (App Router)                                     | Render stratejileri, RSC sınırı, streaming, CWV                                |
| Dashboard              | Vite + React 19 + React Router + TanStack Query          | Sunucu state'i önbellekte, UI state'i bileşende                                |
| Sözleşme               | zod şemaları → OpenAPI 3.1 → tip üretimi                 | Contract-first; istemci cevapları çalışma zamanında doğrular                   |
| Gözlemlenebilirlik     | OpenTelemetry, Prometheus, Grafana, Loki, Sentry         | Trace, metrik, log ve hata tek zincirde                                        |
| Test                   | node:test / Vitest, Playwright, k6, autocannon           | Entegrasyon ağırlıklı, yük testi dahil                                         |
| Yerel altyapı          | docker compose                                           | Tek komutla Postgres + Redis                                                   |

Bunlar öneri; dilime geldiğimizde alternatifi tartışıp değiştirebiliriz. Değişiklik `docs/` altına karar notu olur.

## Dilimler

Sıra öncelik değil **bağımlılık** sırası: veri ve HTTP katmanı oturmadan arayüz derinliğine girilmez.

### 0 · İskelet ve zemin

Monorepo, docker compose (Postgres, Redis), TS strict, lint, ilk CI.

- Kırma: CJS/ESM çift paket tuzağını bilerek üret; `pnpm why` ile transitive şişmeyi oku

### 1 · Domain ve şema

Organizer, venue, event, seat, ticket type, order, payment. UUIDv7, kısıtlar, migration disiplini, 1M+ satırlık seed.
Order ve ticket durum makineleri `packages/contracts` içinde ayırt edici birleşimlerle modellenir; DB'deki CHECK kısıtı ile
TS tipi aynı geçiş tablosundan türer ("imkânsız durum temsil edilemez").

- Kırma: bir kolonu tek adımda yeniden adlandır, kesintiyi gör; sonra expand → migrate → contract ile yap.
  Tip tarafında: geçersiz bir durum geçişini derleyicinin reddettiğini, DB'nin de aynı geçişi CHECK ile reddettiğini göster

### 2 · HTTP katmanı ve sözleşme

Fastify, zod → OpenAPI, RFC 9457 hata gövdesi, request id, pino, graceful shutdown, ETag.
Test altyapısı burada kurulur: `fastify.inject` ile HTTP testi, gerçek Postgres'e karşı entegrasyon testleri, OpenAPI şemasına karşı yanıt doğrulama.

- Kırma: yük altında `SIGTERM` gönder, düşen isteği say; sonra drain ile sıfırla

### 3 · Public site

Etkinlik listesi ve detay: streaming SSR, ISR, görsel performansı, metadata, JSON-LD, CWV ölçümü.
CSS'i sıfırdan: design token'lar custom property olarak, `@layer` ile kaskad sırası, Grid + container query ile kart ızgarası,
`clamp()` ile akışkan tipografi. UI kütüphanesi yok (bkz. yatay kurallar).

- Kırma: boyutsuz görsel ve render-blocking script ile CLS/LCP'yi bilerek bozup trace ile bul

### 4 · Kimlik ve çok kiracılılık

argon2id, oturum vs JWT kararı, organizer tenant'ları, RBAC, sahiplik koşulunu veri erişim katmanına gömme.
Delegasyon: organizatör için **"Google ile giriş"** (OIDC, authorization code + PKCE, `state`/`nonce`, JWKS ile anahtar döndürme)
ve dış entegrasyonlar için **partner API** (client credentials, scope daraltma, API anahtarı yönetimi). İkisi de gerçek
sağlayıcıya bağlanmadan önce kendi mini authorization server'ımızla çalıştırılır.

- Kırma: yanlış tenant'a sızmayı deneyen otomatik test paketi; ilk sürümde sızsın, sonra kapansın.
  OIDC'de `state` kontrolünü kaldırıp CSRF ile hesap bağlama saldırısını kendimize yapalım, sonra kapatalım

### 5 · Organizer dashboard

Routing ve URL state, TanStack Query (staleTime/gcTime, iyimser güncelleme, seçici invalidation), formlar, keyset sayfalı tablolar, design system temeli, erişilebilir modal/menü.
Design system public site'ın token katmanı üzerine kurulur: `<dialog>`, popover ve anchor positioning ile menü/tooltip; klavye ve
ekran okuyucu ile eksiksiz çalışan modal, menü, combobox. Headless primitif kararı burada karar notu olur.

- Kırma: index key, bayat closure, gereksiz rerender'ı React Profiler ile yakala

### 6 · Seat map editor

10k koltuk: DOM mı canvas mı, layout thrashing, compositing, long task ve yielding, Web Worker, `useTransition` / `useDeferredValue`.

- Kırma: 50ms üstü task üret, performance trace'te göster, `scheduler.yield` ile böl

### 7 · Rezervasyon ve eşzamanlılık

Koltuk hold, izolasyon seviyeleri, lost update ve write skew canlı gösterimi, `FOR UPDATE SKIP LOCKED`, iyimser version, Redis hold TTL, deadlock.

- Kırma: 100 koltuğa 500 eşzamanlı alıcı; her izolasyon seviyesinde fazla satış var mı kanıtla

### 8 · Ödeme ve webhook

Checkout, uçtan uca idempotency key, mock payment provider, HMAC imzalı giden/gelen webhook, retry + jitter, mutabakat işi.

- Kırma: webhook'u replay et, çift tıkla, sağlayıcıyı 30 sn askıda bırak

### 9 · Kuyruk ve arka plan işleri

Önce PG üstünde kendi kuyruğumuz, sonra BullMQ. PDF bilet, e-posta, transactional outbox, idempotent tüketici, DLQ, stream ile CSV export.

- Kırma: worker'ı iş ortasında öldür, mesaj kaybolmadı mı; backpressure'ı kır, bellek grafiğini izle

### 10 · Gerçek zamanlı doluluk

SSE vs WebSocket kararı, Redis pub/sub, yeniden bağlanma ve backfill, 3 replika.

- Kırma: bağlantılar açıkken deploy et, kaçan mesajı telafi et

### 11 · Gözlemlenebilirlik

OTel trace HTTP → DB → kuyruk, Prometheus metrikleri, Grafana, Loki, SLO ve burn-rate uyarısı, runbook. Frontend'de web-vitals RUM ve Sentry.

- Kırma: bir bağımlılığa gecikme enjekte et, trace ile 10 dakikada bul

### 12 · Flash satış

k6 yük testi, CPU flame ve heap snapshot, event loop gecikmesi, HTTP + Redis cache ve stampede, Redis + Lua rate limiter, load shedding, pool boyutu, PgBouncer, indeks laboratuvarı (`EXPLAIN ANALYZE`), circuit breaker ve timeout.

- Kırma: her şeyi. Her düzeltme öncesi ve sonrası p99 kaydı

### 13 · Teslimat

Multi-stage Dockerfile, CI/CD, deploy içinde migration sırası, sıfır kesinti, PITR yedek tatbikatı.

- Kırma: yedekten geri dön; test edilmemiş yedek yedek değildir

### 14 · Anlatı

Karar notlarını topla, sistemi 45 dakikada anlat, bir postmortem yaz, mimari gözden geçir.

## Bilerek dışarıda bırakılanlar

Kubernetes, DDD, CQRS/Event Sourcing, GraphQL, gRPC, micro-frontend, egzotik tip programlama. İhtiyaç doğarsa karar notuyla alınır.

# Ticketing Platform — Yol Haritası

Çok satıcılı etkinlik biletleme platformu. Amaç iki katlı: elimizde gerçek bir ürün olsun ve
[Frontend Ustalık Haritası](https://claude.ai/code/artifact/7b6a0056-d33e-4e51-94f0-b93d999c8b9e) ile
[Backend Derinlik Haritası](https://claude.ai/code/artifact/1c6fdfb9-e1c5-4dd2-9503-a96723ecc397)'ndaki
**Kritik / Çekirdek** konuları bu ürünün içinde, kırılma noktasına kadar zorlayarak öğrenelim.

## Çalışma biçimi

Sınav yok, kapı yok. Her dilimde:

1. Ne inşa ettiğimizi, haritanın hangi konusuna dokunduğunu ve sektörde neden önemli olduğunu anlatırım.
2. Yapılacakları somut adımlar hâlinde veririm; sen yazarsın, birlikte bakarız.
3. Ölçeriz, bilerek kırarız, düzeltiriz. Kararı kısa bir notla `docs/` altına düşeriz.
4. "Anladım" dediğinde devam. Anlaşılmadıysa üzerine konuşuruz.

Haritalardaki "kendini test et" soruları istersen sohbet konusu olur, asla eşik değil.

## Yatay kurallar (her dilimde geçerli)

- **Test, dilim 2'den itibaren yatay disiplin.** Haritaların ikisinde de Kritik olan test stratejisi ayrı dilim değil,
  her dilimin parçası: entegrasyon testleri gerçek Postgres/Redis'e karşı koşar (docker compose), her "kırma deneyi"
  bitince kalıcı bir teste dönüşür (örn. dilim 4'ün tenant sızma paketi, dilim 7'nin fazla satış kanıtı).
  Piramit değil trofi: az unit, çok entegrasyon, kritik akışlarda birkaç Playwright. Konular: BE 07.1, 07.2, 07.4 · FE K5 test stratejisi.
- **Hazır UI bileşen kütüphanesi yok.** Public site ve dashboard'un temel katmanını (token'lar, layout, form, dialog, menü)
  kendimiz yazıyoruz; Grid, container query, `@layer`, `:has()`, native `<dialog>`/popover. Aksi hâlde FE K1'in Kritik CSS ve
  layout konuları hiç açılmaz. Erişilebilirlik için headless primitif (örn. React Aria) dilim 5'te karar notuyla tartışılır.
- **Her dilim bir lab notu bırakır** (`labs/`): ne kırdık, önce/sonra ölçüm, ne öğrendik. Blog'a dönüşebilir formatta.
  `docs/` karar ve teori notları için, `labs/` kanıt için. İkisi de düz markdown, alt klasör yok.
- **Kritik parçalarda kodu sen yazarsın.** Ben yönlendirir, inceler, alternatifi gösteririm.

## Ürün yüzeyleri

| Yüzey                     | Kim kullanır           | Render stratejisi                                   | Neden bu strateji                                         |
| ------------------------- | ---------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| **Public site**           | Bilet alan herkes      | SSR / streaming / ISR (Next.js)                     | SEO ve paylaşım önizlemesi şart, LCP kritik               |
| **Organizer dashboard**   | Etkinlik sahipleri     | Saf CSR SPA (Vite + React)                          | Oturumlu, ağır etkileşimli; SSR sadece maliyet            |
| **Seat map editor**       | Organizatör            | Dashboard içinde, DOM/canvas kararı dilimde verilir | 10k+ koltuk; render pipeline laboratuvarı                 |
| **API**                   | Üç yüzey + webhook'lar | Fastify, OpenAPI sözleşmesi                         | Şema tabanlı doğrulama ve serileştirme                    |
| **Workers**               | Sistem                 | Kuyruk tüketicileri                                 | PDF bilet, e-posta, mutabakat                             |
| **Mock payment provider** | Sistem                 | Ayrı küçük servis                                   | Webhook, imza, replay, kesinti senaryolarını biz üretiriz |

## Teknoloji seçimi (gerekçeli)

| Alan                   | Seçim                                                                 | Gerekçe                                                                              |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Runtime                | Node 24 LTS, TypeScript strict                                        | Haritanın 01 katmanı; `using`, `node:test`, yerleşik fetch                           |
| Monorepo               | pnpm workspaces                                                       | 01.5 modül/araç zinciri; paket sınırlarını öğrenmek                                  |
| API                    | Fastify                                                               | 03.8: şema doğrulama + serileştirme hızlandırması, plugin encapsulation              |
| Veritabanı             | PostgreSQL 18                                                         | 02 katmanının tamamı                                                                 |
| Veri erişimi           | Drizzle + gerekince raw SQL                                           | Üretilen SQL'i okuma alışkanlığı; migration'ları elle yazıp expand/contract öğrenmek |
| Cache / kilit / kuyruk | Redis                                                                 | 02.7, rate limiter (Ek D lab 2), hold TTL                                            |
| Kuyruk                 | Önce PG `SKIP LOCKED` ile kendi kuyruğumuz (Ek D lab 3), sonra BullMQ | Önce içini görmek, sonra hazırını kullanmak                                          |
| Public site            | Next.js (App Router)                                                  | Render stratejileri, RSC sınırı, streaming, CWV                                      |
| Dashboard              | Vite + React 19 + React Router + TanStack Query                       | K4 "1 numara" TanStack Query, saf istemci state modeli                               |
| Sözleşme               | zod şemaları → OpenAPI 3.1 → tip üretimi                              | 03.3 contract-first; frontend "tip sınırında güvenlik"                               |
| Gözlemlenebilirlik     | OpenTelemetry, Prometheus, Grafana, Loki, Sentry                      | 08 katmanı; FE K5 gözlemlenebilirlik                                                 |
| Test                   | node:test / Vitest, Playwright, k6, autocannon                        | 07 katmanı; FE K5 test stratejisi                                                    |
| Yerel altyapı          | docker compose                                                        | 10.1                                                                                 |

Bunlar öneri; dilime geldiğimizde alternatifi tartışıp değiştirebiliriz. Değişiklik `docs/` altına karar notu olur.

## Dilimler

Sıra öncelik değil **bağımlılık** sırası: veri ve HTTP katmanı oturmadan React derinliğine girmiyoruz,
ama 3. dilimde görünür bir ürün olsun diye public site erken geliyor.

Her dilimde: **Konular** (FE = Frontend haritası katman/konu, BE = Backend haritası küme) ve **Kırma deneyi**.

### 0 · İskelet ve zemin

Monorepo, docker compose (Postgres, Redis), TS strict, lint, ilk CI.

- Konular: BE 01.5 modül/araç zinciri, 10.1 Docker, 10.3 CI/CD (temel) · FE K6 build ve toolchain
- Kırma: CJS/ESM çift paket tuzağını bilerek üret; `pnpm why` ile transitive şişmeyi oku

### 1 · Domain ve şema

Organizer, venue, event, seat, ticket type, order, payment. UUIDv7, kısıtlar, migration disiplini, 1M+ satırlık seed.
Order ve ticket durum makineleri `packages/contracts` içinde ayırt edici birleşimlerle modellenir; DB'deki CHECK kısıtı ile
TS tipi aynı geçiş tablosundan türer ("imkânsız durum temsil edilemez").

- Konular: BE 02.1 ilişkisel modelleme, 02.2 SQL, 02.6 şema göçü · BE 00.5 para ve zaman (float yok, UTC) · BE 01.6 / FE K2 TypeScript: union + narrowing ile durum modelleme
- Kırma: bir kolonu tek adımda yeniden adlandır, kesintiyi gör; sonra expand → migrate → contract ile yap.
  Tip tarafında: geçersiz bir durum geçişini derleyicinin reddettiğini, DB'nin de aynı geçişi CHECK ile reddettiğini göster

### 2 · HTTP katmanı ve sözleşme

Fastify, zod → OpenAPI, RFC 9457 hata gövdesi, request id (AsyncLocalStorage), pino, graceful shutdown, ETag.
Test altyapısı burada kurulur: `fastify.inject` ile HTTP testi, gerçek Postgres'e karşı transaction-rollback izolasyonlu
entegrasyon testleri, OpenAPI şemasına karşı yanıt doğrulama.

- Konular: BE 03.1 HTTP, 03.2 REST, 03.3 sözleşme, 03.8 framework, 01.7 hata ve yaşam döngüsü, 08.1 loglama, **07.1–07.2 test** · FE K1 ağ ve HTTP, caching semantiği
- Kırma: yük altında `SIGTERM` gönder, düşen isteği say; sonra drain ile sıfırla

### 3 · Public site

Etkinlik listesi ve detay: streaming SSR, ISR, görsel performansı, metadata, JSON-LD, CWV ölçümü.
CSS'i sıfırdan: design token'lar custom property olarak, `@layer` ile kaskad sırası, Grid + container query ile kart ızgarası,
`clamp()` ile akışkan tipografi. UI kütüphanesi yok (bkz. yatay kurallar).

- Konular: FE K1 render pipeline, HTML semantiği, **CSS çekirdek modeli, Layout**, render stratejileri · K3 RSC sınırı · K5 Core Web Vitals, yükleme performansı · BE 03.1 cache başlıkları
- Kırma: boyutsuz görsel ve render-blocking script ile CLS/LCP'yi bilerek bozup trace ile bul

### 4 · Kimlik ve çok kiracılılık

argon2id, oturum vs JWT kararı, refresh rotation, organizer tenant'ları, RBAC, sahiplik koşulunu veri erişim katmanına gömme.
Delegasyon: organizatör için **"Google ile giriş"** (OIDC, authorization code + PKCE, `state`/`nonce`, JWKS ile anahtar döndürme)
ve dış entegrasyonlar için **partner API** (client credentials, scope daraltma, API anahtarı yönetimi). İkisini de gerçek
sağlayıcıya bağlamadan önce kendi mini authorization server'ımızla çalıştırıp akışın içini görürüz.

- Konular: BE 04.1 authN, 04.2 authZ, **04.3 delegasyon protokolleri**, 04.6 sertleştirme · FE K5 frontend güvenliği (token nerede durur, CSRF, CSP)
- Kırma: yanlış tenant'a sızmayı deneyen otomatik test paketi; ilk sürümde sızsın, sonra kapansın.
  OIDC'de `state` kontrolünü kaldırıp CSRF ile hesap bağlama saldırısını kendimize yapalım, sonra kapatalım

### 5 · Organizer dashboard

Routing ve URL state, TanStack Query (staleTime/gcTime, iyimser güncelleme, seçici invalidation), formlar, keyset sayfalı tablolar, design system temeli, erişilebilir modal/menü.
Design system dilim 3'ün token katmanı üzerine kurulur: `<dialog>`, popover ve anchor positioning ile menü/tooltip; klavye ve
ekran okuyucu ile eksiksiz çalışan modal, menü, combobox. Headless primitif kararı burada karar notu olur.

- Konular: FE K4 TanStack Query, routing, formlar, design system, state'i doğru yere koymak · K3 render modeli, hook'lar · K1 2026 CSS (`:has()`, anchor, view transitions) · K5 erişilebilirlik · BE 03.2 cursor sayfalama
- Kırma: index key, bayat closure, gereksiz rerender'ı React Profiler ile yakala

### 6 · Seat map editor

10k koltuk: DOM mı canvas mı, layout thrashing, compositing, long task ve yielding, Web Worker, `useTransition` / `useDeferredValue`.

- Konular: FE K1 render pipeline, event loop, tarayıcı API'leri · K3 Concurrent React, performans mühendisliği · K2 asenkron
- Kırma: 50ms üstü task üret, performance trace'te göster, `scheduler.yield` ile böl

### 7 · Rezervasyon ve eşzamanlılık

Koltuk hold, izolasyon seviyeleri, lost update ve write skew canlı gösterimi, `FOR UPDATE SKIP LOCKED`, iyimser version, Redis hold TTL, deadlock.

- Konular: BE 02.4 transaction, 02.7 Redis, 06.5 dağıtık eşzamanlılık
- Kırma: 100 koltuğa 500 eşzamanlı alıcı; her izolasyon seviyesinde fazla satış var mı kanıtla

### 8 · Ödeme ve webhook

Checkout, uçtan uca idempotency key, mock payment provider, HMAC imzalı giden/gelen webhook, retry + jitter, mutabakat işi.

- Konular: BE 03.2 idempotency, 03.7 entegrasyon ve webhook, 06.2 teslim garantileri · FE K4 formlar, K5 a11y (checkout)
- Kırma: webhook'u replay et, çift tıkla, sağlayıcıyı 30 sn askıda bırak

### 9 · Kuyruk ve arka plan işleri

Önce PG üstünde kendi kuyruğumuz, sonra BullMQ. PDF bilet, e-posta, transactional outbox, idempotent tüketici, DLQ, stream ile CSV export.

- Konular: BE 06.1 mesaj altyapısı, 06.2 doğruluk, 06.3 outbox/saga, 01.4 stream ve backpressure
- Kırma: worker'ı iş ortasında öldür, mesaj kaybolmadı mı; backpressure'ı kır, bellek grafiğini izle

### 10 · Gerçek zamanlı doluluk

SSE vs WebSocket kararı, Redis pub/sub, yeniden bağlanma ve backfill, 3 replika.

- Konular: BE 03.6 gerçek zamanlı · FE K1 tarayıcı API'leri (SSE/WS, backoff, BroadcastChannel)
- Kırma: bağlantılar açıkken deploy et, kaçan mesajı telafi et

### 11 · Gözlemlenebilirlik

OTel trace HTTP → DB → kuyruk, Prometheus metrikleri, Grafana, Loki, SLO ve burn-rate uyarısı, runbook. Frontend'de web-vitals RUM ve Sentry.

- Konular: BE 08 katmanının tamamı · FE K5 gözlemlenebilirlik
- Kırma: bir bağımlılığa gecikme enjekte et, trace ile 10 dakikada bul

### 12 · Flash satış

k6 yük testi, CPU flame ve heap snapshot, event loop gecikmesi, HTTP + Redis cache ve stampede, Redis + Lua rate limiter, load shedding, pool boyutu, PgBouncer, indeks laboratuvarı (`EXPLAIN ANALYZE`), circuit breaker ve timeout.

- Konular: BE 09 katmanının tamamı, 02.3 indeks, 02.5 PG operasyonu, 01.8 profil, 06.4 dayanıklılık · FE K5 yükleme performansı
- Kırma: her şeyi. Her düzeltme öncesi ve sonrası p99 kaydı

### 13 · Teslimat

Multi-stage Dockerfile, CI/CD, deploy içinde migration sırası, sıfır kesinti, PITR yedek tatbikatı.

- Konular: BE 10.1, 10.3, 02.11 · FE K6 CI/CD
- Kırma: yedekten geri dön; test edilmemiş yedek yedek değildir

### 14 · Anlatı ve yargı

Karar notlarını topla, sistemi 45 dakikada anlat, bir postmortem yaz, mimari gözden geçir.

- Konular: FE K6 frontend system design, teknik liderlik · BE 05 mimari, 11 meslek pratiği

## İki mercek: derinlik ve modül

Her adımın başında iki soru sorulur.

**Derin mi, hızlı mı?** Sektörün gerçekten sorduğu yerde kır, ölç, not yaz; sormadığı yerde asgari ve yeterli olanı yap, geç.

| Derin                                                                                                                                                                                                                             | Orta                                           | Hızlı                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 4 kimlik ve tenant izolasyonu · 7 eşzamanlılık · 8 idempotency ve webhook · 9 kuyruk ve outbox · 11 gözlemlenebilirlik · 12 performans · 5 TanStack Query ve React performansı · 6 render pipeline · 3 render stratejileri ve CWV | 10 gerçek zamanlı · 13 teslimat · 2'nin kalanı | OpenAPI ve Swagger · ETag · seed ayrıntıları · PDF ve e-posta şablonları · dashboard CRUD · design system cilası · i18n |

**Ayrı modül olur mu?** Zorlu, alt seviye parçalar ürün kalitesinde sınırlarla `packages/` altında yazılır; ürün onları gerçekten kullandıktan sonra ayrı repo ve npm paketi olarak çıkarılır. Erken genelleme yok: önce bu ürünün ihtiyacı, sonra soyutlama.

Adaylar, güçlüden zayıfa:

1. Mock payment provider, kaos enjeksiyonlu (gecikme, çift webhook, bozuk imza) · dilim 8
2. Webhook araç seti: HMAC imza ve doğrulama, timestamp ve replay koruması, retry ve backoff, DLQ · dilim 8
3. Idempotency-Key Fastify plugin'i: saklama, yanıt tekrarı, eşzamanlı çakışma · dilim 8
4. Envanter hold motoru: TTL ile birim tutma, Redis + PG · dilim 7
5. PG üstünde iş kuyruğu ve outbox (`SKIP LOCKED`, görünürlük zaman aşımı, DLQ) · dilim 9
6. Canvas seat-map renderer, React bileşeni · dilim 6
7. Redis + Lua rate limiter (rakibi çok, lab olarak kalabilir) · dilim 12

Aday paketlerin kuralı: api'ye bağımlı değil, kendi testi var, README "nasıl kurulur" diye başlar.

## Bilerek dışarıda bırakılanlar

Kubernetes, DDD, CQRS/Event Sourcing, GraphQL, gRPC, micro-frontend, egzotik tip programlama.
Haritalar da bunları "gerekince öğren" diyor. İhtiyaç doğarsa karar notuyla alırız.

## Ayrı teori isteyenler

Veri yapıları, işletim sistemi, ağ zemini, tarayıcı render pipeline'ı. Bunlar dilimlerde "neden böyle oldu"
sorusuyla bağlanır; ilgili dilime gelince kısa teori notu yazarız (`docs/`), bootcamp modül formatıyla:
kavram → Node/V8 veya tarayıcı gerçeği → uygulama → projeye bağlantı.

## İlerleme

| Dilim              | Durum      | Not                                                                                                                                                                                                 |
| ------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 · İskelet        | ✅         | `labs/00-esm-cjs.md`                                                                                                                                                                                |
| 1 · Domain ve şema | 🔄 artımlı | Karar: şema özellik geldikçe büyüyor. Kimlik tabloları ve migration altyapısı hazır (`docs/schema.md`); mekân/etkinlik/koltuk tabloları ve kolon-yeniden-adlandırma deneyi ilgili özellikle gelecek |
| 2 · HTTP katmanı   | ✅         | Fastify, zod sözleşmesi, RFC 9457, pino + redaction + request id, graceful shutdown (`labs/02-graceful-shutdown.md`), OpenAPI, ETag. AsyncLocalStorage bağlamı dilim 11'e ertelendi                 |

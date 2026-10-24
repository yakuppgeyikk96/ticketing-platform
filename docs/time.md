# Time

Rules: the database stores instants (`timestamptz`, UTC). The API accepts and returns ISO 8601 strings; on the way in they must carry an offset (`+03:00` or `Z`). Every venue has an IANA time zone, and an occurrence's clock is its venue's clock.

## Wall time versus instant

`<input type="datetime-local">` yields a wall time such as `2026-12-01T20:00`: a reading on some clock, with no zone. `new Date(wall)` interprets it in the browser's zone, so an admin in London entering 20:00 for an Istanbul show would store 20:00Z, three hours late, and nobody would get an error. The dashboard therefore never calls `new Date` on a wall time; it calls `toInstant(wall, venue.timezone)` from `apps/dashboard/src/lib/time.ts`.

Browsers have no built-in API for wall time → instant in a named zone; `Intl.DateTimeFormat` only goes the other way. `toInstant` guesses an instant (the wall time read as UTC), asks `Intl` where that instant lands on the zone's wall, and shifts by the difference, twice, so a correction that crosses a DST boundary is itself corrected. `formatToParts` with `hourCycle: "h23"` gives the wall reading as numbers. This is the same technique date-fns-tz uses in `fromZonedTime`; moment-timezone predates `Intl` and ships its own zone tables instead.

Why no library: Temporal (`ZonedDateTime.from("2026-12-01T20:00[Europe/Istanbul]").toInstant()`) is the standard answer but is not in every browser yet and its polyfill is about 200 kB; Luxon is about 70 kB; date-fns-tz is small but we needed one function. Sixty tested lines won. When Temporal is available everywhere, `toInstant` becomes one line with the same signature.

Display goes the other way and needs no trick: `Intl.DateTimeFormat("tr-TR", { timeZone: venue.timezone })` renders an instant on the venue's wall. The locale (how it is written) and the zone (what the clock says) are independent choices; the locale is fixed to Turkish for now, the zone is always the venue's.

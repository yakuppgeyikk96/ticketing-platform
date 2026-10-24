// Wall time ("2026-12-01T20:00", what <input type="datetime-local"> gives)
// to an instant in a given IANA zone. The browser has no direct API for this
// direction: Intl.DateTimeFormat only goes instant → wall time. So we guess an
// instant, measure where it lands in the zone, and shift by the difference.

// Step 1 of 3: read a wall time string as if it were UTC. The result is not
// the real instant; it is a number we can subtract from another such number.
function wallToUtcMillis(wallTime: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    wallTime,
  );
  if (!match) throw new Error(`not a wall time: ${wallTime}`);
  const [, y, mo, d, h, mi, s = "0"] = match;
  return Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, +s);
}

// Step 2 of 3: where does this instant land on the wall in `timeZone`?
// Returned in the same "as if UTC" number space as wallToUtcMillis.
function instantToWallMillis(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23", // never "24" at midnight
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  return Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
}

// Step 3 of 3: guess, measure, correct.
export function toInstant(wallTime: string, timeZone: string): string {
  const wanted = wallToUtcMillis(wallTime);

  // Guess: pretend the wall time is UTC. Off by the zone's offset.
  let guess = wanted;

  // Two rounds cover the case where the first correction crosses a DST
  // boundary and the offset changes under us.
  for (let i = 0; i < 2; i++) {
    const landed = instantToWallMillis(guess, timeZone);
    const error = landed - wanted;
    if (error === 0) break;
    guess -= error;
  }

  return new Date(guess).toISOString();
}

// The other direction, for filling a datetime-local input from a stored
// instant: "2026-12-01T20:00" in the zone, no seconds.
export function toWallTime(instant: string, timeZone: string): string {
  const millis = instantToWallMillis(new Date(instant).getTime(), timeZone);
  return new Date(millis).toISOString().slice(0, 16);
}

import { describe, expect, it } from "vitest";
import { toInstant, toWallTime } from "./time.ts";

// None of these depend on the machine's zone: that is the whole point.
describe("toInstant", () => {
  it("Istanbul is UTC+3 all year", () => {
    expect(toInstant("2026-12-01T20:00", "Europe/Istanbul")).toBe(
      "2026-12-01T17:00:00.000Z",
    );
    expect(toInstant("2026-07-01T20:00", "Europe/Istanbul")).toBe(
      "2026-07-01T17:00:00.000Z",
    );
  });

  it("London is UTC in winter and UTC+1 in summer", () => {
    expect(toInstant("2026-12-01T20:00", "Europe/London")).toBe(
      "2026-12-01T20:00:00.000Z",
    );
    expect(toInstant("2026-07-01T20:00", "Europe/London")).toBe(
      "2026-07-01T19:00:00.000Z",
    );
  });

  it("works west of Greenwich", () => {
    expect(toInstant("2026-12-01T20:00", "America/New_York")).toBe(
      "2026-12-02T01:00:00.000Z",
    );
  });

  it("handles the hour right after a DST switch", () => {
    // Berlin leaves summer time on 2026-10-25 at 03:00 (clocks go back to 02:00).
    // 04:00 that morning is firmly in winter time, UTC+1.
    expect(toInstant("2026-10-25T04:00", "Europe/Berlin")).toBe(
      "2026-10-25T03:00:00.000Z",
    );
    // The evening before is still summer time, UTC+2.
    expect(toInstant("2026-10-24T20:00", "Europe/Berlin")).toBe(
      "2026-10-24T18:00:00.000Z",
    );
  });

  it("accepts seconds and rejects other shapes", () => {
    expect(toInstant("2026-12-01T20:00:30", "Europe/Istanbul")).toBe(
      "2026-12-01T17:00:30.000Z",
    );
    expect(() => toInstant("2026-12-01 20:00", "Europe/Istanbul")).toThrow();
  });
});

describe("toWallTime", () => {
  it("round-trips with toInstant", () => {
    const wall = "2026-12-01T20:00";
    const instant = toInstant(wall, "Europe/Istanbul");
    expect(toWallTime(instant, "Europe/Istanbul")).toBe(wall);
    // Same instant, read on a different wall.
    expect(toWallTime(instant, "Europe/London")).toBe("2026-12-01T17:00");
  });
});

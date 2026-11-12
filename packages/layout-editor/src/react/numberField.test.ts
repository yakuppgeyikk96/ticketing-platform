import { expect, test } from "vitest";
import { parseFieldNumber } from "./numberField.ts";

test("coordinate fields accept finite negative, zero and fractional values", () => {
  expect(parseFieldNumber(" -12.5 ")).toBe(-12.5);
  expect(parseFieldNumber("0")).toBe(0);
  for (const text of ["", " ", "NaN", "Infinity", "abc"])
    expect(parseFieldNumber(text)).toBeNull();
});

test("size fields reject nonpositive and invalid values", () => {
  expect(parseFieldNumber("12.5", true)).toBe(12.5);
  for (const text of ["0", "-1", "", " ", "Infinity", "NaN", "abc"])
    expect(parseFieldNumber(text, true)).toBeNull();
});

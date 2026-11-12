import { expect, test } from "vitest";
import { parseHexColor } from "./colorField.ts";

test("hex fields trim whitespace and normalize case", () => {
  expect(parseHexColor(" #Aa00FF ")).toBe("#aa00ff");
  expect(parseHexColor("#000000")).toBe("#000000");
});

test("hex fields reject invalid or executable color values", () => {
  for (const text of [
    "",
    "red",
    "#fff",
    "#12345678",
    "123456",
    "#zzzzzz",
    "url(https://example.com)",
  ]) {
    expect(parseHexColor(text)).toBeNull();
  }
});

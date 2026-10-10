import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickFreeSlug } from "./slug.ts";

describe("pickFreeSlug", () => {
  it("returns the base when nothing is taken", () => {
    assert.equal(pickFreeSlug("salon", new Set()), "salon");
  });

  it("starts numbering at 2 when the base is taken", () => {
    assert.equal(pickFreeSlug("salon", new Set(["salon"])), "salon-2");
  });

  it("skips every taken suffix in order", () => {
    const taken = new Set(["salon", "salon-2", "salon-3"]);
    assert.equal(pickFreeSlug("salon", taken), "salon-4");
  });

  it("fills a gap left by a deleted row", () => {
    const taken = new Set(["salon", "salon-3"]);
    assert.equal(pickFreeSlug("salon", taken), "salon-2");
  });

  it("ignores slugs that only share a prefix", () => {
    // "salon-eski" would match LIKE 'salon-%' in the query but is not a suffix.
    const taken = new Set(["salon-eski"]);
    assert.equal(pickFreeSlug("salon", taken), "salon");
  });
});

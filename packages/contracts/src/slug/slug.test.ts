import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./index.ts";

test("boşlukları tireye çevirir ve küçük harfe indirir", () => {
  assert.equal(slugify("Anadolu Tiyatro"), "anadolu-tiyatro");
});

test("Türkçe diakritikleri ASCII karşılığına indirger", () => {
  assert.equal(slugify("Şişli Çocuk Kulübü"), "sisli-cocuk-kulubu");
});

test("yalnızca ayraçlardan oluşan girdide boş string döner", () => {
  assert.equal(slugify(" -- "), "");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, termMaturity, isTermLocked } from "../src/lib/banking";

test("amounts use exact fixed hundredths without rounding invalid input", () => {
  assert.equal(parseAmount("12.35", "USD"), 1235);
  assert.equal(parseAmount("12.3", "GBP"), 1230);
  assert.equal(parseAmount("100", "JPY"), 10000);
  for (const value of ["1.001", "-10", "NaN", "Infinity", "1e5", "", "1,200"]) assert.equal(parseAmount(value, "USD"), null);
  assert.equal(parseAmount("1.5", "JPY"), null);
  assert.equal(parseAmount("0", "USD"), 0);
});
test("fixed terms clamp end of month without overflowing into following months", () => {
  assert.equal(termMaturity(3, new Date("2026-01-31T12:00:00Z")).toISOString(), "2026-04-30T12:00:00.000Z");
  assert.equal(isTermLocked({ type: "fixed_deposit", maturityAt: new Date(Date.now() + 100000) }), true);
  assert.equal(isTermLocked({ type: "fixed_deposit", maturityAt: new Date("2020-01-01") }), false);
  assert.equal(isTermLocked({ type: "checking", maturityAt: null }), false);
});

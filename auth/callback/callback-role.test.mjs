import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "callback page must contain its handoff script");

function runCallback(role) {
  const elements = {
    status: { textContent: "" },
    "open-app": { hidden: true, href: "" },
  };
  const replacements = [];
  const state = "s".repeat(43);
  const search = `?role=${encodeURIComponent(role)}&state=${state}&code=one-time-code`;
  const window = {
    location: {
      search,
      pathname: "/auth/callback/",
      replace(value) { replacements.push(value); },
    },
    history: { replaceState() {} },
  };
  const document = {
    getElementById(id) { return elements[id]; },
  };

  vm.runInNewContext(script, { URL, URLSearchParams, document, window });
  return { elements, replacements };
}

test("accepts the exact dashboard_switch callback role", () => {
  const result = runCallback("dashboard_switch");

  assert.equal(result.elements["open-app"].hidden, false);
  assert.equal(result.replacements.length, 1);
  assert.match(result.replacements[0], /^com\.algorise\.csg:\/\/auth-callback\?/);
  assert.match(result.replacements[0], /role=dashboard_switch/);
});

test("rejects near-match switch callback roles", () => {
  for (const role of ["dashboard-switch", "DashboardSwitch", "dashboard_switch_extra"]) {
    const result = runCallback(role);
    assert.equal(result.elements["open-app"].hidden, true);
    assert.equal(result.replacements.length, 0);
    assert.match(result.elements.status.textContent, /invalid/i);
  }
});

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "app.css"), "utf8");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

function occurrences(source, fragment) {
  return source.split(fragment).length - 1;
}

assert.equal(occurrences(html, 'id="mainUserTier"'), 1, "Static header must have one tier label.");
assert.equal(
  occurrences(html, 'id="dynamicsUserTier"'),
  1,
  "Dynamics header must have one tier label."
);
assert.equal(occurrences(html, 'id="entitlementsDialog"'), 1);
assert.match(html, /id="internalInviteCode"[^>]*type="password"[^>]*autocomplete="off"/);
assert.match(html, /PINN 求解器/);
assert.match(html, /仍在开发与验证中/);

assert.match(app, /authClient\.entitlements\(\)/);
assert.match(app, /authClient\.redeemInternal\(credential\)/);
assert.match(app, /authClient\.joinPinnWaitlist\(\)/);
assert.match(app, /state\.entitlements\?\.label/);
assert.match(app, /user\?\.role === "internal_tester"/);
assert.match(app, /Internal Tester 已启用；该身份不包含管理员权限/);
assert.match(app, /Plus 与 Pro 购买暂未开放/);
assert.doesNotMatch(
  app,
  /localStorage\.(?:setItem|getItem)\([^)]*(?:invite|credential|internal)/i,
  "Internal credentials must never be persisted in localStorage."
);
assert.doesNotMatch(app, /\.innerHTML\s*=/, "Entitlement data must use safe DOM APIs.");
assert.doesNotMatch(html, /id="(?:buy|purchase)[^"]*"/i, "No fake purchase control is allowed.");

assert.match(css, /\.main-avatar\.internal-tester-avatar/);
assert.match(css, /conic-gradient/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*internal-tester-avatar/);
assert.match(css, /\.user-tier\[data-role="internal_tester"\]/);

console.log("entitlements-ui: 20 checks passed");

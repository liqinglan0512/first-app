"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "..", "web", "app.js"), "utf8");
const maliciousProject = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "malicious-dynamics-name.json"), "utf8")
);

assert.doesNotMatch(appSource, /\.innerHTML\s*=/, "Imported names must not be rendered through innerHTML.");
assert.match(appSource, /label\.textContent = text;/);
assert.match(appSource, /option\.textContent = object\.name;/);
assert.equal(maliciousProject.objects[0].name, "<img src=x onerror=alert(1)>");

console.log("imported-text-safety: 4 checks passed");

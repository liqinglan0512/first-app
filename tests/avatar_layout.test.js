"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "web", "app.css"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "web", "app.js"), "utf8");

assert.match(app, /target\.classList\.add\("default-avatar"\)/);
assert.match(css, /\.main-avatar\s*>\s*img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
assert.match(css, /\.main-avatar\s*\{[^}]*overflow:\s*hidden;/s);

console.log("avatar-layout: 3 checks passed");

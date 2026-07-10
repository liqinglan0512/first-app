"use strict";

const assert = require("node:assert/strict");
const adapter = require("../web/project-adapter.js");

assert.equal(adapter.solverElementType({ type: "truss" }), "truss");
assert.equal(adapter.solverElementType({ type: "rigid" }), "rigid");
assert.equal(adapter.solverElementType({ type: "arc" }), "frame");
assert.deepEqual(adapter.solverElement({ type: "frame", moment_release_j: true }), {
  type: "frame",
  moment_release_i: false,
  moment_release_j: true,
});

console.log("project-adapter: 4 checks passed");

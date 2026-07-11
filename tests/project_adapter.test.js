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
assert.deepEqual(adapter.solverElement({ type: "truss", moment_release_i: true }), {
  type: "truss",
  moment_release_i: false,
  moment_release_j: false,
});
assert.deepEqual(adapter.solverElement({ type: "rigid", moment_release_j: true }), {
  type: "rigid",
  moment_release_i: false,
  moment_release_j: false,
});
assert.throws(
  () => adapter.solverElement({ type: "frame", moment_release_i: true, moment_release_j: true }),
  /双端弯矩释放/
);

console.log("project-adapter: 7 checks passed");

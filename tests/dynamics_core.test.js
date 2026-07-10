"use strict";

const assert = require("node:assert/strict");
const core = require("../web/dynamics-core.js");

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol=${tolerance})`);
}

function object(overrides = {}) {
  return {
    id: "D1",
    name: "测试质点",
    kind: "particle",
    mass: 1,
    charge: 0,
    x: 0,
    y: 0,
    vx0: 0,
    vy0: 0,
    sizeA: 0.1,
    sizeB: 0.1,
    ...overrides,
  };
}

function globalField(kind, magnitude, angle = 0, extra = {}) {
  return { id: "F1", kind, magnitude, angle, rangeType: "global", ...extra };
}

const upward = core.vectorFromAngle(5, 90);
close(upward.x, 0);
close(upward.y, 5);

const free = core.simulateScene({
  objects: [object({ x: 1, y: 2, vx0: 3, vy0: -4 })],
  fields: [],
  forces: [],
  duration: 2,
  timeStep: 0.1,
});
close(free.objectResults[0].final.x, 7);
close(free.objectResults[0].final.y, -6);

const gravity = core.simulateScene({
  objects: [object({ y: 3, vy0: 4 })],
  fields: [globalField("gravity", 10, -90)],
  forces: [],
  duration: 2,
  timeStep: 0.1,
});
close(gravity.objectResults[0].final.y, -9, 1e-10);
close(gravity.objectResults[0].final.vy, -16, 1e-10);

const electric = core.simulateScene({
  objects: [object({ mass: 4, charge: 2 })],
  fields: [globalField("electric", 10, 0)],
  forces: [],
  duration: 2,
  timeStep: 0.05,
});
close(electric.objectResults[0].final.x, 10, 1e-10);
close(electric.objectResults[0].final.vx, 10, 1e-10);

const impulse = core.simulateScene({
  objects: [object({ mass: 2 })],
  fields: [],
  forces: [{ targetId: "D1", type: "impulse", x: 0, y: 8 }],
  duration: 1,
  timeStep: 0.05,
});
close(impulse.objectResults[0].final.y, 4);
close(impulse.objectResults[0].final.vy, 4);

const continuous = core.simulateScene({
  objects: [object({ mass: 2 })],
  fields: [],
  forces: [{ targetId: "D1", type: "continuous", x: 4, y: 0, start: 0.5, duration: 1 }],
  duration: 2,
  timeStep: 0.002,
});
close(continuous.objectResults[0].final.vx, 2, 0.01);

const magneticPeriod = 2 * Math.PI;
const magnetic = core.simulateScene({
  objects: [object({ charge: 1, vx0: 1 })],
  fields: [globalField("magnetic", 1, 0, { magneticDirection: "out" })],
  forces: [],
  duration: magneticPeriod,
  timeStep: 0.002,
});
const magneticResult = magnetic.objectResults[0];
close(magneticResult.final.x, 0, 2e-8);
close(magneticResult.final.y, 0, 2e-8);
close(magneticResult.final.vx, 1, 2e-8);
close(magneticResult.final.vy, 0, 2e-8);
close(magneticResult.kineticEnergy, 0.5, 2e-10);

function magneticError(timeStep) {
  const result = core.simulateScene({
    objects: [object({ charge: 1, vx0: 1 })],
    fields: [globalField("magnetic", 1, 0, { magneticDirection: "out" })],
    forces: [],
    duration: 1,
    timeStep,
  }).objectResults[0].final;
  return Math.hypot(result.vx - Math.cos(1), result.vy + Math.sin(1));
}

const rk4Ratio = magneticError(0.2) / magneticError(0.1);
assert.ok(rk4Ratio > 8 && rk4Ratio < 24, `RK4 error ratio ${rk4Ratio} is outside the expected range`);

const boundedGravity = core.simulateScene({
  objects: [object({ x: -1, vx0: 1 })],
  fields: [
    {
      kind: "gravity",
      magnitude: 1,
      angle: -90,
      rangeType: "rectangle",
      centerX: 0,
      centerY: 0,
      width: 1,
      height: 100,
    },
  ],
  forces: [],
  duration: 2,
  timeStep: 0.002,
});
close(boundedGravity.objectResults[0].final.vy, -1, 0.01);
assert.equal(boundedGravity.diagnostics[0].code, "finite_field_potential_reference");

assert.throws(
  () =>
    core.simulateScene({
      objects: [object()],
      fields: [],
      forces: [],
      duration: 100,
      timeStep: 0.0001,
    }),
  /超过上限/
);

const sample = core.sampleAtTime(
  [
    { t: 0, x: 0 },
    { t: 0.1, x: 1 },
    { t: 0.2, x: 2 },
  ],
  0.11,
  0.1
);
assert.equal(sample.x, 1);

console.log("dynamics-core: 10 numerical checks passed");

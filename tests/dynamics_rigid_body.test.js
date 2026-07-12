"use strict";

const assert = require("node:assert/strict");
const rigid = require("../web/dynamics-rigid-body.js");

let checks = 0;

function check(callback) {
  callback();
  checks += 1;
}

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol=${tolerance})`);
}

function circle(overrides = {}) {
  return rigid.createBody({
    id: "D1",
    kind: "circle",
    mass: 2,
    sizeB: 0.5,
    x: 3,
    y: 4,
    vx0: 1,
    vy0: -2,
    theta0: 0,
    omega0: 0,
    ...overrides,
  });
}

check(() => {
  const body = circle({ theta0: Math.PI / 3, omega0: 2 });
  assert.deepEqual(body.position, { x: 3, y: 4 });
  assert.equal(body.centerOfMass, body.position);
  assert.deepEqual(body.velocity, { x: 1, y: -2 });
  close(body.angle, Math.PI / 3);
  close(body.angularVelocity, 2);
  close(body.inertia, 0.25);
  close(body.inverseInertia, 4);
});

check(() => {
  const body = circle({ vx0: 0, vy0: 0 });
  const result = rigid.applyImpulse(body, { x: 4, y: -2 });
  close(body.velocity.x, 2);
  close(body.velocity.y, -1);
  close(body.angularVelocity, 0);
  close(result.angularImpulse, 0);
});

check(() => {
  const body = circle({ vx0: 0, vy0: 0 });
  const result = rigid.applyImpulse(body, { x: 2, y: 0 }, { frame: "local", x: 0, y: 0.5 });
  close(body.velocity.x, 1);
  close(body.angularVelocity, -4);
  close(result.angularImpulse, -1);
  close(result.deltaAngularVelocity, -4);
});

check(() => {
  const body = circle({ theta0: Math.PI / 2, vx0: 0, vy0: 0 });
  const offset = rigid.applicationOffsetWorld(body, { frame: "local", x: 0.5, y: 0 });
  close(offset.x, 0);
  close(offset.y, 0.5);
  const applied = rigid.accumulateForce(body, { x: 2, y: 0 }, { frame: "local", x: 0.5, y: 0 });
  close(applied.torque, -1);
  close(body.torque, -1);
});

check(() => {
  const body = circle({ vx0: 0, vy0: 0 });
  const worldPoint = { frame: "world", x: 3, y: 5 };
  assert.deepEqual(rigid.applicationOffsetWorld(body, worldPoint), { x: 0, y: 1 });
  assert.deepEqual(rigid.localPointFromWorld(body, worldPoint), { x: 0, y: 1 });
  rigid.applyImpulse(body, { x: 1, y: 0 }, worldPoint);
  close(body.angularVelocity, -4);
});

check(() => {
  const body = circle({ vx0: 0, vy0: 0 });
  rigid.accumulateForce(body, { x: 4, y: 0 }, { frame: "local", x: 0, y: 0.5 });
  rigid.integrateVelocity(body, 0.5);
  close(body.velocity.x, 1);
  close(body.velocity.y, 0);
  close(body.angularVelocity, -4);
  rigid.integratePosition(body, 0.5);
  close(body.position.x, 3.5);
  close(body.angle, -2);
  rigid.clearAccumulators(body);
  assert.deepEqual(body.force, { x: 0, y: 0 });
  close(body.torque, 0);
});

check(() => {
  const body = circle({ x: 1, y: 2, vx0: 3, vy0: 4, omega0: 2 });
  assert.deepEqual(rigid.linearMomentum(body), { x: 6, y: 8 });
  close(rigid.kineticEnergy(body), 25.5);
  close(rigid.angularMomentum(body), 1 * 8 - 2 * 6 + 0.25 * 2);
  const pointVelocity = rigid.pointVelocity(body, { frame: "local", x: 0, y: 0.5 });
  close(pointVelocity.x, 2);
  close(pointVelocity.y, 4);
});

check(() => {
  const particle = rigid.createBody({
    id: "P1",
    kind: "particle",
    mass: 1,
    collisionRadius: 0.1,
    omega0: 100,
  });
  close(particle.inertia, 0);
  close(particle.inverseInertia, 0);
  close(particle.angularVelocity, 0);
  rigid.applyImpulse(particle, { x: 1, y: 0 }, { frame: "local", x: 0, y: 1 });
  close(particle.velocity.x, 1);
  close(particle.angularVelocity, 0);
});

check(() => {
  assert.throws(() => rigid.createBody({ kind: "circle", mass: 0, sizeB: 1 }), /mass.*greater than zero/);
  assert.throws(() => circle({ linearDamping: -1 }), /linearDamping.*greater than or equal to zero/);
  assert.throws(
    () => rigid.applicationOffsetWorld(circle(), { frame: "screen", x: 0, y: 0 }),
    /Unsupported application point frame/
  );
  assert.throws(() => rigid.createBody({ kind: "custom", mass: 1 }), /explicit positive inertia/);
});

console.log(`dynamics-rigid-body: ${checks} checks passed`);

"use strict";

const assert = require("node:assert/strict");
const rigid = require("../web/dynamics-rigid-body.js");
const contact = require("../web/dynamics-contact.js");

let checks = 0;

function check(callback) {
  callback();
  checks += 1;
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol=${tolerance})`);
}

function circle(id, x, y, vx, vy, overrides = {}) {
  const material = overrides.contact || {
    restitution: 1,
    staticFriction: 0,
    dynamicFriction: 0,
    damping: 0,
  };
  return rigid.createBody({
    id,
    kind: "circle",
    mass: 1,
    sizeB: 0.5,
    x,
    y,
    vx0: vx,
    vy0: vy,
    ...overrides,
    contact: material,
  });
}

check(() => {
  assert.deepEqual(contact.validateMaterial({ restitution: 0.8, staticFriction: 0.5, dynamicFriction: 0.3, damping: 2 }), {
    restitution: 0.8,
    staticFriction: 0.5,
    dynamicFriction: 0.3,
    damping: 2,
  });
  assert.throws(() => contact.validateMaterial({ restitution: -0.01 }), /range \[0, 1\]/);
  assert.throws(() => contact.validateMaterial({ restitution: 1.01 }), /range \[0, 1\]/);
  assert.throws(
    () => contact.validateMaterial({ staticFriction: 0.2, dynamicFriction: 0.3 }),
    /staticFriction.*greater than or equal/
  );
  assert.throws(() => contact.validateMaterial({ damping: -1 }), /damping.*greater than or equal/);
});

check(() => {
  assert.throws(
    () => contact.assertSupportedCollisionBody({ id: "R1", kind: "rectangle", mass: 1, sizeA: 1, sizeB: 1 }),
    /Unsupported collision geometry rectangle/
  );
  assert.throws(
    () => contact.assertSupportedCollisionBody({ id: "P1", kind: "particle", mass: 1, sizeB: 0.1 }),
    /explicit positive collisionRadius/
  );
  const particle = contact.assertSupportedCollisionBody({
    id: "P2",
    kind: "particle",
    mass: 1,
    collisionRadius: 0.1,
  });
  close(particle.collisionRadius, 0.1);
});

check(() => {
  const a = circle("A", 0, 0, 0, 0);
  const b = circle("B", 0.9, 0, 0, 0);
  const pair = contact.detectCircleCircle(a, b);
  assert.equal(pair.kind, "circle-circle");
  close(pair.normal.x, 1);
  close(pair.penetration, 0.1);

  const ground = contact.detectGroundContact(a, { id: "floor", y: -0.45 });
  assert.equal(ground.kind, "circle-ground");
  close(ground.normal.y, 1);
  close(ground.penetration, 0.05);
});

check(() => {
  const a = circle("A", -0.505, 0, 1, 0);
  const b = circle("B", 0.505, 0, 0, 0);
  const result = contact.stepWorld({
    bodies: [a, b],
    timeStep: 0.02,
    restitutionVelocityThreshold: 0,
    iterations: 20,
  });
  close(a.velocity.x, 0);
  close(b.velocity.x, 1);
  close(result.diagnostics.momentum.relativeDrift, 0, 1e-12);
  close(result.diagnostics.kineticEnergy.initial, result.diagnostics.kineticEnergy.final, 1e-12);
  close(result.dissipatedEnergy, 0, 1e-12);
});

check(() => {
  const a = circle("A", -0.35, -0.35, 2, 2, { mass: 2 });
  const b = circle("B", 0.36, 0.36, 0, 0);
  const initialMomentum = contact.systemMomentum([a, b]);
  const initialEnergy = contact.systemKineticEnergy([a, b]);
  contact.stepWorld({ bodies: [a, b], timeStep: 0.005, restitutionVelocityThreshold: 0 });
  const finalMomentum = contact.systemMomentum([a, b]);
  close(finalMomentum.x, initialMomentum.x, 1e-12);
  close(finalMomentum.y, initialMomentum.y, 1e-12);
  close(contact.systemKineticEnergy([a, b]), initialEnergy, 1e-11);
  assert.ok(b.velocity.x > 0 && b.velocity.y > 0, "oblique impact should transfer both velocity components");
});

check(() => {
  const inelastic = { restitution: 0, staticFriction: 0, dynamicFriction: 0, damping: 0 };
  const a = circle("A", -0.505, 0, 1, 0, { contact: inelastic });
  const b = circle("B", 0.505, 0, 0, 0, { contact: inelastic });
  const result = contact.stepWorld({
    bodies: [a, b],
    timeStep: 0.02,
    restitutionVelocityThreshold: 0,
  });
  close(a.velocity.x, 0.5);
  close(b.velocity.x, 0.5);
  close(result.diagnostics.momentum.absoluteDrift, 0, 1e-12);
  close(result.diagnostics.kineticEnergy.loss, 0.25, 1e-12);
  close(result.dissipatedEnergy, 0.25, 1e-12);
});

check(() => {
  const material = { restitution: 0, staticFriction: 1, dynamicFriction: 0.8, damping: 0 };
  const body = circle("D", 0, 0.505, 1, -1, { contact: material });
  const result = contact.stepWorld({
    bodies: [body],
    grounds: [{ id: "floor", y: 0, contact: material }],
    timeStep: 0.01,
    restitutionVelocityThreshold: 0,
  });
  close(body.velocity.y, 0);
  close(body.velocity.x + body.collisionRadius * body.angularVelocity, 0, 1e-12);
  assert.equal(result.contacts[0].frictionMode, "static");
  assert.ok(result.contacts[0].totalAbsoluteTangentImpulse > 0);
  assert.ok(result.diagnostics.kineticEnergy.loss > 0.6);
});

check(() => {
  const material = { restitution: 0, staticFriction: 0.1, dynamicFriction: 0.05, damping: 0 };
  const body = circle("D", 0, 0.505, 10, -1, { contact: material });
  const result = contact.stepWorld({
    bodies: [body],
    grounds: [{ id: "floor", y: 0, contact: material }],
    timeStep: 0.01,
    restitutionVelocityThreshold: 0,
  });
  assert.equal(result.contacts[0].frictionMode, "dynamic");
  assert.ok(body.velocity.x < 10 && body.velocity.x > 9.9);

  const dampedMaterial = { restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 1 };
  const damped = circle("E", 0, 0.505, 0, -2, { contact: dampedMaterial });
  contact.stepWorld({
    bodies: [damped],
    grounds: [{ id: "floor-2", y: 0, contact: dampedMaterial }],
    timeStep: 0.01,
    restitutionVelocityThreshold: 0,
  });
  close(damped.velocity.y, 1, 1e-12);
});

check(() => {
  const material = { restitution: 0, staticFriction: 0, dynamicFriction: 0, damping: 0 };
  const a = circle("A", -1.001, 0, 1, 0, { contact: material });
  const b = circle("B", 0, 0, 0, 0, { contact: material });
  const c = circle("C", 1.001, 0, 0, 0, { contact: material });
  const result = contact.stepWorld({
    bodies: [a, b, c],
    timeStep: 0.01,
    contactMargin: 0.01,
    iterations: 50,
    restitutionVelocityThreshold: 0,
  });
  close(a.velocity.x, 1 / 3, 1e-10);
  close(b.velocity.x, 1 / 3, 1e-10);
  close(c.velocity.x, 1 / 3, 1e-10);
  close(result.diagnostics.momentum.absoluteDrift, 0, 1e-12);
  assert.equal(result.contactCount, 2);
});

check(() => {
  const a = circle("A", 0, 0, 0, 0);
  const b = circle("B", 0.6, 0, 0, 0);
  const contacts = contact.generateContacts([a, b]);
  const before = Math.abs(b.position.x - a.position.x);
  contact.solveContacts(contacts, { positionIterations: 8, positionCorrection: 0.8 });
  const after = Math.abs(b.position.x - a.position.x);
  assert.ok(after > before);
  close(after, 1, 2e-5);
});

check(() => {
  const a = circle("A", -1, 0, 1, 0);
  const b = circle("B", 0, 0, 0, 0);
  const c = circle("C", 1, 0, 0, 0);
  const contacts = contact.generateContacts([a, b, c], [], { margin: 1e-9 });
  const before = contact.systemKineticEnergy([a, b, c]);
  const solved = contact.solveContacts(contacts, { iterations: 50, restitutionVelocityThreshold: 0 });
  const after = contact.systemKineticEnergy([a, b, c]);
  close(after, before, 1e-10);
  close(solved.dissipatedEnergy, 0, 1e-10);
  assert.ok(solved.attributedDissipatedEnergy >= 0);
});

check(() => {
  const body = circle("fast", -5, 0, 100, 0);
  const result = contact.stepWorld({
    bodies: [body],
    grounds: [{ id: "wall", normal: { x: -1, y: 0 }, offset: 0, contact: { restitution: 1 } }],
    timeStep: 0.1,
    restitutionVelocityThreshold: 0,
    maxTravelFraction: 0.25,
  });
  assert.equal(result.substeps, 80);
  close(body.velocity.x, -100, 1e-10);
  assert.ok(body.position.x <= -0.5, "the fast body must remain on the valid side of the wall");
  assert.equal(result.messages[0].code, "adaptive_contact_substeps");
});

check(() => {
  const body = circle("too-fast", -5, 0, 1000, 0);
  assert.throws(
    () =>
      contact.stepWorld({
        bodies: [body],
        grounds: [{ normal: { x: -1, y: 0 }, offset: 0 }],
        timeStep: 1,
        maxSubsteps: 16,
      }),
    (error) => error.code === "CONTACT_SUBSTEP_LIMIT" && error.requiredSubsteps > 16
  );
});

console.log(`dynamics-contact: ${checks} checks passed`);

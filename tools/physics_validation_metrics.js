"use strict";

const assert = require("node:assert/strict");
const schema = require("../web/project-schema.js");
const rigid = require("../web/dynamics-rigid-body.js");
const contact = require("../web/dynamics-contact.js");
const tracks = require("../web/dynamics-tracks.js");
const world = require("../web/dynamics-world.js");

function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected} (tol=${tolerance})`);
}

function relativeError(actual, expected) {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-30);
}

function circle(id, x, vx, material, overrides = {}) {
  return rigid.createBody({
    id,
    kind: "circle",
    mass: 1,
    sizeB: 0.5,
    x,
    y: 0,
    vx0: vx,
    vy0: 0,
    contact: material,
    ...overrides,
  });
}

function projectBody(id, overrides = {}) {
  return {
    id,
    name: id,
    geometry: { kind: "circle", sizeA: 1, sizeB: 0.5, sizeC: 0.1, collisionRadius: 0.5 },
    massProperties: { mass: 1, charge: 0, inertia: 0.125 },
    initialState: { x: 0, y: 0, vx: 0, vy: 0, theta: 0, omega: 0 },
    contact: { enabled: false, restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 0 },
    ...overrides,
  };
}

function project(overrides = {}) {
  return {
    schema: schema.DYNAMICS_SCHEMA,
    application: schema.APPLICATION_ID,
    module: "dynamics",
    model: "coupled-rigid-body2d",
    simulation: { duration: 1, timeStep: 0.01, maxSubsteps: 512, contactIterations: 24 },
    objects: [projectBody("D1")],
    fields: [],
    forces: [],
    grounds: [],
    tracks: [],
    constraints: [],
    ...overrides,
  };
}

const elasticMaterial = { restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 0 };
const elasticA = circle("A", -0.505, 1, elasticMaterial);
const elasticB = circle("B", 0.505, 0, elasticMaterial);
const elasticInitialEnergy = contact.systemKineticEnergy([elasticA, elasticB]);
const elasticInitialMomentum = contact.systemMomentum([elasticA, elasticB]);
const elasticResult = contact.stepWorld({
  bodies: [elasticA, elasticB],
  timeStep: 0.02,
  restitutionVelocityThreshold: 0,
  iterations: 24,
});
const elasticFinalEnergy = contact.systemKineticEnergy([elasticA, elasticB]);
const elasticFinalMomentum = contact.systemMomentum([elasticA, elasticB]);
close(elasticA.velocity.x, 0, 1e-12, "elastic vA");
close(elasticB.velocity.x, 1, 1e-12, "elastic vB");
close(elasticFinalMomentum.x, elasticInitialMomentum.x, 1e-12, "elastic momentum");
close(elasticFinalEnergy, elasticInitialEnergy, 1e-12, "elastic kinetic energy");

const inelasticMaterial = { restitution: 0.5, staticFriction: 0, dynamicFriction: 0, damping: 0 };
const inelasticA = circle("A", -0.505, 1, inelasticMaterial);
const inelasticB = circle("B", 0.505, 0, inelasticMaterial);
const inelasticInitialEnergy = contact.systemKineticEnergy([inelasticA, inelasticB]);
const inelasticResult = contact.stepWorld({
  bodies: [inelasticA, inelasticB],
  timeStep: 0.02,
  restitutionVelocityThreshold: 0,
  iterations: 24,
});
const inelasticFinalEnergy = contact.systemKineticEnergy([inelasticA, inelasticB]);
close(inelasticA.velocity.x, 0.25, 1e-12, "inelastic vA");
close(inelasticB.velocity.x, 0.75, 1e-12, "inelastic vB");
close(inelasticInitialEnergy - inelasticFinalEnergy, 0.1875, 1e-12, "inelastic loss");

const impulseBody = rigid.createBody({
  id: "R1",
  kind: "circle",
  mass: 2,
  inertia: 1,
  sizeB: 1,
  x: 0,
  y: 0,
  vx0: 0,
  vy0: 0,
});
rigid.applyImpulse(impulseBody, { x: 0, y: 1 }, { frame: "local", x: 1, y: 0 });
close(impulseBody.velocity.y, 0.5, 1e-12, "eccentric impulse vy");
close(impulseBody.angularVelocity, 1, 1e-12, "eccentric impulse omega");

const gravity = 9.81;
const inclineLength = 4;
const rollingAccelerationTheory = (2 / 3) * gravity * Math.sin(Math.PI / 6);
const rollingArrivalTheory = Math.sqrt((2 * inclineLength) / rollingAccelerationTheory);
const rollingBottomSpeedTheory = Math.sqrt(2 * rollingAccelerationTheory * inclineLength);
const rollingResult = tracks.simulateTrackMotion({
  track: {
    type: "incline",
    length: inclineLength,
    angleDegrees: -30,
    staticFriction: 1,
    kineticFriction: 0.8,
    endpointBehavior: "open",
  },
  body: { type: "solid-disk", mass: 1, radius: 0.2 },
  gravity,
  duration: 3,
  timeStep: 0.02,
});
close(rollingResult.arrivalTime, rollingArrivalTheory, 1e-8, "rolling arrival");
close(rollingResult.final.speed, rollingBottomSpeedTheory, 2e-8, "rolling bottom speed");
close(rollingResult.final.v - 0.2 * rollingResult.final.omega, 0, 1e-12, "rolling constraint");

const convergenceTrack = {
  type: "arc",
  center: { x: 0, y: 0 },
  radius: 2,
  startAngle: Math.PI,
  endAngle: 2 * Math.PI,
  endpointBehavior: "stop",
};
const convergenceRun = (timeStep) => tracks.simulateTrackMotion({
  track: convergenceTrack,
  body: { type: "particle", mass: 1 },
  gravity,
  duration: 0.6,
  timeStep,
}).final.s;
const convergenceReference = convergenceRun(0.0005);
const convergenceCoarseError = Math.abs(convergenceRun(0.04) - convergenceReference);
const convergenceFineError = Math.abs(convergenceRun(0.02) - convergenceReference);
assert.ok(convergenceFineError < convergenceCoarseError * 0.4, "halving the curved-track step must converge");

const variableResult = world.simulateProject(project({
  simulation: { duration: 1, timeStep: 0.1, maxSubsteps: 512, contactIterations: 24 },
  fields: [
    {
      id: "F1",
      kind: "gravity",
      rangeType: "global",
      variation: { mode: "time", unit: "m/s^2", components: { x: "t", y: "0" } },
    },
  ],
}));
close(variableResult.objectResults[0].final.x, 1 / 6, 1e-12, "variable field x");
close(variableResult.objectResults[0].final.vx, 0.5, 1e-12, "variable field vx");
assert.equal(variableResult.objectResults[0].potentialEnergyAvailable, false);

const acceleratedCollision = world.simulateProject(project({
  simulation: { duration: 0.1, timeStep: 0.1, maxSubsteps: 512, contactIterations: 24 },
  objects: [
    projectBody("A", {
      initialState: { x: -2, y: 0, vx: 0, vy: 0, theta: 0, omega: 0 },
      contact: { enabled: true, restitution: 0.8, staticFriction: 0, dynamicFriction: 0, damping: 0 },
    }),
    projectBody("B", {
      initialState: { x: 0, y: 0, vx: 0, vy: 0, theta: 0, omega: 0 },
      contact: { enabled: true, restitution: 0.8, staticFriction: 0, dynamicFriction: 0, damping: 0 },
    }),
  ],
  forces: [
    {
      id: "A1",
      targetId: "A",
      type: "continuous",
      x: 400,
      y: 0,
      start: 0,
      duration: 0.1,
      applicationPoint: { frame: "local", x: 0, y: 0 },
    },
  ],
}));
assert.ok(acceleratedCollision.totalSubsteps > 1, "external acceleration must refine the contact step");
assert.ok(acceleratedCollision.contactCount > 0, "accelerated body must not tunnel through its partner");

const metrics = {
  release: "v1.5.0",
  coordinateSystem: "SI, 2D, counter-clockwise positive rotation",
  elasticCollision: {
    theory: { finalVelocityA: 0, finalVelocityB: 1, momentumX: 1, kineticEnergy: 0.5 },
    numerical: {
      finalVelocityA: elasticA.velocity.x,
      finalVelocityB: elasticB.velocity.x,
      momentumX: elasticFinalMomentum.x,
      kineticEnergy: elasticFinalEnergy,
      netDissipatedEnergy: elasticResult.dissipatedEnergy,
    },
    relativeEnergyError: relativeError(elasticFinalEnergy, elasticInitialEnergy),
    absoluteMomentumError: Math.abs(elasticFinalMomentum.x - elasticInitialMomentum.x),
    timeStep: 0.02,
  },
  inelasticCollision: {
    restitution: 0.5,
    theory: { finalVelocityA: 0.25, finalVelocityB: 0.75, energyLoss: 0.1875 },
    numerical: {
      finalVelocityA: inelasticA.velocity.x,
      finalVelocityB: inelasticB.velocity.x,
      energyLoss: inelasticInitialEnergy - inelasticFinalEnergy,
      netDissipatedEnergy: inelasticResult.dissipatedEnergy,
    },
    timeStep: 0.02,
  },
  eccentricImpulse: {
    theory: { centerVelocityY: 0.5, angularVelocity: 1 },
    numerical: { centerVelocityY: impulseBody.velocity.y, angularVelocity: impulseBody.angularVelocity },
  },
  rollingIncline: {
    theory: {
      acceleration: rollingAccelerationTheory,
      arrivalTime: rollingArrivalTheory,
      bottomSpeed: rollingBottomSpeedTheory,
    },
    numerical: {
      arrivalTime: rollingResult.arrivalTime,
      bottomSpeed: rollingResult.final.speed,
      rollingConstraintError: rollingResult.final.v - 0.2 * rollingResult.final.omega,
      mechanicalEnergyChange: rollingResult.energy.mechanicalChange,
    },
    timeStep: 0.02,
  },
  curvedTrackConvergence: {
    referenceStep: 0.0005,
    coarseStep: 0.04,
    fineStep: 0.02,
    coarseAbsoluteError: convergenceCoarseError,
    fineAbsoluteError: convergenceFineError,
    fineToCoarseErrorRatio: convergenceFineError / convergenceCoarseError,
  },
  variableFieldRk4: {
    field: "a_x(t)=t",
    theory: { xAt1Second: 1 / 6, velocityXAt1Second: 0.5 },
    numerical: {
      xAt1Second: variableResult.objectResults[0].final.x,
      velocityXAt1Second: variableResult.objectResults[0].final.vx,
    },
    timeStep: 0.1,
    potentialEnergyAvailable: variableResult.objectResults[0].potentialEnergyAvailable,
  },
  acceleratedContact: {
    forceX: 400,
    requestedTimeStep: 0.1,
    totalSubsteps: acceleratedCollision.totalSubsteps,
    contactCount: acceleratedCollision.contactCount,
  },
};

if (process.argv.includes("--json")) console.log(JSON.stringify(metrics, null, 2));
else console.log("physics-validation: 7 scenarios passed");

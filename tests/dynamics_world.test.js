"use strict";

const assert = require("node:assert/strict");
const schema = require("../web/project-schema.js");
const core = require("../web/dynamics-core.js");
const world = require("../web/dynamics-world.js");
const controllerApi = require("../web/dynamics-controller.js");
const renderer = require("../web/dynamics-renderer.js");

function close(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol=${tolerance})`);
}

function body(id, overrides = {}) {
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
    simulation: { duration: 1, timeStep: 0.01, maxSubsteps: 512, contactIterations: 16 },
    objects: [body("D1")],
    fields: [],
    forces: [],
    grounds: [],
    tracks: [],
    constraints: [],
    ...overrides,
  };
}

let checks = 0;
function check(run) {
  run();
  checks += 1;
}

check(() => {
  const legacyCompatible = project({
    model: "independent-particle2d",
    simulation: { duration: 0.5, timeStep: 0.05 },
    objects: [
      {
        id: "D1",
        name: "legacy",
        kind: "particle",
        mass: 1,
        charge: 0,
        x: 1,
        y: 2,
        vx0: 3,
        vy0: -4,
        sizeA: 0.2,
        sizeB: 0.1,
        sizeC: 0.1,
      },
    ],
  });
  const result = world.simulateProject(legacyCompatible);
  const direct = core.simulateScene({
    objects: legacyCompatible.objects,
    fields: [],
    forces: [],
    duration: 0.5,
    timeStep: 0.05,
  });
  assert.equal(result.model, "independent-particle2d");
  assert.deepEqual(result.objectResults[0].final, direct.objectResults[0].final);
});

check(() => {
  const legacyV1 = project({
    schema: "cms-dynamics-project@1",
    model: "independent-particle2d",
    simulation: { duration: 0.1, timeStep: 0.01 },
    objects: [{ id: "D1", kind: "particle", mass: 1, x: 0, y: 0, vx0: 1, vy0: 0, sizeB: 0.1 }],
    forces: [{ id: "A1", targetId: "D1", type: "impulse", x: 0, y: 0 }],
  });
  const migrated = schema.loadDynamicsProject(legacyV1);
  assert.deepEqual(migrated.forces[0].applicationPoint, { frame: "local", x: 0, y: 0 });
  assert.equal(world.needsAdvancedSolver(migrated), false);
});

check(() => {
  const stages = [];
  const variable = project({
    model: "independent-particle2d",
    simulation: { duration: 0.1, timeStep: 0.1 },
    objects: [
      body("D1", {
        initialState: { x: 0, y: 0, vx: 1, vy: 0, theta: 0, omega: 0 },
        contact: { enabled: false },
      }),
    ],
    fields: [
      {
        id: "F1",
        kind: "gravity",
        rangeType: "global",
        variation: {
          mode: "time-space",
          unit: "m/s^2",
          components: { x: "t + x", y: "0" },
        },
      },
    ],
  });
  const result = world.simulateProject(variable, {
    observeFieldEvaluation(record) {
      stages.push(record);
    },
  });
  assert.equal(result.model, "coupled-rigid-body2d");
  assert.ok(stages.length >= 4);
  assert.deepEqual(
    stages.slice(0, 4).map((stage) => Number(stage.context.t.toFixed(12))),
    [0, 0.05, 0.05, 0.1]
  );
  assert.notEqual(stages[1].context.x, stages[0].context.x);
});

check(() => {
  const rotating = project({
    simulation: { duration: 0.1, timeStep: 0.01 },
    objects: [
      body("D1", {
        geometry: { kind: "circle", sizeA: 2, sizeB: 1, sizeC: 0.1, collisionRadius: 1 },
        massProperties: { mass: 2, charge: 0, inertia: 1 },
      }),
    ],
    forces: [
      {
        id: "A1",
        targetId: "D1",
        type: "impulse",
        x: 0,
        y: 1,
        applicationPoint: { frame: "local", x: 1, y: 0 },
      },
    ],
  });
  const result = world.simulateProject(rotating);
  close(result.objectResults[0].final.omega, 1, 1e-10);
  close(result.objectResults[0].final.vy, 0.5, 1e-10);
  assert.ok(result.objectResults[0].final.angle > 0.09);
});

check(() => {
  const colliding = project({
    simulation: { duration: 0.5, timeStep: 0.02, maxSubsteps: 512, contactIterations: 24 },
    objects: [
      body("A", {
        initialState: { x: -0.75, y: 0, vx: 1, vy: 0, theta: 0, omega: 0 },
        contact: { enabled: true, restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      }),
      body("B", {
        initialState: { x: 0.75, y: 0, vx: -1, vy: 0, theta: 0, omega: 0 },
        contact: { enabled: true, restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      }),
    ],
  });
  const result = world.simulateProject(colliding);
  const byId = new Map(result.objectResults.map((item) => [item.objectId, item]));
  assert.ok(byId.get("A").final.vx < -0.99);
  assert.ok(byId.get("B").final.vx > 0.99);
  close(result.totals.momentumX, 0, 1e-9);
  close(result.totals.kineticEnergy, 1, 1e-8);
  assert.ok(result.contactCount > 0);
});

check(() => {
  const fast = project({
    simulation: { duration: 0.04, timeStep: 0.04, maxSubsteps: 512, contactIterations: 24 },
    objects: [
      body("D1", {
        initialState: { x: 0, y: 2, vx: 0, vy: -100, theta: 0, omega: 0 },
        contact: { enabled: true, restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      }),
    ],
    grounds: [
      {
        id: "G1",
        normal: { x: 0, y: 1 },
        offset: 0,
        contact: { restitution: 1, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      },
    ],
  });
  const result = world.simulateProject(fast);
  assert.ok(result.totalSubsteps > 1);
  assert.ok(result.objectResults[0].final.y >= 0.5 - 1e-5);
  assert.ok(result.objectResults[0].final.vy > 0);
});

check(() => {
  const constrained = project({
    simulation: { duration: 2, timeStep: 0.01 },
    objects: [
      body("D1", {
        initialState: { x: 0, y: 1, vx: 0, vy: 0, theta: 0, omega: 0 },
        contact: { enabled: false },
      }),
    ],
    fields: [{ id: "F1", kind: "gravity", magnitude: 9.81, angle: -90, rangeType: "global" }],
    tracks: [
      {
        id: "T1",
        kind: "incline",
        start: { x: 0, y: 1 },
        end: { x: 1, y: 0 },
        endpointBehavior: "stop",
        contact: { restitution: 0, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      },
    ],
    constraints: [{ id: "C1", bodyId: "D1", trackId: "T1", rolling: false }],
  });
  const result = world.simulateProject(constrained);
  assert.equal(result.trackResults.length, 1);
  assert.ok(result.trackResults[0].track.arrivalTime > 0);
  assert.match(result.trackResults[0].track.endpointState, /stopped-end|arrived-end/);
  close(result.objectResults[0].final.x, 1, 1e-6);
  close(result.objectResults[0].final.y, 0, 1e-6);
});

check(() => {
  const outsideFiniteVariableField = project({
    simulation: { duration: 0.2, timeStep: 0.05 },
    objects: [
      body("D1", {
        initialState: { x: 5, y: 0, vx: 0, vy: 0, theta: 0, omega: 0 },
      }),
    ],
    fields: [
      {
        id: "F1",
        kind: "gravity",
        rangeType: "circle",
        centerX: 0,
        centerY: 0,
        radius: 1,
        variation: { mode: "time-space", unit: "m/s^2", components: { x: "10 + t + x", y: "0" } },
      },
    ],
  });
  const result = world.simulateProject(outsideFiniteVariableField);
  close(result.objectResults[0].final.vx, 0);
  close(result.objectResults[0].final.x, 5);
  assert.equal(result.objectResults[0].potentialEnergyAvailable, false);
  assert.equal(result.objectResults[0].potentialEnergy, null);
  assert.equal(result.totals.mechanicalEnergy, null);
});

check(() => {
  const acceleratedCollision = project({
    simulation: { duration: 0.1, timeStep: 0.1, maxSubsteps: 512, contactIterations: 24 },
    objects: [
      body("A", {
        initialState: { x: -2, y: 0, vx: 0, vy: 0, theta: 0, omega: 0 },
        contact: { enabled: true, restitution: 0.8, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      }),
      body("B", {
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
  });
  const result = world.simulateProject(acceleratedCollision);
  assert.ok(result.totalSubsteps > 1);
  assert.ok(result.contactCount > 0, "large external acceleration must not tunnel through contact");
});

check(() => {
  const tooManySteps = project({
    simulation: { duration: 1, timeStep: 0.1, maxSteps: 1_000_000 },
  });
  assert.throws(() => world.simulateProject(tooManySteps, { maxSteps: 5 }), /maxSteps|上限/);
});

check(() => {
  const released = project({
    simulation: { duration: 0.75, timeStep: 0.05 },
    objects: [
      body("D1", {
        initialState: { x: 0, y: 0, vx: 2, vy: 0, theta: 0, omega: 0 },
      }),
    ],
    tracks: [
      {
        id: "T1",
        kind: "line",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
        endpointBehavior: "release",
        contact: { restitution: 0, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      },
    ],
    constraints: [{ id: "C1", bodyId: "D1", trackId: "T1", rolling: false }],
  });
  const result = world.simulateProject(released);
  close(result.trackResults[0].track.arrivalTime, 0.5, 1e-10);
  assert.equal(result.trackResults[0].track.endpointState, "open-end");
  assert.equal(result.trackResults[0].track.detached, true);
});

check(() => {
  const trackProject = project({
    simulation: { duration: 1, timeStep: 0.01 },
    objects: [body("D1")],
    tracks: [
      {
        id: "T1",
        kind: "line",
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        endpointBehavior: "stop",
        contact: { restitution: 0, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      },
    ],
    constraints: [{ id: "C1", bodyId: "D1", trackId: "T1", rolling: false }],
    fields: [
      {
        id: "F1",
        kind: "gravity",
        rangeType: "global",
        variation: { mode: "time", unit: "m/s^2", components: { x: "t", y: "0" } },
      },
    ],
  });
  const result = world.simulateProject(trackProject);
  close(result.objectResults[0].final.x, 1 / 6, 2e-4);
  assert.equal(result.objectResults[0].potentialEnergyAvailable, false);
});

check(() => {
  const forcedTrack = project({
    simulation: { duration: 1, timeStep: 0.01 },
    objects: [
      body("D1", {
        initialState: { x: 0, y: 1, vx: 0, vy: 0, theta: 0, omega: 0 },
      }),
    ],
    tracks: [
      {
        id: "T1",
        kind: "line",
        start: { x: 0, y: 1 },
        end: { x: 100, y: 1 },
        endpointBehavior: "stop",
        contact: { restitution: 0, staticFriction: 0, dynamicFriction: 0, damping: 0 },
      },
    ],
    constraints: [{ id: "C1", bodyId: "D1", trackId: "T1", rolling: false }],
    forces: [
      {
        id: "I1",
        targetId: "D1",
        type: "impulse",
        x: 2,
        y: 0,
        applicationPoint: { frame: "local", x: 0, y: 0 },
      },
    ],
  });
  const impulseResult = world.simulateProject(forcedTrack);
  close(impulseResult.objectResults[0].final.x, 2, 1e-9);
  close(impulseResult.objectResults[0].final.y, 1, 1e-9);
  close(impulseResult.totals.initialMomentumX, 2, 1e-9);
  close(impulseResult.totals.initialKineticEnergy, 2, 1e-9);
  close(impulseResult.totals.initialAngularMomentum, -2, 1e-9);
  close(impulseResult.totals.angularMomentum, -2, 1e-9);
  close(impulseResult.totals.angularMomentumDrift, 0, 1e-9);

  forcedTrack.forces = [
    {
      id: "F1",
      targetId: "D1",
      type: "continuous",
      x: 1,
      y: 0,
      start: 0,
      duration: 1,
      applicationPoint: { frame: "local", x: 0, y: 0 },
    },
  ];
  const continuousResult = world.simulateProject(forcedTrack);
  close(continuousResult.objectResults[0].final.x, 0.5, 2e-4);
  assert.equal(continuousResult.objectResults[0].potentialEnergyAvailable, false);

  forcedTrack.forces[0].applicationPoint = { frame: "local", x: 0, y: 0.2 };
  assert.throws(() => world.simulateProject(forcedTrack), /偏心|off-center/i);
});

check(() => {
  const source = project({
    simulation: { duration: 0.1, timeStep: 0.01 },
    forces: [
      {
        id: "A1",
        targetId: "D1",
        type: "impulse",
        x: 1,
        y: 0,
        applicationPoint: { frame: "local", x: 0, y: 0.25 },
      },
    ],
  });
  const controller = controllerApi.createController(source);
  assert.deepEqual(controller.exportProject().forces[0].applicationPoint, source.forces[0].applicationPoint);
  const solved = controller.solve();
  assert.equal(solved.objectResults.length, 1);
  assert.equal(controller.snapshot().revision, 1);
});

check(() => {
  const samples = [
    { t: 0, x: 0, y: 0, angle: 0 },
    { t: 1, x: 2, y: 4, angle: 1 },
  ];
  const middle = renderer.interpolateSamples(samples, 0.25);
  close(middle.x, 0.5);
  close(middle.y, 1);
  close(middle.angle, 0.25);
  const model = renderer.buildRenderModel({
    project: project({ objects: [body("D1")] }),
    result: { objectResults: [{ objectId: "D1", name: "D1", samples, final: samples[1] }] },
    time: 0.5,
  });
  assert.equal(model.objects.length, 1);
  close(model.objects[0].position.x, 1);
});

console.log(`dynamics-world: ${checks} checks passed`);

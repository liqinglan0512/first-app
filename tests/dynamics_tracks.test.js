"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const tracks = require("../web/dynamics-tracks.js");

let checks = 0;
function check(callback) {
  callback();
  checks += 1;
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol=${tolerance})`);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

check(() => {
  const incline = tracks.createTrack({ type: "incline", origin: { x: 0, y: 0 }, length: 10, angle: -30 });
  close(incline.length, 10);
  const middle = incline.frameAt(5);
  close(middle.x, 5 * Math.cos(Math.PI / 6));
  close(middle.y, -2.5);
  close(middle.tangent.x, Math.cos(Math.PI / 6));
  close(middle.tangent.y, -0.5);
  close(middle.normal.x, 0.5);
  close(middle.normal.y, Math.cos(Math.PI / 6));
  close(middle.curvature, 0);
  const fromStart = tracks.buildTrack({ type: "line", start: { x: 1, y: 1 }, length: 2, angleDegrees: 90 });
  close(fromStart.pointAt(2).x, 1);
  close(fromStart.pointAt(2).y, 3);
});

check(() => {
  const polyline = tracks.createTrack({
    type: "polyline",
    points: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }],
  });
  close(polyline.length, 7);
  assert.deepEqual(polyline.pointAt(5), { x: 3, y: 2 });
  assert.equal(polyline.frameAt(3).corner, true);
  const projection = polyline.project({ x: 2, y: 3 });
  close(projection.s, 6);
  close(projection.point.x, 3);
  close(projection.point.y, 3);
  close(projection.distance, 1);
});

check(() => {
  const arc = tracks.createTrack({
    type: "circular-arc",
    center: { x: 0, y: 0 },
    radius: 2,
    startAngle: 0,
    endAngle: Math.PI / 2,
  });
  close(arc.length, Math.PI);
  const middle = arc.frameAt(arc.length / 2);
  close(middle.x, Math.SQRT2);
  close(middle.y, Math.SQRT2);
  close(middle.curvature, 0.5);
  close(middle.normal.x, -Math.SQRT1_2);
  close(middle.normal.y, -Math.SQRT1_2);
  const projection = tracks.nearestProjection(arc, { x: 3, y: 3 });
  close(projection.u, 0.5, 1e-12);
  close(projection.distance, Math.sqrt(18) - 2, 1e-12);
});

check(() => {
  const bezier = tracks.createTrack({
    type: "smooth",
    points: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 0 }],
  });
  assert.ok(bezier.length > 4);
  assert.deepEqual(bezier.pointAt(0), { x: 0, y: 0 });
  assert.deepEqual(bezier.pointAt(bezier.length), { x: 4, y: 0 });
  const samples = tracks.sampleTrack(bezier, { count: 25 });
  const spacings = samples.slice(1).map((sample, index) => distance(sample.point, samples[index].point));
  assert.ok(Math.max(...spacings) / Math.min(...spacings) < 1.02, "Bezier samples should be nearly uniform in arc length");
  const projection = tracks.projectPoint(bezier, { x: 2, y: 1.4 });
  close(projection.x, 2, 2e-4);
  close(projection.y, 1.5, 2e-4);
  assert.ok(Number.isFinite(projection.curvature));
});

check(() => {
  assert.equal(tracks.validateTrack({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }).valid, false);
  assert.equal(tracks.validateTrack({ type: "polyline", points: [{ x: 0, y: 0 }] }).valid, false);
  assert.throws(
    () => tracks.createTrack({ type: "arc", center: { x: 0, y: 0 }, radius: 1, startAngle: 0, endAngle: 1, restitution: 2 }),
    /between 0 and 1/
  );
  assert.throws(
    () => tracks.simulateTrackMotion({
      track: { type: "line", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
      body: { type: "hollow-sphere", mass: 1 },
      gravity: 0,
      duration: 1,
      timeStep: 0.1,
    }),
    /Unsupported track body type/
  );
});

check(() => {
  const length = 4;
  const gravity = 9.81;
  const acceleration = gravity * Math.sin(Math.PI / 6);
  const result = tracks.simulateTrackMotion({
    track: { type: "incline", length, angleDegrees: -30, endpointBehavior: "stop" },
    body: { type: "particle", mass: 1 },
    gravity,
    duration: 3,
    timeStep: 0.03,
  });
  close(result.arrivalTime, Math.sqrt(2 * length / acceleration), 1e-10);
  close(result.final.speed, 0);
  close(result.bottomState.speed, Math.sqrt(2 * acceleration * length), 1e-9);
  assert.equal(result.endpointState, "stopped-end");
  close(result.bottomState.s, length);
});

check(() => {
  const length = 4;
  const gravity = 9.81;
  const radius = 0.2;
  const acceleration = (2 / 3) * gravity * Math.sin(Math.PI / 6);
  const result = tracks.simulateTrackMotion({
    track: {
      type: "incline",
      length,
      angleDegrees: -30,
      staticFriction: 1,
      kineticFriction: 0.8,
      endpointBehavior: "open",
    },
    body: { type: "solid-disk", mass: 1, radius },
    gravity,
    duration: 3,
    timeStep: 0.02,
  });
  close(tracks.solidDiskInertia(1, radius), 0.5 * radius * radius);
  close(result.arrivalTime, Math.sqrt(2 * length / acceleration), 1e-8);
  close(result.final.speed, Math.sqrt(2 * acceleration * length), 2e-8);
  close(Math.abs(result.final.rollingConstraintError), 0, 1e-12);
  close(result.final.omega, result.final.v / radius, 1e-12);
  close(result.energy.mechanicalChange, 0, 2e-7);
  assert.equal(result.detachedReason, "open-end-endpoint");
});

check(() => {
  const result = tracks.simulateTrackMotion({
    track: {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      staticFriction: 0.4,
      kineticFriction: 0.2,
    },
    body: { type: "solid-disk", mass: 1, radius: 0.2 },
    initialState: { s: 10, speed: 3, omega: 0, sliding: true },
    gravity: 9.81,
    duration: 1,
    timeStep: 0.002,
  });
  assert.equal(result.everSliding, true);
  assert.equal(result.sliding, false);
  close(result.final.speed, 2, 0.012);
  close(result.final.v, 0.2 * result.final.omega, 1e-10);
  assert.ok(result.energy.dissipated > 0);
});

check(() => {
  const result = tracks.simulateConstrainedMotion({
    track: {
      type: "arc",
      center: { x: 0, y: 0 },
      radius: 1,
      startAngle: Math.PI / 2,
      endAngle: Math.PI,
    },
    body: { type: "particle", mass: 1 },
    initialState: { s: 0, speed: 1 },
    gravity: 9.81,
    duration: 0.2,
    timeStep: 0.01,
  });
  assert.equal(result.detached, true);
  assert.equal(result.detachedReason, "negative-normal-force");
  close(result.duration, 0);
  assert.ok(result.final.normalForce < 0);
});

check(() => {
  const base = {
    track: { type: "line", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
    body: { type: "particle", mass: 1 },
    initialState: { speed: 2 },
    gravity: 0,
    duration: 0.75,
    timeStep: 0.07,
  };
  const open = tracks.simulateTrack({ ...base, endpointBehavior: "open" });
  close(open.arrivalTime, 0.5, 1e-12);
  assert.equal(open.detached, true);
  assert.equal(open.endpointState, "open-end");

  const stopped = tracks.simulateTrack({ ...base, endpointBehavior: "stop" });
  close(stopped.arrivalTime, 0.5, 1e-12);
  close(stopped.final.v, 0);
  assert.equal(stopped.endpointState, "stopped-end");

  const exact = tracks.simulateTrack({ ...base, initialState: { speed: 1 }, duration: 1, timeStep: 0.25, endpointBehavior: "stop" });
  close(exact.arrivalTime, 1, 1e-12);
  assert.equal(exact.endpointState, "stopped-end");

  const bounced = tracks.simulateTrack({ ...base, endpointBehavior: "bounce", restitution: 0.5 });
  close(bounced.arrivalTime, 0.5, 1e-12);
  close(bounced.final.s, 0.75, 1e-10);
  close(bounced.final.v, -1, 1e-12);
  assert.equal(bounced.detached, false);
  assert.equal(bounced.endpointState, "bounced-end");
});

check(() => {
  const track = {
    type: "arc",
    center: { x: 0, y: 0 },
    radius: 2,
    startAngle: Math.PI,
    endAngle: 2 * Math.PI,
    endpointBehavior: "stop",
  };
  const run = (timeStep) => tracks.simulateTrackMotion({
    track,
    body: { type: "particle", mass: 1 },
    gravity: 9.81,
    duration: 0.6,
    timeStep,
  }).final.s;
  const reference = run(0.0005);
  const coarseError = Math.abs(run(0.04) - reference);
  const fineError = Math.abs(run(0.02) - reference);
  assert.ok(coarseError > 0);
  assert.ok(fineError < coarseError * 0.4, `fine=${fineError}, coarse=${coarseError}`);
});

check(() => {
  const source = fs.readFileSync(path.join(__dirname, "..", "web", "dynamics-tracks.js"), "utf8");
  for (const forbidden of ["document", "localStorage", "eval(", "new Function"]) {
    assert.equal(source.includes(forbidden), false, `pure numerical module must not contain ${forbidden}`);
  }
  for (const name of [
    "createTrack",
    "sampleTrack",
    "evaluateTrack",
    "projectPoint",
    "solidDiskInertia",
    "simulateTrackMotion",
  ]) assert.equal(typeof tracks[name], "function", `${name} must be exported`);
});

console.log(`dynamics-tracks: ${checks} checks passed`);

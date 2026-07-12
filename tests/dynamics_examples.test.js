"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const schema = require("../web/project-schema.js");
const world = require("../web/dynamics-world.js");

const examples = path.join(__dirname, "..", "examples");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(examples, name), "utf8"));
}

let checks = 0;
function check(run) {
  run();
  checks += 1;
}

check(() => {
  const project = schema.loadDynamicsProject(load("dynamics_collision_v1.5.json"));
  const result = world.simulateProject(project);
  assert.equal(result.model, "coupled-rigid-body2d");
  assert.equal(result.objectResults.length, 2);
  assert.ok(result.contactCount > 0);
  assert.ok(result.totalSubsteps >= result.stepCount);
  assert.ok(result.objectResults.every((item) => Number.isFinite(item.final.x) && Number.isFinite(item.final.omega)));
});

check(() => {
  const project = schema.loadDynamicsProject(load("dynamics_track_rolling_v1.5.json"));
  const result = world.simulateProject(project);
  assert.equal(result.trackResults.length, 1);
  const track = result.trackResults[0].track;
  assert.ok(track.arrivalTime > 0);
  assert.equal(track.detached, false);
  assert.match(track.endpointState, /stopped-end|arrived-end/);
  assert.ok(result.objectResults[0].samples.some((sample) => Math.abs(sample.rollingConstraintError) < 1e-8));
});

check(() => {
  const project = schema.loadDynamicsProject(load("dynamics_variable_field_v1.5.json"));
  const stages = [];
  const result = world.simulateProject(project, {
    observeFieldEvaluation(record) {
      if (stages.length < 8) stages.push(record);
    },
  });
  assert.equal(result.objectResults.length, 1);
  assert.ok(stages.length >= 4);
  assert.ok(result.objectResults[0].samples.every((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.vy)));
});

console.log(`dynamics-examples: ${checks} checks passed`);

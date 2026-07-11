"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const geometry = require("../web/dynamics-field-geometry.js");
const placement = require("../web/dynamics-field-placement.js");
const ProjectAdapter = require("../web/project-adapter.js");

let checks = 0;
function check(callback) {
  callback();
  checks += 1;
}

check(() => {
  assert.deepEqual(geometry.rectangleFromDrag({ x: -2, y: -1 }, { x: 4, y: 3 }), {
    centerX: 1,
    centerY: 1,
    width: 6,
    height: 4,
  });
});

check(() => {
  assert.deepEqual(
    geometry.rectangleFromDrag({ x: 4, y: 3 }, { x: -2, y: -1 }),
    geometry.rectangleFromDrag({ x: -2, y: -1 }, { x: 4, y: 3 })
  );
});

check(() => {
  assert.deepEqual(geometry.circleFromDrag({ x: 2, y: 3 }, { x: 5, y: 7 }), {
    centerX: 2,
    centerY: 3,
    radius: 5,
  });
});

check(() => {
  assert.deepEqual(geometry.polygonBounds([{ x: -2, y: 1 }, { x: 4, y: -3 }, { x: 3, y: 5 }]), {
    minX: -2,
    maxX: 4,
    minY: -3,
    maxY: 5,
    centerX: 1,
    centerY: 1,
    width: 6,
    height: 8,
  });
});

check(() => {
  assert.equal(
    geometry.validateFieldGeometry({ rangeType: "rectangle", centerX: 0, centerY: 0, width: 0, height: 2 }).valid,
    false
  );
});

check(() => {
  assert.equal(geometry.validateFieldGeometry({ rangeType: "circle", centerX: 0, centerY: 0, radius: 0 }).valid, false);
});

check(() => {
  assert.equal(
    geometry.validateFieldGeometry({ rangeType: "custom", centerX: 0, centerY: 0, path: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }).valid,
    false
  );
});

check(() => {
  assert.deepEqual(
    geometry.viewportWorldCenter({ origin: { x: 100, y: 300 }, scale: 50, canvasWidth: 800, canvasHeight: 600 }),
    { x: 6, y: 0 }
  );
});

check(() => {
  const start = { x: -2, y: -1 };
  const end = { x: 4, y: 3 };
  const pathValue = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 2 }];
  const before = JSON.stringify({ start, end, pathValue });
  geometry.rectangleFromDrag(start, end);
  geometry.polygonBounds(pathValue);
  geometry.translatePathToCenter(pathValue, { x: 5, y: 6 });
  assert.equal(JSON.stringify({ start, end, pathValue }), before);
});

check(() => {
  const configured = placement.configurePlacement("F9");
  const started = placement.startPlacement(
    placement.beginPlacement(configured, {
      mode: "rectangle",
      draft: { kind: "gravity", magnitude: 9.81, angle: -90, rangeType: "rectangle" },
    }),
    { x: -2, y: -1 }
  );
  const completed = placement.completePlacement(placement.updatePlacement(started, { x: 4, y: 3 }));
  assert.equal(completed.validation.valid, true);
  assert.equal(completed.field.centerX, 1);
  assert.equal(completed.field.width, 6);
  assert.equal(completed.placement.active, false);
});

check(() => {
  const configured = placement.configurePlacement();
  const started = placement.startPlacement(
    placement.beginPlacement(configured, {
      mode: "custom",
      draft: { kind: "magnetic", magnitude: 1, rangeType: "custom", magneticDirection: "out" },
    }),
    { x: 0, y: 0 }
  );
  const updated = placement.updatePlacement(
    placement.updatePlacement(started, { x: 2, y: 0 }),
    { x: 1, y: 2 }
  );
  const completed = placement.completePlacement(updated);
  assert.equal(completed.validation.valid, true);
  assert.equal(completed.field.centerX, 1);
  assert.equal(completed.field.centerY, 1);
  assert.equal(completed.field.path.length, 3);
});

check(() => {
  const configured = placement.configurePlacement("F2");
  const cancelled = placement.cancelPlacement(configured);
  assert.deepEqual(cancelled, placement.createPlacementState());
});

check(() => {
  const completeField = {
    id: "F1",
    kind: "gravity",
    magnitude: 9.81,
    angle: -90,
    rangeType: "rectangle",
    centerX: 1,
    centerY: 1,
    width: 6,
    height: 4,
  };
  const project = ProjectAdapter.loadDynamicsProject({
    schema: ProjectAdapter.DYNAMICS_SCHEMA,
    application: ProjectAdapter.APPLICATION_ID,
    module: "dynamics",
    model: "independent-particle2d",
    simulation: { duration: "3 s", timeStep: "0.02 s" },
    objects: [],
    fields: [completeField],
    forces: [],
  });
  assert.deepEqual(project.fields[0], completeField);
});

check(() => {
  for (const filename of ["dynamics-field-geometry.js", "dynamics-field-placement.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", "web", filename), "utf8");
    for (const forbidden of ["document", "window", "localStorage"]) assert.equal(source.includes(forbidden), false);
  }
});

check(() => {
  const html = fs.readFileSync(path.join(__dirname, "..", "web", "index.html"), "utf8");
  const geometryIndex = html.indexOf("/static/dynamics-field-geometry.js");
  const placementIndex = html.indexOf("/static/dynamics-field-placement.js");
  const applicationIndex = html.indexOf("/static/app.js");
  assert.ok(geometryIndex >= 0 && placementIndex > geometryIndex && applicationIndex > placementIndex);
});

console.log(`dynamics-field-placement: ${checks} checks passed`);

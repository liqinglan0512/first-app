"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const expression = fs.readFileSync(path.join(root, "web", "dynamics-expression.js"), "utf8");
const fields = fs.readFileSync(path.join(root, "web", "dynamics-fields.js"), "utf8");

let checks = 0;
function check(run) {
  run();
  checks += 1;
}

check(() => {
  const scriptOrder = [
    "dynamics-expression.js",
    "dynamics-fields.js",
    "dynamics-rigid-body.js",
    "dynamics-contact.js",
    "dynamics-tracks.js",
    "dynamics-core.js",
    "dynamics-world.js",
    "dynamics-controller.js",
    "dynamics-renderer.js",
    "dynamics-report.js",
    "app.js",
  ].map((name) => html.indexOf(`/static/${name}`));
  assert.ok(scriptOrder.every((index) => index >= 0));
  assert.deepEqual([...scriptOrder].sort((a, b) => a - b), scriptOrder);
});

check(() => {
  assert.match(html, /id="dynamicsRigidToggle" type="checkbox">刚体 \/ 接触/);
  assert.match(html, /id="dynamicsGroundToggle" type="checkbox">地面 y=0/);
  assert.match(app, /state\.dynamics\.model = "coupled-rigid-body2d"/);
  assert.match(app, /contact:\s*\{[\s\S]*?restitution:\s*0\.8/);
});

check(() => {
  assert.match(html, /id="dynamicsTheta0"/);
  assert.match(html, /id="dynamicsOmega0"/);
  assert.match(app, /theta0:\s*Number\(els\.dynamicsTheta0/);
  assert.match(app, /omega0:\s*Number\(els\.dynamicsOmega0/);
});

check(() => {
  assert.match(html, /id="dynamicsForcePointFrame"/);
  assert.match(html, /value="local">物体局部坐标/);
  assert.match(html, /value="world">世界坐标/);
  assert.match(app, /applicationPoint,\s*\n\s*\}\);/);
});

check(() => {
  for (const mode of ["constant", "time", "space", "time-space"]) {
    assert.match(html, new RegExp(`id="dynamicsFieldMode"[\\s\\S]*?value="${mode}"`));
  }
  assert.match(html, /id="dynamicsFieldExpressionX"/);
  assert.match(html, /id="dynamicsFieldExpressionY"/);
  assert.match(app, /DynamicsFields\.compileField\(DynamicsWorld\.variableFieldSpec\(field\)\)/);
});

check(() => {
  assert.match(html, /id="dynamicsTrackCount"/);
  assert.match(html, /id="dynamicsTrackList"/);
  assert.match(app, /DynamicsTracks\.sampleTrack/);
  assert.match(app, /state\.dynamics\.constraints/);
});

check(() => {
  assert.match(app, /DynamicsController\.createController\(project\)/);
  assert.doesNotMatch(app, /state\.dynamics\.result\s*=\s*DynamicsCore\.simulateScene/);
});

check(() => {
  const productionSources = `${expression}\n${fields}`;
  assert.doesNotMatch(productionSources, /\beval\s*\(/);
  assert.doesNotMatch(productionSources, /new\s+Function\b/);
});

console.log(`dynamics-v15-ui: ${checks} checks passed`);

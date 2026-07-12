"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../web/dynamics-core.js");
const fields = require("../web/dynamics-fields.js");

let checks = 0;
function check(callback) {
  callback();
  checks += 1;
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function components(kind, mode, x, y, units) {
  return {
    kind,
    mode,
    representation: "components",
    expressions: { x, y },
    ...(units ? { units } : {}),
  };
}

check(() => {
  const program = fields.compileField({
    kind: "gravity",
    mode: "constant",
    representation: "magnitude-angle",
    expressions: { magnitude: 9.81, angle: -90 },
    units: { magnitude: "m/s²", angle: "deg" },
  });
  const value = program.evaluate();
  close(value.x, 0);
  close(value.y, -9.81);
  assert.equal(value.units.magnitude, "m/s^2");
  assert.equal(value.units.angle, "deg");
  assert.ok(Object.isFrozen(program));
  assert.ok(Object.isFrozen(value));
});

check(() => {
  const value = fields.evaluateField(components("gravity", "time", "2*t", "-9.81"), { t: 3 });
  assert.equal(value.x, 6);
  assert.equal(value.y, -9.81);
  close(value.magnitude, Math.hypot(6, 9.81));
});

check(() => {
  const program = fields.compileField(
    components("electric", "space", "x + y", "x - y", { x: "V/m", y: "N/C" })
  );
  const value = program.evaluate({ x: 4, y: 1 });
  assert.equal(value.x, 5);
  assert.equal(value.y, 3);
  assert.deepEqual(program.variables, ["x", "y"]);
  assert.equal(value.units.x, "N/C");
});

check(() => {
  const value = fields.evaluateField(
    components("gravity", "time-space", "t + x + vx", "y + vy"),
    { t: 1, x: 2, y: 3, vx: 4, vy: 5 }
  );
  assert.equal(value.x, 7);
  assert.equal(value.y, 8);
});

check(() => {
  const program = fields.compileField({
    kind: "magnetic",
    mode: "space",
    representation: "components",
    expressions: { z: "x - 2" },
    units: { z: "tesla" },
  });
  const value = program.evaluate({ x: 1 });
  assert.equal(value.z, -1);
  assert.equal(value.magnitude, 1);
  assert.equal(value.magneticDirection, "in");
  assert.equal(value.units.z, "T");
});

check(() => {
  assert.throws(
    () =>
      fields.compileField({
        kind: "magnetic",
        representation: "magnitude-angle",
        expressions: { magnitude: 1, angle: 90 },
      }),
    /二维磁场必须使用 components/
  );
});

check(() => {
  assert.throws(
    () => fields.compileField(components("gravity", "constant", "t", 0)),
    /当前模式不允许变量“t”/
  );
  assert.throws(
    () => fields.compileField(components("gravity", "time", "x", 0)),
    /当前模式不允许变量“x”/
  );
  assert.throws(
    () => fields.compileField(components("gravity", "space", "vx", 0)),
    /当前模式不允许变量“vx”/
  );
});

check(() => {
  assert.throws(
    () => fields.compileField(components("gravity", "constant", 0, -9.81, { x: "T", y: "m/s^2" })),
    /单位必须与 m\/s\^2 兼容/
  );
  assert.throws(
    () =>
      fields.compileField({
        kind: "electric",
        representation: "magnitude-angle",
        expressions: { magnitude: 1, angle: 0 },
        units: { magnitude: "N/C", angle: "rad" },
      }),
    /单位必须与 deg 兼容/
  );
});

check(() => {
  for (const spec of [
    components("wind", "constant", 1, 2),
    components("gravity", "random", 1, 2),
    { kind: "gravity", representation: "matrix", expressions: { x: 1, y: 2 } },
    { kind: "gravity", representation: "components", expressions: { x: 1 } },
    { kind: "gravity", representation: "components", expressions: [1, 2] },
  ]) {
    assert.throws(() => fields.compileField(spec), fields.FieldValidationError);
  }
  class FieldSpec {}
  assert.throws(() => fields.compileField(new FieldSpec()), /必须是普通对象/);
  assert.throws(
    () => fields.compileField({ kind: "gravity", representation: "components", expressions: { x: "", y: 0 } }),
    /必须是非空字符串/
  );
});

check(() => {
  const program = fields.compileField({
    kind: "gravity",
    mode: "time",
    representation: "magnitude-angle",
    expressions: { magnitude: "t - 2", angle: 90 },
  });
  assert.throws(() => program.evaluate({ t: 1 }), /幅值不能为负数/);
  assert.throws(() => program.evaluate({ t: Infinity }), /必须是有限数值/);
  assert.throws(() => program.evaluate({}), /缺少变量“t”/);
});

check(() => {
  assert.throws(
    () =>
      fields.compileField(components("gravity", "time", "t + 1", 0), {
        expressionLimits: { maxExpressionLength: 3 },
      }),
    /表达式长度超过/
  );
  const program = fields.compileField(components("gravity", "constant", "1 + 2 + 3", 0), {
    expressionLimits: { maxEvaluationOperations: 4 },
  });
  assert.throws(() => program.evaluate({}), /求值操作数超过/);
});

check(() => {
  const programs = fields.compileFields([
    components("gravity", "constant", 0, -9.81),
    components("electric", "time", "t", 0),
  ]);
  const values = fields.evaluateFields(programs, { t: 2 });
  assert.equal(values.length, 2);
  assert.equal(values[0].y, -9.81);
  assert.equal(values[1].x, 2);
  assert.ok(fields.isCompiledField(programs[0]));
  assert.ok(Object.isFrozen(programs));
  assert.ok(Object.isFrozen(values));
});

check(() => {
  const acceleration = fields.accelerationAt(
    [
      components("gravity", "constant", 1, -10),
      components("electric", "constant", 4, 0),
      {
        kind: "magnetic",
        mode: "constant",
        representation: "components",
        expressions: { z: 2 },
      },
    ],
    { t: 0, x: 0, y: 0, vx: 5, vy: -1 },
    { mass: 2, charge: 3 }
  );
  assert.deepEqual(acceleration, { x: 4, y: -25 });
});

check(() => {
  assert.throws(
    () =>
      fields.accelerationAt(
        [components("gravity", "constant", 0, -9.81)],
        { t: 0, x: 0, y: 0, vx: 0, vy: 0 },
        { mass: 0, charge: 0 }
      ),
    /mass 必须大于 0/
  );
  assert.throws(
    () =>
      fields.accelerationAt(
        [components("gravity", "constant", 0, -9.81)],
        { t: 0, x: NaN, y: 0, vx: 0, vy: 0 },
        { mass: 1, charge: 0 }
      ),
    /state.x 必须是有限数值/
  );
  assert.throws(() => fields.evaluateField(components("gravity", "constant", 0, -9.81), null), /上下文必须是对象/);
  assert.throws(() => fields.compileField(components("gravity", "constant", 0, -9.81), null), /编译选项必须是对象/);
  assert.throws(() => fields.accelerationAt([], null, { mass: 1 }), /state 必须是对象/);
});

check(() => {
  const observations = [];
  const derivative = fields.createParticleDerivative(
    [components("gravity", "time-space", "t + x", "t + y")],
    { mass: 1, charge: 0 },
    { observeEvaluation: (entry) => observations.push(entry) }
  );
  const next = core.rk4Step({ x: 1, y: 2, vx: 2, vy: 1 }, 0.5, derivative, 0);
  assert.equal(observations.length, 4);
  assert.deepEqual(observations.map((entry) => entry.context.t), [0, 0.25, 0.25, 0.5]);
  assert.deepEqual(observations.map((entry) => entry.context.x), [1, 1.5, 1.5625, 2.21875]);
  assert.deepEqual(observations.map((entry) => entry.context.y), [2, 2.25, 2.375, 2.8125]);
  assert.deepEqual(observations.map((entry) => entry.fields[0].x), [1, 1.75, 1.8125, 2.71875]);
  assert.deepEqual(observations.map((entry) => entry.fields[0].y), [2, 2.5, 2.625, 3.3125]);
  assert.notEqual(next.x, 2);
  assert.ok(observations.every(Object.isFrozen));
});

check(() => {
  assert.throws(
    () => fields.createParticleDerivative([], { mass: 1 }, { observeEvaluation: true }),
    /observeEvaluation 必须是函数/
  );
  const derivative = fields.createParticleDerivative([], { mass: 1, charge: 0 });
  assert.deepEqual(derivative({ x: 1, y: 2, vx: 3, vy: 4 }, 5), { x: 3, y: 4, vx: 0, vy: 0 });
  assert.throws(() => fields.createParticleDerivative([], { mass: 1 }, null), /导数选项必须是对象/);
});

check(() => {
  assert.deepEqual(fields.UNIT_CONTRACTS.context, {
    t: "s",
    x: "m",
    y: "m",
    vx: "m/s",
    vy: "m/s",
  });
  assert.deepEqual(fields.MODE_VARIABLES.constant, []);
  assert.deepEqual(fields.MODE_VARIABLES.time, ["t"]);
  assert.deepEqual(fields.MODE_VARIABLES.space, ["x", "y"]);
  assert.deepEqual(fields.MODE_VARIABLES["time-space"], ["t", "x", "y", "vx", "vy"]);
});

check(() => {
  const source = fs.readFileSync(path.join(__dirname, "..", "web", "dynamics-fields.js"), "utf8");
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /new\s+Function\b/);
  assert.doesNotMatch(source, /document|localStorage/);
});

check(() => {
  const root = path.join(__dirname, "..", "web");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "dynamics-expression.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "dynamics-fields.js"), "utf8"), sandbox);
  assert.equal(typeof sandbox.DynamicsFields.compileField, "function");
  vm.runInContext(
    "result = DynamicsFields.evaluateField({kind:'gravity',mode:'constant',representation:'components',expressions:{x:0,y:-9.81}}, {})",
    sandbox
  );
  assert.equal(sandbox.result.y, -9.81);
});

console.log(`dynamics-fields: ${checks} checks passed`);

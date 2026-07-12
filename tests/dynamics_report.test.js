"use strict";

const assert = require("node:assert/strict");
const core = require("../web/dynamics-core.js");
const report = require("../web/dynamics-report.js");

let checks = 0;
function check(callback) {
  callback();
  checks += 1;
}

const objects = [
  {
    id: "D1",
    name: "质点 D1",
    dynamicsModel: "particle2d",
    kind: "particle",
    mass: 1,
    density: 7850,
    charge: 1,
    x: 0,
    y: 0,
    vx0: 0,
    vy0: 0,
    sizeA: 1,
    sizeB: 0.2,
    sizeC: 0.1,
  },
];

const fields = [
  {
    id: "F1",
    kind: "magnetic",
    magnitude: 0,
    magneticDirection: "out",
    rangeType: "global",
  },
];

const forces = [
  {
    id: "A1",
    targetId: "D1",
    type: "impulse",
    magnitude: 10,
    angle: 0,
    x: 10,
    y: 0,
    start: 0,
    duration: 0,
  },
];

const result = core.simulateScene({ objects, fields, forces, duration: 1, timeStep: 0.02 });
const options = new Set([
  "kinetic",
  "potential",
  "momentum",
  "velocity",
  "acceleration",
  "displacement",
  "trajectory_equation",
]);

check(() => {
  const text = report.buildResultText({ result, fields, forces, options });
  assert.match(text, /求解模块：二维多对象独立质点动力学/);
  assert.match(text, /场景：1 个对象，1 个场，1 个外加作用力/);
  assert.match(text, /用户请求步长：0\.02 s/);
  assert.match(text, /实际采用步长：0\.02 s/);
  assert.match(text, /系统总动能：50 J/);
  assert.match(text, /质点 D1：/);
  assert.match(text, /速度：vx=10 m\/s, vy=0 m\/s/);
  assert.match(text, /位移：Δx=10 m, Δy=0 m/);
  assert.doesNotMatch(text, /"objectResults"|\[object Object\]/);
});

check(() => {
  const text = report.buildReportText({
    objects,
    fields,
    forces,
    result,
    options,
    generatedAt: "2026-07-11T12:00:00+08:00",
  });
  for (const section of [
    "对象定义",
    "场定义",
    "外力定义",
    "控制方程与符号",
    "数值积分过程",
    "求解结果",
    "计算结论",
    "适用范围与限制",
  ]) {
    assert.ok(text.includes(section), `missing section ${section}`);
  }
  assert.match(text, /瞬时冲量 J=10 N·s/);
  assert.match(text, /平动方程：m·a=ΣF/);
  assert.match(text, /洛伦兹力：F_B=q\(v×B\)/);
  assert.match(text, /四阶 Runge-Kutta/);
  assert.match(text, /Yn\+1=Yn\+h\(k1\+2k2\+2k3\+k4\)\/6/);
  assert.match(text, /对象之间不发生碰撞、接触、约束或相互作用/);
});

check(() => {
  assert.equal(report.buildResultText({}), "暂无结果\n");
  assert.throws(() => report.buildReportText({ objects, fields, forces }), /缺少动力学求解结果/);
});

check(() => {
  const html = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "..", "web", "index.html"),
    "utf8"
  );
  const reportIndex = html.indexOf("/static/dynamics-report.js");
  const applicationIndex = html.indexOf("/static/app.js");
  assert.ok(reportIndex >= 0 && applicationIndex > reportIndex);
});

console.log(`dynamics-report: ${checks} checks passed`);

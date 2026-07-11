"use strict";

const assert = require("node:assert/strict");
const Units = require("../web/units.js");

function close(actual, expected, tolerance = Math.max(1, Math.abs(expected)) * 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

close(Units.parseQuantity("10000 mm^2", "m^2"), 0.01);
close(Units.parseQuantity("10000 mm²", "m^2"), 0.01);
close(Units.parseQuantity("80000000 mm^4", "m^4"), 8e-5);
close(Units.parseQuantity("80000000 mm⁴", "m^4"), 8e-5);
assert.equal(Units.parseQuantity("200 GPa", "Pa"), 2e11);
assert.equal(Units.parseQuantity("5 kN/m", "N/m"), 5000);
assert.equal(Units.parseQuantity("2 kN*m", "N*m"), 2000);
assert.equal(Units.parseQuantity("2 kN·m", "N*m"), 2000);

const area = Units.parseQuantity("10000 mm^2", "m^2");
const inertia = Units.parseQuantity("80000000 mm^4", "m^4");
const moment = Units.parseQuantity("45 kN*m", "N*m");
const extremeFiber = Math.sqrt(area) / 2;
const stress = (moment * extremeFiber) / inertia;
close(stress, 28.125e6);

assert.throws(() => Units.parseQuantity("10 mystery", "N"), /不支持的单位/);

console.log("frontend-units: 10 checks passed");

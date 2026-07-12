"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const expression = require("../web/dynamics-expression.js");

let checks = 0;
function check(callback) {
  callback();
  checks += 1;
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

check(() => {
  assert.equal(expression.evaluate("2 + 3 * 4 - 5", {}), 9);
  assert.equal(expression.evaluate("2^3^2", {}), 512);
  assert.equal(expression.evaluate("-2^2", {}), -4);
  close(expression.evaluate("2^-2", {}), 0.25);
});

check(() => {
  close(expression.evaluate("sin(pi / 2) + log(e) + tau / (2*pi)", {}), 3);
  close(expression.evaluate("hypot(3, 4) + clamp(9, 0, 2)", {}), 7);
  close(expression.evaluate("rad2deg(pi) + deg2rad(180)", {}), 180 + Math.PI);
});

check(() => {
  const program = expression.compile("t + 2*x - y + vx*vy", {
    allowedVariables: ["t", "x", "y", "vx", "vy"],
  });
  assert.deepEqual(program.variables, ["t", "x", "y", "vx", "vy"]);
  assert.equal(program.evaluate({ t: 1, x: 2, y: 3, vx: 4, vy: 5 }), 22);
  assert.ok(Object.isFrozen(program));
  assert.ok(Object.isFrozen(program.ast));
});

check(() => {
  assert.equal(expression.compile(4.5).evaluate(), 4.5);
  assert.throws(() => expression.compile(Infinity), expression.ExpressionSyntaxError);
  assert.throws(() => expression.compile({ source: "1" }), TypeError);
});

check(() => {
  assert.throws(
    () => expression.compile("t + x", { allowedVariables: ["t"] }),
    /当前模式不允许变量“x”/
  );
  assert.throws(() => expression.compile("x", { allowedVariables: ["not-a-variable"] }), /不支持的表达式变量/);
});

check(() => {
  const program = expression.compile("x + 1");
  assert.throws(() => program.evaluate({}), /缺少变量“x”/);
  assert.throws(() => program.evaluate({ x: "2" }), /必须是有限数值/);
  assert.throws(() => program.evaluate({ x: NaN }), /必须是有限数值/);
  assert.throws(() => program.evaluate(Object.create({ x: 2 })), /缺少变量“x”/);
});

check(() => {
  assert.throws(() => expression.evaluate("1 / 0"), expression.ExpressionEvaluationError);
  assert.throws(() => expression.evaluate("sqrt(-1)"), expression.ExpressionEvaluationError);
  assert.throws(() => expression.compile("1e999"), expression.ExpressionSyntaxError);
});

check(() => {
  for (const source of [
    "Math.sin(x)",
    "x.constructor",
    "x = 1",
    "[1, 2]",
    "{x: 1}",
    "'text'",
    "`text`",
    "1; process.exit()",
    "constructor()",
    "process",
    "x ? 1 : 0",
  ]) {
    assert.throws(() => expression.compile(source), expression.ExpressionSyntaxError, source);
  }
});

check(() => {
  assert.throws(() => expression.compile("2x"), /多余内容/);
  assert.throws(() => expression.compile("sin()"), /需要 1 个参数/);
  assert.throws(() => expression.compile("atan2(1)"), /需要 2 个参数/);
  assert.throws(() => expression.compile("max(1,)"), /尾随逗号/);
  assert.throws(() => expression.compile("(1 + 2"), /缺少右括号/);
});

check(() => {
  assert.throws(
    () => expression.compile("1 + 2 + 3", { limits: { maxExpressionLength: 5 } }),
    expression.ExpressionLimitError
  );
  assert.throws(
    () => expression.compile("x + y", { limits: { maxTokens: 2 } }),
    expression.ExpressionLimitError
  );
});

check(() => {
  assert.throws(
    () => expression.compile("-----x", { limits: { maxAstDepth: 3 } }),
    expression.ExpressionLimitError
  );
  assert.throws(
    () => expression.compile("((((1))))", { limits: { maxAstDepth: 3 } }),
    expression.ExpressionLimitError
  );
});

check(() => {
  const program = expression.compile("1 + 2 + 3", {
    limits: { maxEvaluationOperations: 4 },
  });
  assert.throws(() => program.evaluate(), expression.ExpressionLimitError);
});

check(() => {
  assert.throws(
    () => expression.compile("max(1,2,3,4,5,6,7,8,9)"),
    expression.ExpressionLimitError
  );
  assert.throws(
    () => expression.compile("1", { limits: { maxTokens: expression.HARD_LIMITS.maxTokens + 1 } }),
    RangeError
  );
});

check(() => {
  assert.throws(() => expression.tokenize("1", null), TypeError);
  assert.throws(() => expression.compile("1", null), TypeError);
  assert.throws(() => expression.compile("()"), /括号内不能为空/);
  assert.throws(() => expression.compile("* 2"), /此处需要数值/);
  assert.throws(() => expression.compile("1").evaluate(null), expression.ExpressionEvaluationError);
});

check(() => {
  const tokens = expression.tokenize(".5 + 2.5e-2 ** 2");
  assert.deepEqual(
    tokens.slice(0, -1).map((token) => [token.type, token.value]),
    [
      ["number", 0.5],
      ["operator", "+"],
      ["number", 0.025],
      ["operator", "^"],
      ["number", 2],
    ]
  );
  assert.ok(Object.isFrozen(tokens));
});

check(() => {
  const ast = expression.parse("max(abs(x), 2)");
  assert.equal(ast.type, "CallExpression");
  assert.equal(ast.callee, "max");
  assert.ok(Object.isFrozen(ast.arguments));
  assert.ok(Object.isFrozen(ast.arguments[0]));
});

check(() => {
  const source = fs.readFileSync(path.join(__dirname, "..", "web", "dynamics-expression.js"), "utf8");
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /new\s+Function\b/);
  assert.doesNotMatch(source, /\bFunction\s*\(/);
  assert.doesNotMatch(source, /document|localStorage/);
});

check(() => {
  const source = fs.readFileSync(path.join(__dirname, "..", "web", "dynamics-expression.js"), "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "dynamics-expression.js" });
  assert.equal(typeof sandbox.DynamicsExpression.compile, "function");
  assert.equal(sandbox.DynamicsExpression.evaluate("x + 1", { x: 2 }), 3);
});

console.log(`dynamics-expression: ${checks} checks passed`);

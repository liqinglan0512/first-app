"use strict";

(function exposeDynamicsFields(root, factory) {
  const expressionApi =
    typeof module === "object" && module.exports
      ? require("./dynamics-expression.js")
      : root.DynamicsExpression;
  const api = factory(expressionApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsFields = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsFields(Expression) {
  if (!Expression) throw new Error("DynamicsFields requires DynamicsExpression.");

  const FIELD_KINDS = Object.freeze(["gravity", "electric", "magnetic"]);
  const MODES = Object.freeze(["constant", "time", "space", "time-space"]);
  const REPRESENTATIONS = Object.freeze(["components", "magnitude-angle"]);
  const MODE_VARIABLES = Object.freeze({
    constant: Object.freeze([]),
    time: Object.freeze(["t"]),
    space: Object.freeze(["x", "y"]),
    "time-space": Object.freeze(["t", "x", "y", "vx", "vy"]),
  });
  const UNIT_CONTRACTS = Object.freeze({
    gravity: Object.freeze({ component: "m/s^2", magnitude: "m/s^2" }),
    electric: Object.freeze({ component: "N/C", magnitude: "N/C" }),
    magnetic: Object.freeze({ component: "T", magnitude: "T" }),
    angle: "deg",
    context: Object.freeze({ t: "s", x: "m", y: "m", vx: "m/s", vy: "m/s" }),
  });

  const compiledPrograms = new WeakSet();

  class FieldValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "FieldValidationError";
      this.code = "FIELD_VALIDATION";
    }
  }

  class FieldEvaluationError extends Error {
    constructor(message) {
      super(message);
      this.name = "FieldEvaluationError";
      this.code = "FIELD_EVALUATION";
    }
  }

  function own(record, key) {
    return Object.prototype.hasOwnProperty.call(record, key);
  }

  function plainRecord(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new FieldValidationError(`${label} 必须是对象。`);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new FieldValidationError(`${label} 必须是普通对象。`);
    }
    return value;
  }

  function finiteNumber(value, label, ErrorType = FieldEvaluationError) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ErrorType(`${label} 必须是有限数值。`);
    }
    return value;
  }

  function normalizeKind(value) {
    const kind = String(value || "");
    if (!FIELD_KINDS.includes(kind)) throw new FieldValidationError(`不支持的场类型：${kind || "(empty)"}。`);
    return kind;
  }

  function normalizeMode(value) {
    const mode = String(value || "constant");
    if (!MODES.includes(mode)) throw new FieldValidationError(`不支持的场变化模式：${mode}。`);
    return mode;
  }

  function normalizeRepresentation(value) {
    const representation = String(value || "components");
    if (!REPRESENTATIONS.includes(representation)) {
      throw new FieldValidationError(`不支持的场表达形式：${representation}。`);
    }
    return representation;
  }

  function normalizedUnitText(value) {
    return String(value || "")
      .trim()
      .replaceAll("²", "^2")
      .replaceAll("·", "*")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function canonicalUnit(value, dimension, label) {
    const normalized = normalizedUnitText(value);
    const aliases = {
      gravity: new Set(["m/s^2", "m*s^-2", "m/s/s"]),
      electric: new Set(["n/c", "v/m"]),
      magnetic: new Set(["t", "tesla"]),
      angle: new Set(["deg", "degree", "degrees", "°"]),
    };
    if (!aliases[dimension].has(normalized)) {
      const expected = dimension === "angle" ? UNIT_CONTRACTS.angle : UNIT_CONTRACTS[dimension].component;
      throw new FieldValidationError(`${label} 单位必须与 ${expected} 兼容。`);
    }
    return dimension === "angle" ? UNIT_CONTRACTS.angle : UNIT_CONTRACTS[dimension].component;
  }

  function expressionUnit(spec, key, dimension) {
    const units = spec.units === undefined ? {} : plainRecord(spec.units, "field.units");
    const provided = own(units, key) ? units[key] : spec.unit;
    const fallback = dimension === "angle" ? UNIT_CONTRACTS.angle : UNIT_CONTRACTS[dimension].component;
    return provided === undefined ? fallback : canonicalUnit(provided, dimension, `field.units.${key}`);
  }

  function expressionValue(expressions, key) {
    if (!own(expressions, key)) throw new FieldValidationError(`缺少场表达式 expressions.${key}。`);
    const value = expressions[key];
    if (typeof value === "number") {
      finiteNumber(value, `expressions.${key}`, FieldValidationError);
      return value;
    }
    if (typeof value !== "string" || !value.trim()) {
      throw new FieldValidationError(`expressions.${key} 必须是非空字符串或有限数值。`);
    }
    return value;
  }

  function compileExpressions(spec, kind, mode, representation, options) {
    const expressions = plainRecord(spec.expressions, "field.expressions");
    let keys;
    if (kind === "magnetic") {
      if (representation !== "components") {
        throw new FieldValidationError("二维磁场必须使用 components 表达形式并提供有符号 z 分量。");
      }
      keys = ["z"];
    } else {
      keys = representation === "components" ? ["x", "y"] : ["magnitude", "angle"];
    }

    const compiled = {};
    const sources = {};
    const variables = new Set();
    for (const key of keys) {
      const value = expressionValue(expressions, key);
      let program;
      try {
        program = Expression.compile(value, {
          allowedVariables: MODE_VARIABLES[mode],
          limits: options.expressionLimits || {},
        });
      } catch (error) {
        if (
          error instanceof Expression.ExpressionSyntaxError ||
          error instanceof Expression.ExpressionLimitError
        ) {
          throw new FieldValidationError(`expressions.${key} 无效：${error.message}`);
        }
        throw error;
      }
      compiled[key] = program;
      sources[key] = program.source;
      for (const variable of program.variables) variables.add(variable);
    }

    return {
      compiled: Object.freeze(compiled),
      sources: Object.freeze(sources),
      variables: Object.freeze(Expression.VARIABLE_NAMES.filter((name) => variables.has(name))),
      keys,
    };
  }

  function outputUnits(spec, kind, representation, keys) {
    const result = {};
    for (const key of keys) {
      const dimension = key === "angle" ? "angle" : kind;
      result[key] = expressionUnit(spec, key, dimension);
    }
    if (kind !== "magnetic" && representation === "components") {
      result.magnitude = UNIT_CONTRACTS[kind].magnitude;
      result.angle = UNIT_CONTRACTS.angle;
    }
    if (kind !== "magnetic" && representation === "magnitude-angle") {
      result.x = UNIT_CONTRACTS[kind].component;
      result.y = UNIT_CONTRACTS[kind].component;
    }
    if (kind === "magnetic") result.magnitude = UNIT_CONTRACTS.magnetic.magnitude;
    return Object.freeze(result);
  }

  function evaluatedValue(program, context, label) {
    let value;
    try {
      value = program.evaluate(context);
    } catch (error) {
      if (
        error instanceof Expression.ExpressionEvaluationError ||
        error instanceof Expression.ExpressionLimitError
      ) {
        throw new FieldEvaluationError(`${label} 求值失败：${error.message}`);
      }
      throw error;
    }
    return finiteNumber(value, label);
  }

  function evaluateCompiled(program, compiled, context) {
    if (context === null || typeof context !== "object" || Array.isArray(context)) {
      throw new FieldEvaluationError("场求值上下文必须是对象。");
    }
    const base = {
      kind: program.kind,
      mode: program.mode,
      representation: program.representation,
      units: program.units,
    };

    if (program.kind === "magnetic") {
      const z = evaluatedValue(compiled.z, context, "磁场 z 分量");
      return deepFreeze({
        ...base,
        z,
        magnitude: Math.abs(z),
        magneticDirection: z < 0 ? "in" : "out",
      });
    }

    if (program.representation === "components") {
      const x = evaluatedValue(compiled.x, context, `${program.kind} x 分量`);
      const y = evaluatedValue(compiled.y, context, `${program.kind} y 分量`);
      const magnitude = finiteNumber(Math.hypot(x, y), `${program.kind} 幅值`);
      const angle = magnitude === 0 ? 0 : Math.atan2(y, x) * (180 / Math.PI);
      return deepFreeze({ ...base, x, y, magnitude, angle });
    }

    const magnitude = evaluatedValue(compiled.magnitude, context, `${program.kind} 幅值`);
    if (magnitude < 0) throw new FieldEvaluationError(`${program.kind} 幅值不能为负数。`);
    const angle = evaluatedValue(compiled.angle, context, `${program.kind} 角度`);
    const radians = angle * (Math.PI / 180);
    const x = finiteNumber(magnitude * Math.cos(radians), `${program.kind} x 分量`);
    const y = finiteNumber(magnitude * Math.sin(radians), `${program.kind} y 分量`);
    return deepFreeze({ ...base, x, y, magnitude, angle });
  }

  function compileField(specValue, options = {}) {
    const spec = plainRecord(specValue, "field");
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new FieldValidationError("场编译选项必须是对象。");
    }
    const kind = normalizeKind(spec.kind);
    const mode = normalizeMode(spec.mode);
    const representation = normalizeRepresentation(spec.representation);
    const compiledMetadata = compileExpressions(spec, kind, mode, representation, options);
    const units = outputUnits(spec, kind, representation, compiledMetadata.keys);
    const program = {
      kind,
      mode,
      representation,
      expressions: compiledMetadata.sources,
      variables: compiledMetadata.variables,
      units,
      evaluate(context = {}) {
        return evaluateCompiled(program, compiledMetadata.compiled, context);
      },
    };
    compiledPrograms.add(program);
    return Object.freeze(program);
  }

  function isCompiledField(value) {
    return Boolean(value && typeof value === "object" && compiledPrograms.has(value));
  }

  function compiledField(value, options) {
    return isCompiledField(value) ? value : compileField(value, options);
  }

  function compileFields(specs, options = {}) {
    if (!Array.isArray(specs)) throw new FieldValidationError("fields 必须是数组。");
    return Object.freeze(specs.map((spec) => compileField(spec, options)));
  }

  function evaluateField(field, context = {}, options = {}) {
    return compiledField(field, options).evaluate(context);
  }

  function evaluateFields(fields, context = {}, options = {}) {
    if (!Array.isArray(fields)) throw new FieldValidationError("fields 必须是数组。");
    return Object.freeze(fields.map((field) => evaluateField(field, context, options)));
  }

  function particleContext(stateValue, timeValue) {
    const state = plainEvaluationRecord(stateValue, "state");
    const time = timeValue === undefined ? state.t : timeValue;
    return Object.freeze({
      t: finiteNumber(time, "state.t"),
      x: finiteNumber(state.x, "state.x"),
      y: finiteNumber(state.y, "state.y"),
      vx: finiteNumber(state.vx, "state.vx"),
      vy: finiteNumber(state.vy, "state.vy"),
    });
  }

  function plainEvaluationRecord(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new FieldEvaluationError(`${label} 必须是对象。`);
    }
    return value;
  }

  function particleProperties(value) {
    const particle = plainEvaluationRecord(value, "particle");
    const mass = finiteNumber(particle.mass, "particle.mass");
    if (!(mass > 0)) throw new FieldEvaluationError("particle.mass 必须大于 0。");
    const charge = particle.charge === undefined ? 0 : finiteNumber(particle.charge, "particle.charge");
    return Object.freeze({ mass, charge });
  }

  function accelerationFromEvaluated(evaluatedFields, context, particle) {
    let x = 0;
    let y = 0;
    for (const field of evaluatedFields) {
      if (field.kind === "gravity") {
        x += field.x;
        y += field.y;
      } else if (field.kind === "electric") {
        x += (particle.charge * field.x) / particle.mass;
        y += (particle.charge * field.y) / particle.mass;
      } else if (field.kind === "magnetic") {
        x += (particle.charge * context.vy * field.z) / particle.mass;
        y -= (particle.charge * context.vx * field.z) / particle.mass;
      }
      finiteNumber(x, "合成加速度 x");
      finiteNumber(y, "合成加速度 y");
    }
    return Object.freeze({ x, y });
  }

  function accelerationAt(fields, state, particle, options = {}) {
    const context = particleContext(state);
    const properties = particleProperties(particle);
    const evaluated = evaluateFields(fields, context, options);
    return accelerationFromEvaluated(evaluated, context, properties);
  }

  function createParticleDerivative(fields, particle, options = {}) {
    if (!Array.isArray(fields)) throw new FieldValidationError("fields 必须是数组。");
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new FieldValidationError("导数选项必须是对象。");
    }
    const programs = Object.freeze(fields.map((field) => compiledField(field, options)));
    const properties = particleProperties(particle);
    const observer = options.observeEvaluation;
    if (observer !== undefined && typeof observer !== "function") {
      throw new FieldValidationError("observeEvaluation 必须是函数。");
    }

    return function particleDerivative(state, time) {
      const context = particleContext(state, time);
      const evaluated = Object.freeze(programs.map((program) => program.evaluate(context)));
      const acceleration = accelerationFromEvaluated(evaluated, context, properties);
      if (observer) observer(Object.freeze({ context, fields: evaluated, acceleration }));
      return Object.freeze({
        x: context.vx,
        y: context.vy,
        vx: acceleration.x,
        vy: acceleration.y,
      });
    };
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  return Object.freeze({
    FIELD_KINDS,
    MODES,
    REPRESENTATIONS,
    MODE_VARIABLES,
    UNIT_CONTRACTS,
    FieldValidationError,
    FieldEvaluationError,
    compileField,
    compileFields,
    isCompiledField,
    evaluateField,
    evaluateFields,
    accelerationAt,
    createParticleDerivative,
  });
});

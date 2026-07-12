"use strict";

(function exposeDynamicsExpression(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsExpression = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsExpression() {
  const VARIABLE_NAMES = Object.freeze(["t", "x", "y", "vx", "vy"]);
  const CONSTANTS = Object.freeze({
    e: Math.E,
    pi: Math.PI,
    tau: 2 * Math.PI,
  });

  const DEFAULT_LIMITS = Object.freeze({
    maxExpressionLength: 512,
    maxTokens: 256,
    maxAstDepth: 32,
    maxEvaluationOperations: 512,
    maxFunctionArguments: 8,
  });

  const HARD_LIMITS = Object.freeze({
    maxExpressionLength: 4096,
    maxTokens: 1024,
    maxAstDepth: 64,
    maxEvaluationOperations: 2048,
    maxFunctionArguments: 16,
  });

  const FUNCTIONS = Object.freeze({
    abs: definition(Math.abs, 1),
    sqrt: definition(Math.sqrt, 1),
    cbrt: definition(Math.cbrt, 1),
    exp: definition(Math.exp, 1),
    log: definition(Math.log, 1),
    ln: definition(Math.log, 1),
    log10: definition(Math.log10, 1),
    sin: definition(Math.sin, 1),
    cos: definition(Math.cos, 1),
    tan: definition(Math.tan, 1),
    asin: definition(Math.asin, 1),
    acos: definition(Math.acos, 1),
    atan: definition(Math.atan, 1),
    atan2: definition(Math.atan2, 2),
    sinh: definition(Math.sinh, 1),
    cosh: definition(Math.cosh, 1),
    tanh: definition(Math.tanh, 1),
    floor: definition(Math.floor, 1),
    ceil: definition(Math.ceil, 1),
    round: definition(Math.round, 1),
    trunc: definition(Math.trunc, 1),
    sign: definition(Math.sign, 1),
    min: definition(Math.min, 1, 8),
    max: definition(Math.max, 1, 8),
    hypot: definition(Math.hypot, 1, 8),
    pow: definition(Math.pow, 2),
    clamp: definition((value, lower, upper) => Math.min(Math.max(value, lower), upper), 3),
    deg2rad: definition((degrees) => degrees * (Math.PI / 180), 1),
    rad2deg: definition((radians) => radians * (180 / Math.PI), 1),
  });

  class ExpressionSyntaxError extends Error {
    constructor(message, position = null) {
      super(position === null ? message : `${message}（位置 ${position}）`);
      this.name = "ExpressionSyntaxError";
      this.code = "EXPRESSION_SYNTAX";
      this.position = position;
    }
  }

  class ExpressionLimitError extends Error {
    constructor(message) {
      super(message);
      this.name = "ExpressionLimitError";
      this.code = "EXPRESSION_LIMIT";
    }
  }

  class ExpressionEvaluationError extends Error {
    constructor(message) {
      super(message);
      this.name = "ExpressionEvaluationError";
      this.code = "EXPRESSION_EVALUATION";
    }
  }

  function definition(fn, minimumArguments, maximumArguments = minimumArguments) {
    return Object.freeze({ fn, minimumArguments, maximumArguments });
  }

  function own(record, key) {
    return Object.prototype.hasOwnProperty.call(record, key);
  }

  function normalizedSource(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new ExpressionSyntaxError("表达式常量必须是有限数值。");
      return String(value);
    }
    if (typeof value !== "string") throw new TypeError("表达式必须是字符串或有限数值。");
    const source = value.trim();
    if (!source) throw new ExpressionSyntaxError("表达式不能为空。", 0);
    return source;
  }

  function normalizedLimits(overrides = {}) {
    if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
      throw new TypeError("表达式限制必须是对象。");
    }
    const limits = {};
    for (const name of Object.keys(DEFAULT_LIMITS)) {
      const raw = own(overrides, name) ? overrides[name] : DEFAULT_LIMITS[name];
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > HARD_LIMITS[name]) {
        throw new RangeError(`${name} 必须是 1 到 ${HARD_LIMITS[name]} 之间的整数。`);
      }
      limits[name] = value;
    }
    return Object.freeze(limits);
  }

  function normalizedAllowedVariables(value) {
    if (value === undefined) return new Set(VARIABLE_NAMES);
    const values = value instanceof Set ? [...value] : value;
    if (!Array.isArray(values)) throw new TypeError("allowedVariables 必须是数组或 Set。");
    const allowed = new Set();
    for (const name of values) {
      const normalized = String(name);
      if (!VARIABLE_NAMES.includes(normalized)) {
        throw new RangeError(`不支持的表达式变量：${normalized}。`);
      }
      allowed.add(normalized);
    }
    return allowed;
  }

  function tokenize(sourceValue, limitOverrides = {}) {
    const source = normalizedSource(sourceValue);
    const limits = normalizedLimits(limitOverrides);
    if (source.length > limits.maxExpressionLength) {
      throw new ExpressionLimitError(`表达式长度超过 ${limits.maxExpressionLength} 个字符。`);
    }

    const tokens = [];
    let index = 0;
    const push = (type, value, position) => {
      if (tokens.length >= limits.maxTokens) {
        throw new ExpressionLimitError(`表达式 token 数超过 ${limits.maxTokens}。`);
      }
      tokens.push(Object.freeze({ type, value, position }));
    };

    while (index < source.length) {
      const character = source[index];
      if (/\s/.test(character)) {
        index += 1;
        continue;
      }

      const remainder = source.slice(index);
      const numberMatch = /^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/.exec(remainder);
      if (numberMatch) {
        const numeric = Number(numberMatch[0]);
        if (!Number.isFinite(numeric)) throw new ExpressionSyntaxError("数值字面量不是有限值。", index);
        push("number", numeric, index);
        index += numberMatch[0].length;
        continue;
      }

      const identifierMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(remainder);
      if (identifierMatch) {
        push("identifier", identifierMatch[0], index);
        index += identifierMatch[0].length;
        continue;
      }

      if (remainder.startsWith("**")) {
        push("operator", "^", index);
        index += 2;
        continue;
      }
      if ("+-*/%^".includes(character)) {
        push("operator", character, index);
        index += 1;
        continue;
      }
      if (character === "(" || character === ")") {
        push("parenthesis", character, index);
        index += 1;
        continue;
      }
      if (character === ",") {
        push("comma", character, index);
        index += 1;
        continue;
      }
      throw new ExpressionSyntaxError(`不允许的字符“${character}”。`, index);
    }

    tokens.push(Object.freeze({ type: "eof", value: "", position: source.length }));
    return Object.freeze(tokens);
  }

  class Parser {
    constructor(tokens, limits, allowedVariables) {
      this.tokens = tokens;
      this.limits = limits;
      this.allowedVariables = allowedVariables;
      this.index = 0;
      this.groupDepth = 0;
    }

    current() {
      return this.tokens[this.index];
    }

    advance() {
      const token = this.current();
      this.index += 1;
      return token;
    }

    matches(type, value) {
      const token = this.current();
      return token.type === type && (value === undefined || token.value === value);
    }

    expect(type, value, message) {
      if (!this.matches(type, value)) {
        const token = this.current();
        throw new ExpressionSyntaxError(message, token.position);
      }
      return this.advance();
    }

    parse() {
      const ast = this.parseAdditive();
      this.expect("eof", undefined, "表达式末尾存在多余内容。");
      const depth = astDepth(ast);
      if (depth > this.limits.maxAstDepth) {
        throw new ExpressionLimitError(`表达式 AST 深度 ${depth} 超过上限 ${this.limits.maxAstDepth}。`);
      }
      return ast;
    }

    parseAdditive() {
      let node = this.parseMultiplicative();
      while (this.matches("operator", "+") || this.matches("operator", "-")) {
        const operator = this.advance();
        node = binaryNode(operator.value, node, this.parseMultiplicative(), operator.position);
      }
      return node;
    }

    parseMultiplicative() {
      let node = this.parseUnary();
      while (
        this.matches("operator", "*") ||
        this.matches("operator", "/") ||
        this.matches("operator", "%")
      ) {
        const operator = this.advance();
        node = binaryNode(operator.value, node, this.parseUnary(), operator.position);
      }
      return node;
    }

    parseUnary() {
      if (this.matches("operator", "+") || this.matches("operator", "-")) {
        const operator = this.advance();
        return { type: "UnaryExpression", operator: operator.value, argument: this.parseUnary(), position: operator.position };
      }
      return this.parsePower();
    }

    parsePower() {
      let node = this.parsePrimary();
      if (this.matches("operator", "^")) {
        const operator = this.advance();
        node = binaryNode("^", node, this.parseUnary(), operator.position);
      }
      return node;
    }

    parsePrimary() {
      const token = this.current();
      if (token.type === "number") {
        this.advance();
        return { type: "Literal", value: token.value, position: token.position };
      }

      if (token.type === "identifier") {
        this.advance();
        if (this.matches("parenthesis", "(")) return this.parseCall(token);
        if (own(CONSTANTS, token.value)) {
          return { type: "Constant", name: token.value, position: token.position };
        }
        if (VARIABLE_NAMES.includes(token.value)) {
          if (!this.allowedVariables.has(token.value)) {
            throw new ExpressionSyntaxError(`当前模式不允许变量“${token.value}”。`, token.position);
          }
          return { type: "Variable", name: token.value, position: token.position };
        }
        throw new ExpressionSyntaxError(`不允许的标识符“${token.value}”。`, token.position);
      }

      if (this.matches("parenthesis", "(")) {
        const opening = this.advance();
        this.groupDepth += 1;
        if (this.groupDepth > this.limits.maxAstDepth) {
          throw new ExpressionLimitError(`表达式分组深度超过 ${this.limits.maxAstDepth}。`);
        }
        if (this.matches("parenthesis", ")")) {
          throw new ExpressionSyntaxError("括号内不能为空。", opening.position);
        }
        const node = this.parseAdditive();
        this.expect("parenthesis", ")", "缺少右括号。");
        this.groupDepth -= 1;
        return node;
      }

      throw new ExpressionSyntaxError("此处需要数值、变量、常量、函数或括号表达式。", token.position);
    }

    parseCall(identifier) {
      const definitionValue = own(FUNCTIONS, identifier.value) ? FUNCTIONS[identifier.value] : null;
      if (!definitionValue) {
        throw new ExpressionSyntaxError(`不允许的函数“${identifier.value}”。`, identifier.position);
      }
      this.advance();
      const argumentsValue = [];
      if (!this.matches("parenthesis", ")")) {
        while (true) {
          if (argumentsValue.length >= this.limits.maxFunctionArguments) {
            throw new ExpressionLimitError(`函数参数数超过 ${this.limits.maxFunctionArguments}。`);
          }
          argumentsValue.push(this.parseAdditive());
          if (!this.matches("comma")) break;
          this.advance();
          if (this.matches("parenthesis", ")")) {
            throw new ExpressionSyntaxError("函数调用不允许尾随逗号。", this.current().position);
          }
        }
      }
      this.expect("parenthesis", ")", "函数调用缺少右括号。");
      const count = argumentsValue.length;
      if (count < definitionValue.minimumArguments || count > definitionValue.maximumArguments) {
        const expected =
          definitionValue.minimumArguments === definitionValue.maximumArguments
            ? `${definitionValue.minimumArguments}`
            : `${definitionValue.minimumArguments}–${definitionValue.maximumArguments}`;
        throw new ExpressionSyntaxError(`函数 ${identifier.value} 需要 ${expected} 个参数，实际为 ${count}。`, identifier.position);
      }
      return {
        type: "CallExpression",
        callee: identifier.value,
        arguments: argumentsValue,
        position: identifier.position,
      };
    }
  }

  function binaryNode(operator, left, right, position) {
    return { type: "BinaryExpression", operator, left, right, position };
  }

  function astDepth(node) {
    if (!node || typeof node !== "object") return 0;
    if (node.type === "UnaryExpression") return 1 + astDepth(node.argument);
    if (node.type === "BinaryExpression") return 1 + Math.max(astDepth(node.left), astDepth(node.right));
    if (node.type === "CallExpression") {
      return 1 + Math.max(0, ...node.arguments.map(astDepth));
    }
    return 1;
  }

  function collectVariables(node, variables = new Set()) {
    if (node.type === "Variable") variables.add(node.name);
    if (node.type === "UnaryExpression") collectVariables(node.argument, variables);
    if (node.type === "BinaryExpression") {
      collectVariables(node.left, variables);
      collectVariables(node.right, variables);
    }
    if (node.type === "CallExpression") {
      for (const argument of node.arguments) collectVariables(argument, variables);
    }
    return variables;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function parseWithMetadata(sourceValue, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("表达式选项必须是对象。");
    }
    const source = normalizedSource(sourceValue);
    const limits = normalizedLimits(options.limits || {});
    const allowedVariables = normalizedAllowedVariables(options.allowedVariables);
    const tokens = tokenize(source, limits);
    const ast = deepFreeze(new Parser(tokens, limits, allowedVariables).parse());
    const variables = Object.freeze(
      VARIABLE_NAMES.filter((name) => collectVariables(ast).has(name))
    );
    return Object.freeze({ source, ast, variables, limits });
  }

  function evaluateAst(ast, context, limits) {
    if (context === null || typeof context !== "object" || Array.isArray(context)) {
      throw new ExpressionEvaluationError("表达式上下文必须是对象。");
    }
    const state = { operations: 0, maximum: limits.maxEvaluationOperations };

    const consume = () => {
      state.operations += 1;
      if (state.operations > state.maximum) {
        throw new ExpressionLimitError(`表达式求值操作数超过 ${state.maximum}。`);
      }
    };

    const finiteResult = (value, label) => {
      if (!Number.isFinite(value)) throw new ExpressionEvaluationError(`${label}产生了非有限值。`);
      return value;
    };

    const visit = (node) => {
      consume();
      if (node.type === "Literal") return node.value;
      if (node.type === "Constant") return CONSTANTS[node.name];
      if (node.type === "Variable") {
        if (!own(context, node.name)) {
          throw new ExpressionEvaluationError(`缺少变量“${node.name}”。`);
        }
        const value = context[node.name];
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new ExpressionEvaluationError(`变量“${node.name}”必须是有限数值。`);
        }
        return value;
      }
      if (node.type === "UnaryExpression") {
        const value = visit(node.argument);
        return finiteResult(node.operator === "-" ? -value : value, `一元运算 ${node.operator}`);
      }
      if (node.type === "BinaryExpression") {
        const left = visit(node.left);
        const right = visit(node.right);
        const operations = {
          "+": () => left + right,
          "-": () => left - right,
          "*": () => left * right,
          "/": () => left / right,
          "%": () => left % right,
          "^": () => Math.pow(left, right),
        };
        return finiteResult(operations[node.operator](), `二元运算 ${node.operator}`);
      }
      if (node.type === "CallExpression") {
        const definitionValue = FUNCTIONS[node.callee];
        const argumentsValue = node.arguments.map(visit);
        return finiteResult(definitionValue.fn(...argumentsValue), `函数 ${node.callee}`);
      }
      throw new ExpressionEvaluationError("表达式 AST 含未知节点。");
    };

    return visit(ast);
  }

  function compile(sourceValue, options = {}) {
    const metadata = parseWithMetadata(sourceValue, options);
    return Object.freeze({
      source: metadata.source,
      ast: metadata.ast,
      variables: metadata.variables,
      limits: metadata.limits,
      evaluate(context = {}) {
        return evaluateAst(metadata.ast, context, metadata.limits);
      },
    });
  }

  function parse(sourceValue, options = {}) {
    return parseWithMetadata(sourceValue, options).ast;
  }

  function evaluate(sourceValue, context = {}, options = {}) {
    return compile(sourceValue, options).evaluate(context);
  }

  return Object.freeze({
    VARIABLE_NAMES,
    CONSTANTS,
    FUNCTION_NAMES: Object.freeze(Object.keys(FUNCTIONS)),
    DEFAULT_LIMITS,
    HARD_LIMITS,
    ExpressionSyntaxError,
    ExpressionLimitError,
    ExpressionEvaluationError,
    tokenize,
    parse,
    compile,
    evaluate,
  });
});

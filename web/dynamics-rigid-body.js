"use strict";

(function exposeDynamicsRigidBody(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsRigidBody = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsRigidBody() {
  const EPSILON = 1e-12;

  function finiteNumber(value, label, fallback) {
    if ((value === undefined || value === null || value === "") && fallback !== undefined) return fallback;
    if (typeof value === "boolean") throw new TypeError(`${label} must be a finite number.`);
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be a finite number.`);
    return numeric;
  }

  function nonNegativeNumber(value, label, fallback = 0) {
    const numeric = finiteNumber(value, label, fallback);
    if (numeric < 0) throw new RangeError(`${label} must be greater than or equal to zero.`);
    return numeric;
  }

  function positiveNumber(value, label, fallback) {
    const numeric = finiteNumber(value, label, fallback);
    if (!(numeric > 0)) throw new RangeError(`${label} must be greater than zero.`);
    return numeric;
  }

  function vector(value, label = "vector", fallback = { x: 0, y: 0 }) {
    const source = value && typeof value === "object" ? value : fallback;
    return {
      x: finiteNumber(source.x, `${label}.x`, fallback.x),
      y: finiteNumber(source.y, `${label}.y`, fallback.y),
    };
  }

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  function scale(value, factor) {
    return { x: value.x * factor, y: value.y * factor };
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function cross(a, b) {
    return a.x * b.y - a.y * b.x;
  }

  function crossScalarVector(scalar, value) {
    return { x: -scalar * value.y, y: scalar * value.x };
  }

  function magnitude(value) {
    return Math.hypot(value.x, value.y);
  }

  function rotate(value, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return {
      x: cosine * value.x - sine * value.y,
      y: sine * value.x + cosine * value.y,
    };
  }

  function unrotate(value, angle) {
    return rotate(value, -angle);
  }

  function nestedValue(raw, group, field, flatFields, fallback) {
    const nested = raw?.[group];
    if (nested && typeof nested === "object" && nested[field] !== undefined) return nested[field];
    for (const flatField of flatFields) {
      if (raw?.[flatField] !== undefined) return raw[flatField];
    }
    return fallback;
  }

  function geometryKind(raw) {
    return String(raw?.geometry?.kind || raw?.kind || "particle");
  }

  function explicitCollisionRadius(raw) {
    const candidates = [
      raw?.geometry?.collisionRadius,
      raw?.geometry?.radius,
      raw?.contact?.collisionRadius,
      raw?.collision?.collisionRadius,
      raw?.collisionRadius,
    ];
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null && candidate !== "") {
        return positiveNumber(candidate, "collisionRadius");
      }
    }
    return null;
  }

  function inferredCollisionRadius(raw, kind) {
    const explicit = explicitCollisionRadius(raw);
    if (explicit !== null) return { radius: explicit, explicit: true };
    if (kind === "circle" || kind === "ring") {
      const candidate = raw?.geometry?.sizeB ?? raw?.sizeB;
      if (candidate !== undefined && candidate !== null && candidate !== "") {
        return { radius: positiveNumber(candidate, "geometry.sizeB"), explicit: false };
      }
    }
    return { radius: null, explicit: false };
  }

  function estimateInertia(kind, mass, raw, collisionRadius) {
    const explicit = raw?.massProperties?.inertia ?? raw?.inertia;
    if (explicit !== undefined && explicit !== null && explicit !== "" && explicit !== "auto") {
      return positiveNumber(explicit, "massProperties.inertia");
    }

    const sizeA = Math.abs(finiteNumber(raw?.geometry?.sizeA ?? raw?.sizeA, "geometry.sizeA", 0));
    const sizeB = Math.abs(finiteNumber(raw?.geometry?.sizeB ?? raw?.sizeB, "geometry.sizeB", 0));
    if (kind === "particle") return 0;
    if (kind === "circle") {
      const radius = sizeB > 0 ? sizeB : collisionRadius;
      const safeRadius = positiveNumber(radius, "circle radius");
      return 0.5 * mass * safeRadius * safeRadius;
    }
    if (kind === "ring") {
      const radius = sizeB > 0 ? sizeB : collisionRadius;
      const safeRadius = positiveNumber(radius, "ring radius");
      return mass * safeRadius * safeRadius;
    }
    if (kind === "rod") {
      const length = positiveNumber(sizeA, "rod length");
      return (mass * length * length) / 12;
    }
    if (kind === "rectangle") {
      const width = positiveNumber(sizeA, "rectangle width");
      const height = positiveNumber(sizeB, "rectangle height");
      return (mass * (width * width + height * height)) / 12;
    }
    throw new RangeError(`Geometry ${kind} requires an explicit positive inertia.`);
  }

  function createBody(raw = {}) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("Rigid body input must be an object.");
    }
    const kind = geometryKind(raw);
    const bodyType = String(raw.bodyType || raw.motionType || "dynamic");
    if (!new Set(["dynamic", "static", "kinematic"]).has(bodyType)) {
      throw new RangeError(`Unsupported body type: ${bodyType}.`);
    }
    const mass = positiveNumber(raw?.massProperties?.mass ?? raw.mass, "mass", 1);
    const radius = inferredCollisionRadius(raw, kind);
    const position = vector(
      raw.position || raw.initialState?.position || {
        x: nestedValue(raw, "initialState", "x", ["x"], 0),
        y: nestedValue(raw, "initialState", "y", ["y"], 0),
      },
      "position"
    );
    const velocity = vector(
      raw.velocity || raw.initialState?.velocity || {
        x: nestedValue(raw, "initialState", "vx", ["vx", "vx0"], 0),
        y: nestedValue(raw, "initialState", "vy", ["vy", "vy0"], 0),
      },
      "velocity"
    );
    const angle = finiteNumber(
      raw.initialState?.theta ?? raw.initialState?.angle ?? raw.theta ?? raw.theta0 ?? raw.angle,
      "angle",
      0
    );
    const angularVelocity = finiteNumber(
      raw.initialState?.omega ?? raw.initialState?.angularVelocity ?? raw.omega ?? raw.omega0 ?? raw.angularVelocity,
      "angularVelocity",
      0
    );
    const localCenterOfMass = vector(
      raw?.massProperties?.centerOfMass || raw.localCenterOfMass,
      "massProperties.centerOfMass"
    );
    const inertia = bodyType === "dynamic" ? estimateInertia(kind, mass, raw, radius.radius) : Infinity;
    const inverseMass = bodyType === "dynamic" ? 1 / mass : 0;
    const inverseInertia = bodyType === "dynamic" && inertia > EPSILON && Number.isFinite(inertia) ? 1 / inertia : 0;
    const force = vector(raw.force, "force");
    const torque = finiteNumber(raw.torque, "torque", 0);

    const body = {
      id: String(raw.id || "body"),
      name: String(raw.name || raw.id || "body"),
      bodyType,
      kind,
      mass,
      inverseMass,
      inertia,
      inverseInertia,
      position,
      centerOfMass: position,
      localCenterOfMass,
      velocity,
      angle,
      angularVelocity: bodyType === "kinematic" ? angularVelocity : inverseInertia > 0 ? angularVelocity : 0,
      force,
      torque,
      linearDamping: nonNegativeNumber(raw.linearDamping ?? raw?.damping?.linear, "linearDamping", 0),
      angularDamping: nonNegativeNumber(raw.angularDamping ?? raw?.damping?.angular, "angularDamping", 0),
      collisionRadius: radius.radius,
      collisionRadiusExplicit: radius.explicit,
      contact: raw.contact || raw.collision?.material || null,
      userData: raw.userData ?? null,
    };
    Object.defineProperty(body, "__rigidBody2d", { value: true, enumerable: false });
    return body;
  }

  function isBody(value) {
    return Boolean(value?.__rigidBody2d);
  }

  function cloneBody(rawBody) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    return createBody({
      id: body.id,
      name: body.name,
      bodyType: body.bodyType,
      kind: body.kind,
      mass: body.mass,
      inertia: Number.isFinite(body.inertia) && body.inertia > 0 ? body.inertia : undefined,
      position: body.position,
      velocity: body.velocity,
      angle: body.angle,
      angularVelocity: body.angularVelocity,
      force: body.force,
      torque: body.torque,
      linearDamping: body.linearDamping,
      angularDamping: body.angularDamping,
      collisionRadius: body.collisionRadius,
      massProperties: { centerOfMass: body.localCenterOfMass, inertia: body.inertia > 0 ? body.inertia : undefined },
      contact: body.contact,
      userData: body.userData,
    });
  }

  function applicationOffsetWorld(rawBody, applicationPoint = null) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    if (applicationPoint === null || applicationPoint === undefined || applicationPoint === "center") {
      return { x: 0, y: 0 };
    }
    if (!applicationPoint || typeof applicationPoint !== "object" || Array.isArray(applicationPoint)) {
      throw new TypeError("applicationPoint must be an object, center, or null.");
    }
    const frame = String(applicationPoint.frame || "local");
    if (frame === "center" || frame === "com") return { x: 0, y: 0 };
    const point = vector(applicationPoint, "applicationPoint");
    if (frame === "local") return rotate(point, body.angle);
    if (frame === "world") return subtract(point, body.position);
    throw new RangeError(`Unsupported application point frame: ${frame}.`);
  }

  function applicationPointWorld(rawBody, applicationPoint = null) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    return add(body.position, applicationOffsetWorld(body, applicationPoint));
  }

  function localPointFromWorld(rawBody, worldPoint) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    return unrotate(subtract(vector(worldPoint, "worldPoint"), body.position), body.angle);
  }

  function pointVelocity(rawBody, applicationPoint = null) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    const offset = applicationOffsetWorld(body, applicationPoint);
    return add(body.velocity, crossScalarVector(body.angularVelocity, offset));
  }

  function clearAccumulators(rawBody) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    body.force.x = 0;
    body.force.y = 0;
    body.torque = 0;
    return body;
  }

  function accumulateForce(rawBody, forceValue, applicationPoint = null) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    const appliedForce = vector(forceValue, "force");
    const offset = applicationOffsetWorld(body, applicationPoint);
    const appliedTorque = cross(offset, appliedForce);
    body.force.x += appliedForce.x;
    body.force.y += appliedForce.y;
    body.torque += appliedTorque;
    return { body, force: appliedForce, offset, torque: appliedTorque };
  }

  function kineticEnergy(rawBody) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    if (body.bodyType !== "dynamic") return 0;
    const translation = 0.5 * body.mass * dot(body.velocity, body.velocity);
    const rotation = body.inertia > 0 && Number.isFinite(body.inertia)
      ? 0.5 * body.inertia * body.angularVelocity * body.angularVelocity
      : 0;
    return translation + rotation;
  }

  function linearMomentum(rawBody) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    if (body.bodyType !== "dynamic") return { x: 0, y: 0 };
    return scale(body.velocity, body.mass);
  }

  function angularMomentum(rawBody, origin = { x: 0, y: 0 }) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    if (body.bodyType !== "dynamic") return 0;
    const lever = subtract(body.position, vector(origin, "origin"));
    const orbital = cross(lever, linearMomentum(body));
    const spin = body.inertia > 0 && Number.isFinite(body.inertia) ? body.inertia * body.angularVelocity : 0;
    return orbital + spin;
  }

  function applyImpulse(rawBody, impulseValue, applicationPoint = null) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    const impulse = vector(impulseValue, "impulse");
    const offset = applicationOffsetWorld(body, applicationPoint);
    const angularImpulse = cross(offset, impulse);
    const energyBefore = kineticEnergy(body);
    if (body.bodyType === "dynamic") {
      body.velocity.x += impulse.x * body.inverseMass;
      body.velocity.y += impulse.y * body.inverseMass;
      body.angularVelocity += angularImpulse * body.inverseInertia;
    }
    return {
      body,
      impulse,
      offset,
      angularImpulse,
      deltaVelocity: scale(impulse, body.inverseMass),
      deltaAngularVelocity: angularImpulse * body.inverseInertia,
      energyChange: kineticEnergy(body) - energyBefore,
    };
  }

  function integrateVelocity(rawBody, timeStep, options = {}) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    const step = positiveNumber(timeStep, "timeStep");
    if (body.bodyType !== "dynamic") return body;
    const gravity = vector(options.gravity, "gravity");
    body.velocity.x += (body.force.x * body.inverseMass + gravity.x) * step;
    body.velocity.y += (body.force.y * body.inverseMass + gravity.y) * step;
    body.angularVelocity += body.torque * body.inverseInertia * step;
    const linearFactor = Math.exp(-body.linearDamping * step);
    const angularFactor = Math.exp(-body.angularDamping * step);
    body.velocity.x *= linearFactor;
    body.velocity.y *= linearFactor;
    body.angularVelocity *= angularFactor;
    return body;
  }

  function integratePosition(rawBody, timeStep) {
    const body = isBody(rawBody) ? rawBody : createBody(rawBody);
    const step = positiveNumber(timeStep, "timeStep");
    if (body.bodyType === "static") return body;
    body.position.x += body.velocity.x * step;
    body.position.y += body.velocity.y * step;
    body.angle += body.angularVelocity * step;
    return body;
  }

  function integrateBody(rawBody, timeStep, options = {}) {
    const body = integrateVelocity(rawBody, timeStep, options);
    integratePosition(body, timeStep);
    if (options.clearAccumulators) clearAccumulators(body);
    return body;
  }

  return {
    EPSILON,
    finiteNumber,
    vector,
    add,
    subtract,
    scale,
    dot,
    cross,
    crossScalarVector,
    magnitude,
    rotate,
    unrotate,
    createBody,
    cloneBody,
    isBody,
    estimateInertia,
    applicationOffsetWorld,
    applicationPointWorld,
    localPointFromWorld,
    pointVelocity,
    clearAccumulators,
    accumulateForce,
    applyImpulse,
    integrateVelocity,
    integratePosition,
    integrateBody,
    kineticEnergy,
    linearMomentum,
    angularMomentum,
  };
});

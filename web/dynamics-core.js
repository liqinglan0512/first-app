"use strict";

(function exposeDynamicsCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsCore() {
  const DEFAULT_LIMITS = Object.freeze({
    maxStepsPerObject: 100_000,
    maxTotalSamples: 300_000,
  });

  function finiteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function vectorFromAngle(magnitude, angleDegrees) {
    const radians = finiteNumber(angleDegrees) * (Math.PI / 180);
    const length = finiteNumber(magnitude);
    return { x: length * Math.cos(radians), y: length * Math.sin(radians) };
  }

  function sumVectors(vectors) {
    return (vectors || []).reduce(
      (sum, vector) => ({ x: sum.x + finiteNumber(vector?.x), y: sum.y + finiteNumber(vector?.y) }),
      { x: 0, y: 0 }
    );
  }

  function applyImpulse(velocity, impulse, mass) {
    const safeMass = Math.max(finiteNumber(mass), 1e-12);
    return {
      x: finiteNumber(velocity?.x) + finiteNumber(impulse?.x) / safeMass,
      y: finiteNumber(velocity?.y) + finiteNumber(impulse?.y) / safeMass,
    };
  }

  function rk4Step(body, step, derivative, time = 0) {
    const h = finiteNumber(step);
    const offset = (value, slope, factor) => ({
      x: value.x + slope.x * factor,
      y: value.y + slope.y * factor,
      vx: value.vx + slope.vx * factor,
      vy: value.vy + slope.vy * factor,
    });
    const k1 = derivative(body, time);
    const k2 = derivative(offset(body, k1, h / 2), time + h / 2);
    const k3 = derivative(offset(body, k2, h / 2), time + h / 2);
    const k4 = derivative(offset(body, k3, h), time + h);
    return {
      x: body.x + (h / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: body.y + (h / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      vx: body.vx + (h / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
      vy: body.vy + (h / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
    };
  }

  function pointInPolygon(point, polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i];
      const b = polygon[j];
      const intersects =
        (finiteNumber(a.y) > point.y) !== (finiteNumber(b.y) > point.y) &&
        point.x <
          ((finiteNumber(b.x) - finiteNumber(a.x)) * (point.y - finiteNumber(a.y))) /
            (finiteNumber(b.y) - finiteNumber(a.y) || 1e-30) +
            finiteNumber(a.x);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function pointInField(point, field) {
    if (!field || field.kind === "zero") return false;
    const rangeType = field.rangeType || "rectangle";
    if (rangeType === "global") return true;
    if (rangeType === "circle") {
      return (
        Math.hypot(point.x - finiteNumber(field.centerX), point.y - finiteNumber(field.centerY)) <=
        Math.max(finiteNumber(field.radius), 0)
      );
    }
    if (rangeType === "custom") return pointInPolygon(point, field.path);
    return (
      Math.abs(point.x - finiteNumber(field.centerX)) <= Math.max(finiteNumber(field.width), 0) / 2 &&
      Math.abs(point.y - finiteNumber(field.centerY)) <= Math.max(finiteNumber(field.height), 0) / 2
    );
  }

  function fieldVector(field) {
    if (!field || field.kind === "zero" || field.kind === "magnetic") return { x: 0, y: 0 };
    return vectorFromAngle(finiteNumber(field.magnitude), finiteNumber(field.angle));
  }

  function impulseForObject(forces, objectId) {
    return sumVectors(
      (forces || [])
        .filter((force) => force.targetId === objectId && force.type === "impulse")
        .map((force) => ({ x: force.x, y: force.y }))
    );
  }

  function continuousForceAt(forces, objectId, time) {
    return sumVectors(
      (forces || [])
        .filter((force) => {
          const start = Math.max(finiteNumber(force.start), 0);
          const duration = Math.max(finiteNumber(force.duration), 0);
          if (force.targetId !== objectId || force.type !== "continuous" || time < start) return false;
          return duration <= 0 || time <= start + duration + 1e-10;
        })
        .map((force) => ({ x: force.x, y: force.y }))
    );
  }

  function electromagneticForceAt(body, object, fields) {
    const force = { x: 0, y: 0 };
    for (const field of fields || []) {
      if (!pointInField(body, field)) continue;
      if (field.kind === "electric") {
        const vector = fieldVector(field);
        force.x += object.charge * vector.x;
        force.y += object.charge * vector.y;
      } else if (field.kind === "magnetic") {
        const bz = finiteNumber(field.magnitude) * (field.magneticDirection === "in" ? -1 : 1);
        force.x += object.charge * body.vy * bz;
        force.y -= object.charge * body.vx * bz;
      }
    }
    return force;
  }

  function accelerationAt(body, object, time, fields, forces) {
    const external = continuousForceAt(forces, object.id, time);
    const acceleration = { x: external.x / object.mass, y: external.y / object.mass };
    for (const field of fields || []) {
      if (!pointInField(body, field)) continue;
      if (field.kind === "gravity") {
        const vector = fieldVector(field);
        acceleration.x += vector.x;
        acceleration.y += vector.y;
      } else if (field.kind === "electric") {
        const vector = fieldVector(field);
        acceleration.x += (object.charge * vector.x) / object.mass;
        acceleration.y += (object.charge * vector.y) / object.mass;
      } else if (field.kind === "magnetic") {
        const bz = finiteNumber(field.magnitude) * (field.magneticDirection === "in" ? -1 : 1);
        acceleration.x += (object.charge * body.vy * bz) / object.mass;
        acceleration.y -= (object.charge * body.vx * bz) / object.mass;
      }
    }
    return acceleration;
  }

  function potentialEnergyAt(body, object, fields) {
    let potential = 0;
    for (const field of fields || []) {
      if (!pointInField(body, field)) continue;
      if (field.kind === "gravity") {
        const vector = fieldVector(field);
        potential -= object.mass * (vector.x * body.x + vector.y * body.y);
      } else if (field.kind === "electric") {
        const vector = fieldVector(field);
        potential -= object.charge * (vector.x * body.x + vector.y * body.y);
      }
    }
    return potential;
  }

  function inertiaEstimate(kind, mass, sizeA, sizeB) {
    const a = Math.max(Math.abs(finiteNumber(sizeA)), 1e-9);
    const b = Math.max(Math.abs(finiteNumber(sizeB)), 1e-9);
    if (kind === "particle") return mass * b * b;
    if (kind === "rod") return (mass * a * a) / 12;
    if (kind === "circle") return 0.5 * mass * b * b;
    if (kind === "ring") return mass * b * b;
    return (mass * (a * a + b * b)) / 12;
  }

  function normalizeObject(raw) {
    const geometry = raw?.geometry || {};
    const massProperties = raw?.massProperties || {};
    const initialState = raw?.initialState || {};
    const mass = Math.max(finiteNumber(massProperties.mass ?? raw?.mass, 1), 1e-12);
    return {
      id: String(raw?.id || "object"),
      name: String(raw?.name || raw?.id || "对象"),
      dynamicsModel: String(raw?.dynamicsModel || "particle2d"),
      kind: String(geometry.kind || raw?.kind || "particle"),
      x: finiteNumber(initialState.x ?? raw?.x),
      y: finiteNumber(initialState.y ?? raw?.y),
      vx0: finiteNumber(initialState.vx ?? raw?.vx0),
      vy0: finiteNumber(initialState.vy ?? raw?.vy0),
      mass,
      density: Math.max(finiteNumber(massProperties.density ?? raw?.density), 0),
      charge: finiteNumber(massProperties.charge ?? raw?.charge),
      sizeA: Math.max(Math.abs(finiteNumber(geometry.sizeA ?? raw?.sizeA, 1)), 1e-9),
      sizeB: Math.max(Math.abs(finiteNumber(geometry.sizeB ?? raw?.sizeB, 0.2)), 1e-9),
      sizeC: Math.max(Math.abs(finiteNumber(geometry.sizeC ?? raw?.sizeC, 0.1)), 1e-9),
      materialE: Math.max(finiteNumber(raw?.materialE), 0),
      path: geometry.path || raw?.path || null,
      equation: String(geometry.equation || raw?.equation || ""),
    };
  }

  function trajectoryModel(samples, object, fields, forces, initialVelocity) {
    const fieldsAreConstant = (fields || []).every((field) => {
      if (field.kind === "magnetic") return false;
      const initiallyInside = pointInField(samples[0], field);
      return samples.every((sample) => pointInField(sample, field) === initiallyInside);
    });
    const forcesAreConstant = (forces || [])
      .filter((force) => force.targetId === object.id && force.type === "continuous")
      .every((force) => finiteNumber(force.start) === 0 && finiteNumber(force.duration) === 0);
    if (!fieldsAreConstant || !forcesAreConstant) return { kind: "numerical" };
    const acceleration = accelerationAt(
      { x: object.x, y: object.y, vx: initialVelocity.x, vy: initialVelocity.y },
      object,
      0,
      fields,
      forces
    );
    return {
      kind: "constant-acceleration",
      x0: object.x,
      y0: object.y,
      vx0: initialVelocity.x,
      vy0: initialVelocity.y,
      ax: acceleration.x,
      ay: acceleration.y,
    };
  }

  function simulateObject({ object: rawObject, fields = [], forces = [], duration, timeStep }) {
    const object = normalizeObject(rawObject);
    const impulse = impulseForObject(forces, object.id);
    const initialVelocity = applyImpulse({ x: object.vx0, y: object.vy0 }, impulse, object.mass);
    const samples = [];
    let body = { x: object.x, y: object.y, vx: initialVelocity.x, vy: initialVelocity.y };
    let time = 0;
    const derivative = (value, sampleTime) => {
      const acceleration = accelerationAt(value, object, sampleTime, fields, forces);
      return { x: value.vx, y: value.vy, vx: acceleration.x, vy: acceleration.y };
    };
    while (time < duration - 1e-10) {
      const acceleration = accelerationAt(body, object, time, fields, forces);
      samples.push({ ...body, ax: acceleration.x, ay: acceleration.y, t: time });
      const step = Math.min(timeStep, duration - time);
      body = rk4Step(body, step, derivative, time);
      time += step;
    }
    const finalAcceleration = accelerationAt(body, object, duration, fields, forces);
    samples.push({ ...body, ax: finalAcceleration.x, ay: finalAcceleration.y, t: duration });
    const final = samples[samples.length - 1];
    const initial = samples[0];
    const speed = Math.hypot(final.vx, final.vy);
    const initialSpeed = Math.hypot(initial.vx, initial.vy);
    const kineticEnergy = 0.5 * object.mass * speed * speed;
    const initialKineticEnergy = 0.5 * object.mass * initialSpeed * initialSpeed;
    const potentialEnergy = potentialEnergyAt(final, object, fields);
    const initialPotentialEnergy = potentialEnergyAt(initial, object, fields);
    const orbitalAngularMomentum = object.mass * (final.x * final.vy - final.y * final.vx);
    return {
      objectId: object.id,
      name: object.name,
      buildKind: object.kind,
      dynamicsModel: object.dynamicsModel,
      mass: object.mass,
      charge: object.charge,
      x0: object.x,
      y0: object.y,
      vx0: initialVelocity.x,
      vy0: initialVelocity.y,
      ax: final.ax,
      ay: final.ay,
      duration,
      timeStep,
      sizeA: object.sizeA,
      sizeB: object.sizeB,
      sizeC: object.sizeC,
      inertia: inertiaEstimate(object.kind, object.mass, object.sizeA, object.sizeB),
      final,
      samples,
      kineticEnergy,
      potentialEnergy,
      mechanicalEnergy: kineticEnergy + potentialEnergy,
      initialMechanicalEnergy: initialKineticEnergy + initialPotentialEnergy,
      momentum: { x: object.mass * final.vx, y: object.mass * final.vy },
      orbitalAngularMomentum,
      angularMomentum: orbitalAngularMomentum,
      lorentzForce: electromagneticForceAt(final, object, fields),
      trajectoryModel: trajectoryModel(samples, object, fields, forces, initialVelocity),
    };
  }

  function hasFinitePotentialField(fields) {
    return (fields || []).some(
      (field) => (field.kind === "gravity" || field.kind === "electric") && field.rangeType !== "global"
    );
  }

  function simulateScene(scene) {
    const objects = Array.isArray(scene?.objects) ? scene.objects : [];
    const fields = Array.isArray(scene?.fields) ? scene.fields : [];
    const forces = Array.isArray(scene?.forces) ? scene.forces : [];
    const duration = finiteNumber(scene?.duration);
    const timeStep = finiteNumber(scene?.timeStep);
    const limits = { ...DEFAULT_LIMITS, ...(scene?.limits || {}) };
    if (!objects.length) throw new Error("场景中没有可求解对象。");
    if (!(duration > 0)) throw new Error("总时长必须大于 0。");
    if (!(timeStep > 0)) throw new Error("积分步长必须大于 0。");
    const stepCount = Math.ceil(duration / timeStep);
    const totalSampleCount = (stepCount + 1) * objects.length;
    if (stepCount > limits.maxStepsPerObject) {
      throw new Error(`单对象积分步数 ${stepCount} 超过上限 ${limits.maxStepsPerObject}，请增大步长或缩短时长。`);
    }
    if (totalSampleCount > limits.maxTotalSamples) {
      throw new Error(`预计生成 ${totalSampleCount} 个样本，超过浏览器安全上限 ${limits.maxTotalSamples}。`);
    }
    const objectResults = objects.map((object) => simulateObject({ object, fields, forces, duration, timeStep }));
    const totals = objectResults.reduce(
      (sum, result) => ({
        kineticEnergy: sum.kineticEnergy + result.kineticEnergy,
        potentialEnergy: sum.potentialEnergy + result.potentialEnergy,
        momentumX: sum.momentumX + result.momentum.x,
        momentumY: sum.momentumY + result.momentum.y,
        orbitalAngularMomentum: sum.orbitalAngularMomentum + result.orbitalAngularMomentum,
      }),
      { kineticEnergy: 0, potentialEnergy: 0, momentumX: 0, momentumY: 0, orbitalAngularMomentum: 0 }
    );
    totals.mechanicalEnergy = totals.kineticEnergy + totals.potentialEnergy;
    totals.angularMomentum = totals.orbitalAngularMomentum;
    const diagnostics = [];
    if (hasFinitePotentialField(fields)) {
      diagnostics.push({
        level: "warning",
        code: "finite_field_potential_reference",
        message: "当前存在有限区域重力场或电场，势能参考在边界处不连续，机械能仅作局部估算。",
      });
    }
    if (objects.length > 1) {
      diagnostics.push({
        level: "info",
        code: "independent_objects",
        message: "对象按彼此独立的质点求解，当前不包含碰撞、约束和对象间相互作用。",
      });
    }
    return {
      model: "independent-particle2d",
      duration,
      requestedTimeStep: timeStep,
      timeStep,
      stepCount,
      totalSampleCount,
      objectResults,
      totals,
      diagnostics,
    };
  }

  function sampleAtTime(samples, time, timeStep) {
    if (!Array.isArray(samples) || !samples.length) return { x: 0, y: 0, t: 0 };
    const step = Math.max(finiteNumber(timeStep), 1e-12);
    const index = Math.max(0, Math.min(samples.length - 1, Math.round(finiteNumber(time) / step)));
    return samples[index];
  }

  return {
    DEFAULT_LIMITS,
    vectorFromAngle,
    sumVectors,
    applyImpulse,
    rk4Step,
    pointInField,
    fieldVector,
    continuousForceAt,
    impulseForObject,
    electromagneticForceAt,
    accelerationAt,
    potentialEnergyAt,
    inertiaEstimate,
    normalizeObject,
    simulateObject,
    simulateScene,
    sampleAtTime,
  };
});

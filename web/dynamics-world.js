"use strict";

(function exposeDynamicsWorld(root, factory) {
  const commonJs = typeof module === "object" && module.exports;
  const api = factory(
    commonJs ? require("./units.js") : root.Units,
    commonJs ? require("./project-schema.js") : root.ProjectSchema,
    commonJs ? require("./dynamics-core.js") : root.DynamicsCore,
    commonJs ? require("./dynamics-rigid-body.js") : root.DynamicsRigidBody,
    commonJs ? require("./dynamics-contact.js") : root.DynamicsContact,
    commonJs ? require("./dynamics-tracks.js") : root.DynamicsTracks,
    commonJs ? require("./dynamics-fields.js") : root.DynamicsFields
  );
  if (commonJs) module.exports = api;
  root.DynamicsWorld = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsWorld(
  Units,
  ProjectSchema,
  DynamicsCore,
  DynamicsRigidBody,
  DynamicsContact,
  DynamicsTracks,
  DynamicsFields
) {
  for (const [name, dependency] of Object.entries({
    Units,
    ProjectSchema,
    DynamicsCore,
    DynamicsRigidBody,
    DynamicsContact,
    DynamicsTracks,
    DynamicsFields,
  })) {
    if (!dependency) throw new Error(`DynamicsWorld requires ${name}.`);
  }

  const DEFAULT_OPTIONS = Object.freeze({
    contactIterations: 12,
    positionIterations: 4,
    maxSubsteps: 512,
    maxSteps: 100_000,
    maxSamples: 300_000,
  });

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function quantity(value, unit) {
    if (typeof value === "number") return value;
    return Units.parseQuantity(value, unit);
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function objectParts(raw) {
    const geometry = raw?.geometry || {};
    const massProperties = raw?.massProperties || {};
    const initialState = raw?.initialState || {};
    const kind = String(geometry.kind || raw?.kind || "particle");
    const radius = finite(geometry.collisionRadius ?? raw?.collisionRadius ?? geometry.sizeB ?? raw?.sizeB, 0.2);
    return {
      id: String(raw?.id || "body"),
      name: String(raw?.name || raw?.id || "对象"),
      kind,
      mass: Math.max(finite(massProperties.mass ?? raw?.mass, 1), 1e-12),
      charge: finite(massProperties.charge ?? raw?.charge),
      inertia: massProperties.inertia ?? raw?.inertia,
      centerOfMass: massProperties.centerOfMass ?? raw?.centerOfMass ?? { x: 0, y: 0 },
      x: finite(initialState.x ?? raw?.x),
      y: finite(initialState.y ?? raw?.y),
      vx: finite(initialState.vx ?? raw?.vx0),
      vy: finite(initialState.vy ?? raw?.vy0),
      angle: finite(initialState.theta ?? initialState.angle ?? raw?.theta0 ?? raw?.angle),
      angularVelocity: finite(initialState.omega ?? raw?.omega0 ?? raw?.angularVelocity),
      collisionRadius: Math.max(radius, 1e-9),
      sizeA: Math.max(finite(geometry.sizeA ?? raw?.sizeA, 1), 1e-9),
      sizeB: Math.max(finite(geometry.sizeB ?? raw?.sizeB, radius), 1e-9),
      sizeC: Math.max(finite(geometry.sizeC ?? raw?.sizeC, 0.1), 1e-9),
      contact: clone(raw?.contact || {}),
      raw,
    };
  }

  function createBody(raw) {
    const parts = objectParts(raw);
    return DynamicsRigidBody.createBody({
      id: parts.id,
      name: parts.name,
      kind: parts.kind,
      geometry: {
        kind: parts.kind,
        sizeA: parts.sizeA,
        sizeB: parts.sizeB,
        sizeC: parts.sizeC,
        collisionRadius: parts.collisionRadius,
      },
      massProperties: {
        mass: parts.mass,
        charge: parts.charge,
        inertia: parts.inertia,
        centerOfMass: parts.centerOfMass,
      },
      initialState: {
        x: parts.x,
        y: parts.y,
        vx: parts.vx,
        vy: parts.vy,
        theta: parts.angle,
        omega: parts.angularVelocity,
      },
      x: parts.x,
      y: parts.y,
      vx: parts.vx,
      vy: parts.vy,
      angle: parts.angle,
      angularVelocity: parts.angularVelocity,
      mass: parts.mass,
      inertia: parts.inertia,
      collisionRadius: parts.collisionRadius,
      contact: parts.contact,
    });
  }

  function bodyState(body, time, acceleration = { x: 0, y: 0 }) {
    return {
      t: time,
      x: finite(body.position?.x ?? body.x),
      y: finite(body.position?.y ?? body.y),
      vx: finite(body.velocity?.x ?? body.vx),
      vy: finite(body.velocity?.y ?? body.vy),
      ax: finite(acceleration.x),
      ay: finite(acceleration.y),
      angle: finite(body.angle ?? body.theta),
      theta: finite(body.angle ?? body.theta),
      angularVelocity: finite(body.angularVelocity ?? body.omega),
      omega: finite(body.angularVelocity ?? body.omega),
      angularAcceleration: finite(body.lastAngularAcceleration),
      torque: finite(body.lastTorque),
    };
  }

  function forceIsActive(force, time) {
    if (force.type !== "continuous") return false;
    const start = Math.max(finite(force.start), 0);
    const duration = Math.max(finite(force.duration), 0);
    return time >= start - 1e-12 && (duration <= 0 || time <= start + duration + 1e-12);
  }

  function variableFieldSpec(field) {
    const variation = field.variation ?? field.expression;
    if (!variation) return null;
    const expressions = { ...(variation.expressions || variation.components || {}) };
    const representation = variation.representation || "components";
    const units = variation.units
      ? { ...variation.units }
      : Object.fromEntries(
          Object.keys(expressions).map((key) => [key, key === "angle" ? variation.angleUnit || "deg" : variation.unit])
        );
    return {
      kind: field.kind,
      mode: variation.mode,
      representation,
      expressions,
      units,
    };
  }

  function prepareFields(fields) {
    const constant = [];
    const variable = [];
    for (const field of fields || []) {
      const spec = variableFieldSpec(field);
      if (spec) variable.push({ source: field, program: DynamicsFields.compileField(spec) });
      else constant.push(field);
    }
    return { constant, variable };
  }

  function accelerationFor(body, parts, preparedFields, time) {
    const state = bodyState(body, time);
    const constantAcceleration = DynamicsCore.accelerationAt(
      state,
      { id: parts.id, mass: parts.mass, charge: parts.charge },
      time,
      preparedFields.constant,
      []
    );
    const activeVariable = preparedFields.variable
      .filter((entry) => DynamicsCore.pointInField(state, entry.source))
      .map((entry) => entry.program);
    const variableAcceleration = activeVariable.length
      ? DynamicsFields.accelerationAt(activeVariable, state, {
          id: parts.id,
          mass: parts.mass,
          charge: parts.charge,
        })
      : { x: 0, y: 0 };
    return {
      x: finite(constantAcceleration.x) + finite(variableAcceleration.x),
      y: finite(constantAcceleration.y) + finite(variableAcceleration.y),
    };
  }

  function activeContinuousForce(forces, time) {
    return (forces || []).reduce(
      (sum, force) => {
        if (!forceIsActive(force, time)) return sum;
        sum.x += finite(force.x);
        sum.y += finite(force.y);
        return sum;
      },
      { x: 0, y: 0 }
    );
  }

  function particleDerivative(parts, preparedFields, forces, options = {}) {
    const particle = { id: parts.id, mass: parts.mass, charge: parts.charge };
    return function derivative(state, time) {
      const activeVariable = preparedFields.variable
        .filter((entry) => DynamicsCore.pointInField(state, entry.source))
        .map((entry) => entry.program);
      const variable = activeVariable.length
        ? DynamicsFields.createParticleDerivative(activeVariable, particle, {
            observeEvaluation: options.observeFieldEvaluation,
          })(state, time)
        : { x: state.vx, y: state.vy, vx: 0, vy: 0 };
      const constant = DynamicsCore.accelerationAt(state, particle, time, preparedFields.constant, []);
      const applied = activeContinuousForce(forces, time);
      return {
        x: state.vx,
        y: state.vy,
        vx: finite(variable.vx) + finite(constant.x) + applied.x / parts.mass,
        vy: finite(variable.vy) + finite(constant.y) + applied.y / parts.mass,
      };
    };
  }

  function torqueAt(body, forces, time, predicted) {
    let torque = 0;
    const angle = finite(predicted?.angle ?? body.angle);
    const position = predicted?.position || body.position;
    for (const force of forces || []) {
      if (!forceIsActive(force, time)) continue;
      const point = force.applicationPoint;
      if (!point || (point.frame !== "world" && Math.abs(finite(point.x)) <= 1e-15 && Math.abs(finite(point.y)) <= 1e-15)) {
        continue;
      }
      const offset =
        point.frame === "world"
          ? { x: finite(point.x) - finite(position.x), y: finite(point.y) - finite(position.y) }
          : DynamicsRigidBody.rotate({ x: finite(point.x), y: finite(point.y) }, angle);
      torque += DynamicsRigidBody.cross(offset, { x: finite(force.x), y: finite(force.y) });
    }
    return torque;
  }

  function integrateExternalRk4(body, parts, forces, preparedFields, time, step, options = {}) {
    const current = bodyState(body, time);
    const derivative = particleDerivative(parts, preparedFields, forces, options);
    const next = DynamicsCore.rk4Step(current, step, derivative, time);
    const midpoint = {
      position: { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 },
      angle: body.angle + (body.angularVelocity * step) / 2,
    };
    const torque = torqueAt(body, forces, time + step / 2, midpoint);
    const angularAcceleration = body.inverseInertia > 0 ? torque * body.inverseInertia : 0;
    body.lastTorque = torque;
    body.lastAngularAcceleration = angularAcceleration;
    body.position.x = next.x;
    body.position.y = next.y;
    body.velocity.x = next.vx;
    body.velocity.y = next.vy;
    body.angle += body.angularVelocity * step + 0.5 * angularAcceleration * step * step;
    body.angularVelocity += angularAcceleration * step;
    if (body.linearDamping > 0) {
      const factor = Math.exp(-body.linearDamping * step);
      body.velocity.x *= factor;
      body.velocity.y *= factor;
    }
    if (body.angularDamping > 0) body.angularVelocity *= Math.exp(-body.angularDamping * step);
    return { body, angularAcceleration };
  }

  function externalAdaptiveSubsteps(
    contactBodies,
    partsById,
    forcesByBody,
    preparedFields,
    time,
    step,
    options = {}
  ) {
    if (!contactBodies.length) return 1;
    const fraction = finite(options.maxTravelFraction, 0.25);
    const maximum = Math.max(1, Math.floor(finite(options.maxSubsteps, DEFAULT_OPTIONS.maxSubsteps)));
    let required = 1;
    for (const body of contactBodies) {
      const id = String(body.id);
      const parts = partsById.get(id);
      const state = bodyState(body, time);
      const derivative = particleDerivative(parts, preparedFields, forcesByBody.get(id), {});
      let accelerationMagnitude = 0;
      for (const stageTime of [time, time + step / 2, time + step]) {
        const slope = derivative(state, stageTime);
        accelerationMagnitude = Math.max(accelerationMagnitude, Math.hypot(slope.vx, slope.vy));
      }
      const travel = Math.hypot(state.vx, state.vy) * step + 0.5 * accelerationMagnitude * step * step;
      const radius = Math.max(finite(body.collisionRadius), 1e-9);
      required = Math.max(required, Math.ceil(travel / Math.max(fraction * radius, 1e-12)));
    }
    if (required > maximum) {
      const error = new Error(`自适应接触积分需要 ${required} 个子步，超过 maxSubsteps=${maximum}。`);
      error.code = "CONTACT_SUBSTEP_LIMIT";
      throw error;
    }
    return required;
  }

  function initialImpulse(body, forces) {
    for (const force of forces || []) {
      if (force.type !== "impulse") continue;
      DynamicsRigidBody.applyImpulse(
        body,
        { x: finite(force.x), y: finite(force.y) },
        force.applicationPoint || null
      );
    }
  }

  function totalsForBodies(bodies) {
    return bodies.reduce(
      (totals, body) => {
        const momentum = DynamicsRigidBody.linearMomentum(body);
        totals.kineticEnergy += finite(DynamicsRigidBody.kineticEnergy(body));
        totals.momentumX += finite(momentum.x);
        totals.momentumY += finite(momentum.y);
        totals.angularMomentum += finite(DynamicsRigidBody.angularMomentum(body));
        return totals;
      },
      { kineticEnergy: 0, momentumX: 0, momentumY: 0, angularMomentum: 0 }
    );
  }

  function resultForBody(body, parts, samples, preparedFields) {
    const final = samples[samples.length - 1];
    const momentum = DynamicsRigidBody.linearMomentum(body);
    const potentialEnergyAvailable = preparedFields.variable.length === 0;
    const potentialEnergy = potentialEnergyAvailable
      ? DynamicsCore.potentialEnergyAt(
          final,
          { mass: parts.mass, charge: parts.charge },
          preparedFields.constant
        )
      : null;
    return {
      objectId: parts.id,
      name: parts.name,
      buildKind: parts.kind,
      dynamicsModel: "rigid-body2d",
      mass: parts.mass,
      charge: parts.charge,
      x0: parts.x,
      y0: parts.y,
      vx0: samples[0]?.vx ?? parts.vx,
      vy0: samples[0]?.vy ?? parts.vy,
      inertia: finite(body.inertia),
      collisionRadius: parts.collisionRadius,
      samples,
      final,
      kineticEnergy: DynamicsRigidBody.kineticEnergy(body),
      potentialEnergy,
      potentialEnergyAvailable,
      mechanicalEnergy: potentialEnergyAvailable ? DynamicsRigidBody.kineticEnergy(body) + potentialEnergy : null,
      momentum,
      angularMomentum: DynamicsRigidBody.angularMomentum(body),
      orbitalAngularMomentum: parts.mass * (final.x * final.vy - final.y * final.vx),
      angularVelocity: final.angularVelocity,
      angle: final.angle,
      sizeA: parts.sizeA,
      sizeB: parts.sizeB,
      sizeC: parts.sizeC,
    };
  }

  function endpointBehavior(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, mode]) => [key, endpointBehavior(mode)]));
    }
    return { release: "open", reflect: "bounce" }[value] || value || "open";
  }

  function framePoint(frame) {
    return frame.point || frame.position || { x: finite(frame.x), y: finite(frame.y) };
  }

  function trackObjectResult(
    project,
    constraint,
    trackSpec,
    rawObject,
    objectForces,
    duration,
    timeStep,
    preparedFields
  ) {
    const parts = objectParts(rawObject);
    const engineTrackSpec = {
      ...trackSpec,
      ...(trackSpec.geometry || {}),
      endpointBehavior: endpointBehavior(trackSpec.endpointBehavior),
    };
    const track = DynamicsTracks.createTrack(engineTrackSpec);
    const initialBody = createBody(rawObject);
    initialImpulse(initialBody, objectForces);
    const projection = DynamicsTracks.projectPoint(track, initialBody.position);
    const initialS = finite(constraint.initialState?.s ?? constraint.s ?? projection.s);
    const tangent = track.tangentAt(initialS);
    const initialSpeed = finite(
      constraint.initialState?.speed ??
        constraint.speed ??
        initialBody.velocity.x * tangent.x + initialBody.velocity.y * tangent.y
    );
    const offCenterContinuous = (objectForces || []).find((force) => {
      if (force.type !== "continuous") return false;
      const point = force.applicationPoint;
      return point && (point.frame === "world" || Math.abs(finite(point.x)) > 1e-12 || Math.abs(finite(point.y)) > 1e-12);
    });
    if (offCenterContinuous) {
      throw new Error(`轨道约束对象 ${parts.id} 暂不支持带偏心作用点的持续力；请改用质心力或自由刚体。`);
    }
    const requiresAccelerationCallback =
      preparedFields.variable.length > 0 ||
      preparedFields.constant.some(
        (field) => field.rangeType !== "global" || field.kind === "magnetic"
      ) ||
      (objectForces || []).some((force) => force.type === "continuous");
    const constantAcceleration = requiresAccelerationCallback
      ? { x: 0, y: 0 }
      : accelerationFor(initialBody, parts, preparedFields, 0);
    const externalAcceleration = requiresAccelerationCallback
      ? ({ time, frame, state }) => {
          const velocity = {
            x: finite(frame.tangent?.x) * finite(state.v),
            y: finite(frame.tangent?.y) * finite(state.v),
          };
          const acceleration = accelerationFor(
            { position: frame.point, velocity },
            parts,
            preparedFields,
            time
          );
          const force = activeContinuousForce(objectForces, time);
          return { x: acceleration.x + force.x / parts.mass, y: acceleration.y + force.y / parts.mass };
        }
      : undefined;
    const material = trackSpec.contact || trackSpec.material || {};
    const simulation = DynamicsTracks.simulateTrackMotion({
      track,
      body: {
        type: constraint.rolling || trackSpec.rolling ? "solid-disk" : "particle",
        mass: parts.mass,
        radius: parts.collisionRadius,
      },
      initialState: {
        s: initialS,
        speed: initialSpeed,
        omega: initialBody.angularVelocity,
        sliding: constraint.initialState?.sliding,
      },
      gravity: constantAcceleration,
      externalAcceleration,
      duration,
      timeStep,
      staticFriction: finite(material.staticFriction),
      kineticFriction: finite(material.dynamicFriction),
      restitution: finite(material.restitution),
      endpointBehavior: endpointBehavior(trackSpec.endpointBehavior),
    });
    const samples = simulation.samples.map((sample) => {
      const frame = track.frameAt(finite(sample.s));
      const point = framePoint(frame);
      const direction = frame.tangent || track.tangentAt(finite(sample.s));
      const speed = finite(sample.v ?? sample.velocity ?? sample.speed);
      return {
        ...sample,
        x: finite(point.x),
        y: finite(point.y),
        vx: speed * finite(direction.x),
        vy: speed * finite(direction.y),
        angle: finite(sample.angle ?? finite(sample.omega) * finite(sample.t)),
        theta: finite(sample.angle ?? finite(sample.omega) * finite(sample.t)),
        angularVelocity: finite(sample.omega),
      };
    });
    const final = samples[samples.length - 1];
    return {
      objectId: parts.id,
      name: parts.name,
      buildKind: parts.kind,
      dynamicsModel: "track-constrained2d",
      mass: parts.mass,
      charge: parts.charge,
      x0: parts.x,
      y0: parts.y,
      vx0: samples[0]?.vx ?? parts.vx,
      vy0: samples[0]?.vy ?? parts.vy,
      inertia: parts.inertia ?? DynamicsTracks.solidDiskInertia(parts.mass, parts.collisionRadius),
      collisionRadius: parts.collisionRadius,
      samples,
      final,
      kineticEnergy: finite(simulation.energy?.final?.kinetic ?? simulation.final?.energy?.kinetic),
      potentialEnergy: requiresAccelerationCallback
        ? null
        : finite(simulation.energy?.final?.potential ?? simulation.final?.energy?.potential),
      potentialEnergyAvailable: !requiresAccelerationCallback,
      mechanicalEnergy: requiresAccelerationCallback
        ? null
        : finite(simulation.energy?.final?.mechanical ?? simulation.final?.energy?.mechanical),
      momentum: { x: parts.mass * final.vx, y: parts.mass * final.vy },
      angularMomentum:
        parts.mass * (finite(final.x) * finite(final.vy) - finite(final.y) * finite(final.vx)) +
        finite(parts.inertia ?? DynamicsTracks.solidDiskInertia(parts.mass, parts.collisionRadius)) *
          finite(final.angularVelocity),
      angularVelocity: finite(final.angularVelocity),
      angle: finite(final.angle),
      track: {
        id: trackSpec.id,
        arrivalTime: simulation.arrivalTime,
        bottomState: simulation.bottomState,
        sliding: simulation.sliding,
        everSliding: simulation.everSliding,
        detached: simulation.detached,
        detachedReason: simulation.detachedReason,
        endpointState: simulation.endpointState,
        energy: { ...simulation.energy, available: !requiresAccelerationCallback },
      },
      sizeA: parts.sizeA,
      sizeB: parts.sizeB,
      sizeC: parts.sizeC,
    };
  }

  function simulateCoupledProject(project, options = {}) {
    const duration = quantity(project.simulation.duration, "s");
    const timeStep = quantity(project.simulation.timeStep, "s");
    const stepCount = Math.ceil(duration / timeStep);
    const cappedPositive = (fallback, ...values) =>
      values.reduce((cap, value) => {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? Math.min(cap, number) : cap;
      }, fallback);
    const limits = {
      ...DEFAULT_OPTIONS,
      contactIterations: cappedPositive(
        DEFAULT_OPTIONS.contactIterations,
        options.contactIterations,
        project.simulation.contactIterations
      ),
      positionIterations: cappedPositive(
        DEFAULT_OPTIONS.positionIterations,
        options.positionIterations,
        project.simulation.positionIterations
      ),
      maxSubsteps: cappedPositive(
        DEFAULT_OPTIONS.maxSubsteps,
        options.maxSubsteps,
        project.simulation.maxSubsteps
      ),
      maxSteps: cappedPositive(DEFAULT_OPTIONS.maxSteps, options.maxSteps),
      maxSamples: cappedPositive(DEFAULT_OPTIONS.maxSamples, options.maxSamples),
    };
    if (stepCount > limits.maxSteps) throw new Error(`动力学积分步数 ${stepCount} 超过上限 ${limits.maxSteps}。`);
    if ((stepCount + 1) * project.objects.length > limits.maxSamples) {
      throw new Error(`动力学样本数超过上限 ${limits.maxSamples}。`);
    }
    if (stepCount * limits.maxSubsteps * Math.max(project.objects.length, 1) > 5_000_000) {
      throw new Error("动力学最坏情况工作量超过安全上限，请增大步长、降低子步上限或缩短时长。");
    }

    const preparedFields = prepareFields(project.fields);
    const tracksById = new Map((project.tracks || []).map((track) => [String(track.id), track]));
    const objectsById = new Map(project.objects.map((object) => [String(object.id), object]));
    const allForcesByBody = new Map(project.objects.map((object) => [String(object.id), []]));
    for (const force of project.forces || []) {
      if (allForcesByBody.has(String(force.targetId))) allForcesByBody.get(String(force.targetId)).push(force);
    }
    const constrainedIds = new Set((project.constraints || []).map((constraint) => String(constraint.bodyId)));
    const trackResults = (project.constraints || []).map((constraint) => {
      const rawObject = objectsById.get(String(constraint.bodyId));
      const track = tracksById.get(String(constraint.trackId));
      if (!rawObject || !track) throw new Error(`约束 ${constraint.id} 的对象或轨道不存在。`);
      return trackObjectResult(
        project,
        constraint,
        track,
        rawObject,
        allForcesByBody.get(String(constraint.bodyId)),
        duration,
        timeStep,
        preparedFields
      );
    });

    const rawBodies = project.objects.filter((object) => !constrainedIds.has(String(object.id)));
    const partsById = new Map(rawBodies.map((object) => [String(object.id), objectParts(object)]));
    const bodies = rawBodies.map(createBody);
    const bodyById = new Map(bodies.map((body, index) => [String(body.id ?? rawBodies[index].id), body]));
    const contactMode =
      project.model === "coupled-rigid-body2d" ||
      (project.grounds || []).length > 0 ||
      rawBodies.some((object) => object.contact?.enabled === true);
    const contactBodies = bodies.filter((body) => {
      const parts = partsById.get(String(body.id));
      if (!contactMode || parts.contact?.enabled === false) return false;
      if (!new Set(["particle", "circle"]).has(parts.kind)) {
        throw new Error(`对象 ${parts.id} 的几何 ${parts.kind} 尚未实现碰撞。`);
      }
      return true;
    });
    const forcesByBody = new Map(rawBodies.map((object) => [String(object.id), allForcesByBody.get(String(object.id)) || []]));
    for (const [id, body] of bodyById) initialImpulse(body, forcesByBody.get(id));

    const samplesById = new Map();
    for (const [id, body] of bodyById) samplesById.set(id, [bodyState(body, 0)]);
    const initialTotals = totalsForBodies(bodies);
    const diagnostics = [];
    if (preparedFields.variable.length) {
      diagnostics.push({
        level: "info",
        code: "variable_field_potential_unavailable",
        message: "变化场未声明标量势函数，势能和机械能输出标记为不可用，不使用预览幅值替代。",
      });
    }
    if (trackResults.some((result) => result.track?.energy?.available === false)) {
      diagnostics.push({
        level: "info",
        code: "track_external_work_energy",
        message: "轨道对象受到变化场或持续外力，轨道模块仍给出动能，但势能与机械能不作守恒声明。",
      });
    }
    const contactEvents = [];
    let totalSubsteps = 0;
    let dissipatedEnergy = 0;
    let time = 0;

    while (time < duration - 1e-12 && bodies.length) {
      const step = Math.min(timeStep, duration - time);
      let substeps = 1;
      if (contactBodies.length) {
        substeps = DynamicsContact.computeAdaptiveSubsteps(contactBodies, project.grounds || [], step, {
          maxSubsteps: limits.maxSubsteps,
          maxTravelFraction: project.simulation.maxTravelFraction ?? 0.25,
          gravity: { x: 0, y: 0 },
        });
        substeps = Math.max(
          substeps,
          externalAdaptiveSubsteps(
            contactBodies,
            partsById,
            forcesByBody,
            preparedFields,
            time,
            step,
            {
              maxSubsteps: limits.maxSubsteps,
              maxTravelFraction: project.simulation.maxTravelFraction ?? 0.25,
            }
          )
        );
      }
      totalSubsteps += substeps;
      if (substeps > 1) {
        diagnostics.push({
          level: "info",
          code: "adaptive_contact_substeps",
          message: `接触步长被细分为 ${substeps} 个子步以限制高速穿透。`,
        });
      }
      const substep = step / substeps;
      for (let substepIndex = 0; substepIndex < substeps; substepIndex += 1) {
        const substepTime = time + substepIndex * substep;
        for (const [id, body] of bodyById) {
          const observer =
            typeof options.observeFieldEvaluation === "function"
              ? (record) => options.observeFieldEvaluation({ bodyId: id, ...record })
              : undefined;
          integrateExternalRk4(
            body,
            partsById.get(id),
            forcesByBody.get(id),
            preparedFields,
            substepTime,
            substep,
            { observeFieldEvaluation: observer }
          );
        }
        if (contactBodies.length) {
          const contacts = DynamicsContact.generateContacts(contactBodies, project.grounds || [], {
            margin: project.simulation.contactSlop ?? 1e-6,
          });
          if (contacts.length) {
            const solved = DynamicsContact.solveContacts(contacts, {
              iterations: limits.contactIterations,
              positionIterations: limits.positionIterations,
              contactSlop: project.simulation.contactSlop ?? 1e-6,
              positionCorrection: project.simulation.positionCorrection ?? 0.8,
            });
            dissipatedEnergy += finite(solved.dissipatedEnergy);
            contactEvents.push(
              ...solved.contacts.map((contact) => ({ ...contact, t: substepTime + substep }))
            );
          }
        }
      }
      time += step;
      for (const [id, body] of bodyById) {
        const parts = partsById.get(id);
        samplesById.get(id).push(bodyState(body, time, accelerationFor(body, parts, preparedFields, time)));
      }
    }

    const objectResults = bodies.map((body) => {
      const id = String(body.id);
      return resultForBody(body, partsById.get(id), samplesById.get(id), preparedFields);
    });
    objectResults.push(...trackResults);
    const finalTotals = totalsForBodies(bodies);
    for (const result of trackResults) {
      finalTotals.kineticEnergy += finite(result.kineticEnergy);
      finalTotals.momentumX += finite(result.momentum?.x);
      finalTotals.momentumY += finite(result.momentum?.y);
      finalTotals.angularMomentum += finite(result.angularMomentum);
      const first = result.samples[0] || {};
      initialTotals.momentumX += result.mass * finite(first.vx);
      initialTotals.momentumY += result.mass * finite(first.vy);
      initialTotals.kineticEnergy += finite(first.energy?.kinetic);
      initialTotals.angularMomentum +=
        result.mass * (finite(first.x) * finite(first.vy) - finite(first.y) * finite(first.vx)) +
        finite(result.inertia) * finite(first.omega);
    }
    finalTotals.potentialEnergy = objectResults.reduce((sum, result) => sum + finite(result.potentialEnergy), 0);
    finalTotals.potentialEnergyAvailable = objectResults.every((result) => result.potentialEnergyAvailable !== false);
    finalTotals.mechanicalEnergy = finalTotals.potentialEnergyAvailable
      ? finalTotals.kineticEnergy + finalTotals.potentialEnergy
      : null;
    finalTotals.dissipatedEnergy = dissipatedEnergy;
    finalTotals.initialMomentumX = initialTotals.momentumX;
    finalTotals.initialMomentumY = initialTotals.momentumY;
    finalTotals.initialKineticEnergy = initialTotals.kineticEnergy;
    finalTotals.initialAngularMomentum = initialTotals.angularMomentum;
    finalTotals.angularMomentumDrift = finalTotals.angularMomentum - initialTotals.angularMomentum;
    finalTotals.momentumDrift = Math.hypot(
      finalTotals.momentumX - initialTotals.momentumX,
      finalTotals.momentumY - initialTotals.momentumY
    );

    return {
      model: "coupled-rigid-body2d",
      duration,
      requestedTimeStep: timeStep,
      timeStep,
      stepCount,
      totalSubsteps,
      totalSampleCount: objectResults.reduce((sum, result) => sum + result.samples.length, 0),
      objectResults,
      trackResults,
      contacts: contactEvents,
      contactCount: contactEvents.length,
      totals: finalTotals,
      diagnostics,
    };
  }

  function needsAdvancedSolver(project) {
    return (
      project.model === "coupled-rigid-body2d" ||
      (project.grounds || []).length > 0 ||
      (project.tracks || []).length > 0 ||
      (project.constraints || []).length > 0 ||
      (project.fields || []).some((field) => field.variation || field.expression) ||
      (project.objects || []).some((object) => object.contact?.enabled) ||
      (project.forces || []).some((force) => {
        const point = force.applicationPoint;
        return point && (point.frame === "world" || Math.abs(finite(point.x)) > 1e-12 || Math.abs(finite(point.y)) > 1e-12);
      })
    );
  }

  function legacyScene(project) {
    return {
      objects: clone(project.objects),
      fields: clone(project.fields),
      forces: clone(project.forces),
      duration: quantity(project.simulation.duration, "s"),
      timeStep: quantity(project.simulation.timeStep, "s"),
    };
  }

  function simulateProject(rawProject, options = {}) {
    const project = ProjectSchema.loadDynamicsProject(rawProject);
    if (!needsAdvancedSolver(project)) return DynamicsCore.simulateScene(legacyScene(project));
    return simulateCoupledProject(project, options);
  }

  return {
    DEFAULT_OPTIONS,
    objectParts,
    variableFieldSpec,
    prepareFields,
    needsAdvancedSolver,
    simulateCoupledProject,
    simulateProject,
  };
});

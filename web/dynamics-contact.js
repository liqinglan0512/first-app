"use strict";

(function exposeDynamicsContact(root, factory) {
  const rigidBody = typeof module === "object" && module.exports
    ? require("./dynamics-rigid-body.js")
    : root.DynamicsRigidBody;
  const api = factory(rigidBody);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsContact = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsContact(RigidBody) {
  if (!RigidBody) throw new Error("DynamicsContact requires DynamicsRigidBody.");

  const EPSILON = 1e-12;
  const DEFAULT_MATERIAL = Object.freeze({
    restitution: 1,
    staticFriction: 0,
    dynamicFriction: 0,
    damping: 0,
  });
  const MATERIAL_KEYS = new Set([
    "restitution",
    "e",
    "staticFriction",
    "muStatic",
    "dynamicFriction",
    "muDynamic",
    "friction",
    "damping",
  ]);

  function finiteNumber(value, label, fallback) {
    return RigidBody.finiteNumber(value, label, fallback);
  }

  function nonNegativeNumber(value, label, fallback = 0) {
    const numeric = finiteNumber(value, label, fallback);
    if (numeric < 0) throw new RangeError(`${label} must be greater than or equal to zero.`);
    return numeric;
  }

  function positiveInteger(value, label, fallback) {
    const numeric = finiteNumber(value, label, fallback);
    if (!Number.isInteger(numeric) || numeric < 1) throw new RangeError(`${label} must be a positive integer.`);
    return numeric;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function hasMaterialFields(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).some((key) => MATERIAL_KEYS.has(key))
    );
  }

  function validateMaterial(raw = {}, label = "contact material") {
    if (raw === null || raw === undefined) raw = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError(`${label} must be an object.`);
    }
    const friction = typeof raw.friction === "number" ? raw.friction : undefined;
    const restitution = finiteNumber(raw.restitution ?? raw.e, `${label}.restitution`, DEFAULT_MATERIAL.restitution);
    const staticCandidate = raw.staticFriction ?? raw.muStatic ?? raw.friction?.static ?? friction;
    const dynamicCandidate = raw.dynamicFriction ?? raw.muDynamic ?? raw.friction?.dynamic ?? friction;
    const staticFriction = nonNegativeNumber(
      staticCandidate,
      `${label}.staticFriction`,
      dynamicCandidate ?? DEFAULT_MATERIAL.staticFriction
    );
    const dynamicFriction = nonNegativeNumber(
      dynamicCandidate,
      `${label}.dynamicFriction`,
      staticFriction
    );
    const damping = nonNegativeNumber(raw.damping, `${label}.damping`, DEFAULT_MATERIAL.damping);
    if (restitution < 0 || restitution > 1) {
      throw new RangeError(`${label}.restitution must be in the range [0, 1].`);
    }
    if (staticFriction + EPSILON < dynamicFriction) {
      throw new RangeError(`${label}.staticFriction must be greater than or equal to dynamicFriction.`);
    }
    return { restitution, staticFriction, dynamicFriction, damping };
  }

  function combineMaterials(firstRaw, secondRaw, fallbackRaw = DEFAULT_MATERIAL) {
    const hasFirst = hasMaterialFields(firstRaw);
    const hasSecond = hasMaterialFields(secondRaw);
    if (!hasFirst && !hasSecond) return validateMaterial(fallbackRaw, "default contact material");
    if (!hasFirst) return validateMaterial(secondRaw, "second contact material");
    if (!hasSecond) return validateMaterial(firstRaw, "first contact material");
    const first = validateMaterial(firstRaw, "first contact material");
    const second = validateMaterial(secondRaw, "second contact material");
    return {
      restitution: Math.min(first.restitution, second.restitution),
      staticFriction: Math.sqrt(first.staticFriction * second.staticFriction),
      dynamicFriction: Math.sqrt(first.dynamicFriction * second.dynamicFriction),
      damping: Math.max(first.damping, second.damping),
    };
  }

  function asBody(rawBody) {
    return RigidBody.isBody(rawBody) ? rawBody : RigidBody.createBody(rawBody);
  }

  function assertSupportedCollisionBody(rawBody) {
    const body = asBody(rawBody);
    if (body.kind === "circle") {
      if (!(body.collisionRadius > 0)) throw new RangeError(`Circle body ${body.id} requires a positive collision radius.`);
      return body;
    }
    if (body.kind === "particle") {
      if (!(body.collisionRadius > 0) || !body.collisionRadiusExplicit) {
        throw new RangeError(`Particle body ${body.id} requires an explicit positive collisionRadius.`);
      }
      return body;
    }
    throw new RangeError(
      `Unsupported collision geometry ${body.kind} for body ${body.id}; only circle and particle with collisionRadius are supported.`
    );
  }

  function normalizeGround(rawGround = {}, index = 0) {
    if (rawGround?._normalizedGround2d) return rawGround;
    if (!rawGround || typeof rawGround !== "object" || Array.isArray(rawGround)) {
      throw new TypeError("Ground definition must be an object.");
    }
    const rawNormal = rawGround.normal || { x: 0, y: 1 };
    const normal = RigidBody.vector(rawNormal, "ground.normal");
    const length = RigidBody.magnitude(normal);
    if (!(length > EPSILON)) throw new RangeError("ground.normal must have non-zero length.");
    normal.x /= length;
    normal.y /= length;
    let offset;
    if (rawGround.offset !== undefined) {
      offset = finiteNumber(rawGround.offset, "ground.offset");
    } else if (rawGround.point !== undefined) {
      offset = RigidBody.dot(normal, RigidBody.vector(rawGround.point, "ground.point"));
    } else if (rawGround.y !== undefined && Math.abs(normal.x) < EPSILON) {
      offset = normal.y * finiteNumber(rawGround.y, "ground.y");
    } else {
      offset = 0;
    }
    const materialSource = hasMaterialFields(rawGround.material)
      ? rawGround.material
      : hasMaterialFields(rawGround.contact)
        ? rawGround.contact
        : hasMaterialFields(rawGround)
          ? rawGround
          : null;
    const ground = {
      id: String(rawGround.id || `ground-${index + 1}`),
      normal,
      offset,
      velocity: RigidBody.vector(rawGround.velocity, "ground.velocity"),
      material: materialSource,
    };
    Object.defineProperty(ground, "_normalizedGround2d", { value: true, enumerable: false });
    return ground;
  }

  function contactPointVelocity(body, offset) {
    if (!body) return { x: 0, y: 0 };
    return RigidBody.add(body.velocity, RigidBody.crossScalarVector(body.angularVelocity, offset));
  }

  function relativeVelocity(contact) {
    const velocityA = contact.a
      ? contactPointVelocity(contact.a, contact.rA)
      : contact.ground?.velocity || { x: 0, y: 0 };
    const velocityB = contactPointVelocity(contact.b, contact.rB);
    return RigidBody.subtract(velocityB, velocityA);
  }

  function createCircleContact(a, b, options = {}) {
    const margin = nonNegativeNumber(options.margin, "contact margin", 0);
    const delta = RigidBody.subtract(b.position, a.position);
    const distance = RigidBody.magnitude(delta);
    const radiusSum = a.collisionRadius + b.collisionRadius;
    if (distance > radiusSum + margin) return null;
    let normal;
    if (distance > EPSILON) {
      normal = RigidBody.scale(delta, 1 / distance);
    } else {
      const motion = RigidBody.subtract(b.velocity, a.velocity);
      const speed = RigidBody.magnitude(motion);
      normal = speed > EPSILON ? RigidBody.scale(motion, -1 / speed) : { x: 1, y: 0 };
    }
    const penetration = radiusSum - distance;
    return {
      id: `circle:${a.id}:${b.id}`,
      kind: "circle-circle",
      a,
      b,
      ground: null,
      normal,
      rA: RigidBody.scale(normal, a.collisionRadius),
      rB: RigidBody.scale(normal, -b.collisionRadius),
      point: RigidBody.add(a.position, RigidBody.scale(normal, a.collisionRadius - Math.max(penetration, 0) / 2)),
      penetration,
      material: combineMaterials(a.contact, b.contact, options.defaultMaterial),
      normalImpulse: 0,
      tangentImpulse: 0,
      frictionMode: "none",
      dissipatedEnergy: 0,
    };
  }

  function detectCircleCircle(firstBody, secondBody, options = {}) {
    const a = assertSupportedCollisionBody(firstBody);
    const b = assertSupportedCollisionBody(secondBody);
    if (a === b || a.id === b.id) throw new RangeError("Circle-circle contact requires two distinct bodies.");
    return createCircleContact(a, b, options);
  }

  function createGroundContact(body, ground, options = {}) {
    const margin = nonNegativeNumber(options.margin, "contact margin", 0);
    const signedDistance = RigidBody.dot(ground.normal, body.position) - ground.offset;
    const penetration = body.collisionRadius - signedDistance;
    if (penetration < -margin) return null;
    return {
      id: `ground:${ground.id}:${body.id}`,
      kind: "circle-ground",
      a: null,
      b: body,
      ground,
      normal: { ...ground.normal },
      rA: { x: 0, y: 0 },
      rB: RigidBody.scale(ground.normal, -body.collisionRadius),
      point: RigidBody.add(body.position, RigidBody.scale(ground.normal, -body.collisionRadius)),
      penetration,
      material: combineMaterials(body.contact, ground.material, options.defaultMaterial),
      normalImpulse: 0,
      tangentImpulse: 0,
      frictionMode: "none",
      dissipatedEnergy: 0,
    };
  }

  function detectGroundContact(rawBody, rawGround = {}, options = {}) {
    const body = assertSupportedCollisionBody(rawBody);
    const ground = normalizeGround(rawGround);
    return createGroundContact(body, ground, options);
  }

  function refreshContact(contact) {
    if (contact.kind === "circle-circle") {
      const delta = RigidBody.subtract(contact.b.position, contact.a.position);
      const distance = RigidBody.magnitude(delta);
      if (distance > EPSILON) contact.normal = RigidBody.scale(delta, 1 / distance);
      contact.penetration = contact.a.collisionRadius + contact.b.collisionRadius - distance;
      contact.rA = RigidBody.scale(contact.normal, contact.a.collisionRadius);
      contact.rB = RigidBody.scale(contact.normal, -contact.b.collisionRadius);
      contact.point = RigidBody.add(
        contact.a.position,
        RigidBody.scale(contact.normal, contact.a.collisionRadius - Math.max(contact.penetration, 0) / 2)
      );
      return contact;
    }
    const signedDistance = RigidBody.dot(contact.normal, contact.b.position) - contact.ground.offset;
    contact.penetration = contact.b.collisionRadius - signedDistance;
    contact.rB = RigidBody.scale(contact.normal, -contact.b.collisionRadius);
    contact.point = RigidBody.add(contact.b.position, contact.rB);
    return contact;
  }

  function effectiveInverseMass(contact, direction) {
    const inverseMassA = contact.a?.inverseMass || 0;
    const inverseMassB = contact.b?.inverseMass || 0;
    const rotationA = contact.a
      ? Math.pow(RigidBody.cross(contact.rA, direction), 2) * contact.a.inverseInertia
      : 0;
    const rotationB = contact.b
      ? Math.pow(RigidBody.cross(contact.rB, direction), 2) * contact.b.inverseInertia
      : 0;
    return inverseMassA + inverseMassB + rotationA + rotationB;
  }

  function applyOffsetImpulse(body, impulse, offset) {
    if (!body || body.bodyType !== "dynamic") return;
    body.velocity.x += impulse.x * body.inverseMass;
    body.velocity.y += impulse.y * body.inverseMass;
    body.angularVelocity += RigidBody.cross(offset, impulse) * body.inverseInertia;
  }

  function pairKineticEnergy(contact) {
    return (contact.a ? RigidBody.kineticEnergy(contact.a) : 0) + RigidBody.kineticEnergy(contact.b);
  }

  function applyContactImpulse(contact, impulse) {
    const energyBefore = pairKineticEnergy(contact);
    if (contact.a) applyOffsetImpulse(contact.a, RigidBody.scale(impulse, -1), contact.rA);
    applyOffsetImpulse(contact.b, impulse, contact.rB);
    const energyAfter = pairKineticEnergy(contact);
    contact.dissipatedEnergy += Math.max(0, energyBefore - energyAfter);
  }

  function initializeContact(contact, options = {}) {
    refreshContact(contact);
    const velocity = relativeVelocity(contact);
    contact.initialNormalVelocity = RigidBody.dot(velocity, contact.normal);
    contact.initialPenetration = Math.max(contact.penetration, 0);
    contact.normalImpulse = 0;
    contact.tangentImpulse = 0;
    contact.frictionMode = "none";
    contact.dissipatedEnergy = 0;
    const damping = contact.material.damping;
    contact.effectiveRestitution = contact.material.restitution / (1 + damping);
    const threshold = nonNegativeNumber(
      options.restitutionVelocityThreshold,
      "restitutionVelocityThreshold",
      0.1
    );
    contact.targetNormalVelocity = contact.initialNormalVelocity < -threshold
      ? -contact.effectiveRestitution * contact.initialNormalVelocity
      : 0;
    return contact;
  }

  function resolveNormalImpulse(contact) {
    const inverseMass = effectiveInverseMass(contact, contact.normal);
    if (!(inverseMass > EPSILON)) return;
    const normalVelocity = RigidBody.dot(relativeVelocity(contact), contact.normal);
    const impulseDelta = (contact.targetNormalVelocity - normalVelocity) / inverseMass;
    const previous = contact.normalImpulse;
    contact.normalImpulse = Math.max(0, previous + impulseDelta);
    const applied = contact.normalImpulse - previous;
    if (Math.abs(applied) <= EPSILON) return;
    applyContactImpulse(contact, RigidBody.scale(contact.normal, applied));
  }

  function resolveFrictionImpulse(contact) {
    if (!(contact.normalImpulse > EPSILON)) return;
    const tangent = { x: -contact.normal.y, y: contact.normal.x };
    const inverseMass = effectiveInverseMass(contact, tangent);
    if (!(inverseMass > EPSILON)) return;
    const tangentVelocity = RigidBody.dot(relativeVelocity(contact), tangent);
    if (Math.abs(tangentVelocity) <= EPSILON && Math.abs(contact.tangentImpulse) <= EPSILON) return;
    const unconstrainedDelta = -tangentVelocity / inverseMass;
    const candidate = contact.tangentImpulse + unconstrainedDelta;
    const staticLimit = contact.material.staticFriction * contact.normalImpulse;
    let target;
    if (Math.abs(candidate) <= staticLimit + EPSILON) {
      target = candidate;
      contact.frictionMode = "static";
    } else {
      const dynamicLimit = contact.material.dynamicFriction * contact.normalImpulse;
      target = clamp(candidate, -dynamicLimit, dynamicLimit);
      contact.frictionMode = dynamicLimit > EPSILON ? "dynamic" : "none";
    }
    const applied = target - contact.tangentImpulse;
    contact.tangentImpulse = target;
    if (Math.abs(applied) <= EPSILON) return;
    applyContactImpulse(contact, RigidBody.scale(tangent, applied));
  }

  function solveVelocityConstraints(contacts, options = {}) {
    const iterations = positiveInteger(options.iterations, "iterations", 12);
    contacts.forEach((contact) => initializeContact(contact, options));
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (const contact of contacts) {
        resolveNormalImpulse(contact);
        resolveFrictionImpulse(contact);
      }
    }
    return contacts;
  }

  function solvePositionConstraints(contacts, options = {}) {
    const iterations = positiveInteger(options.positionIterations, "positionIterations", 4);
    const slop = nonNegativeNumber(options.contactSlop, "contactSlop", 1e-6);
    const correctionPercent = finiteNumber(options.positionCorrection, "positionCorrection", 0.8);
    if (correctionPercent < 0 || correctionPercent > 1) {
      throw new RangeError("positionCorrection must be in the range [0, 1].");
    }
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      let changed = false;
      for (const contact of contacts) {
        refreshContact(contact);
        const penetration = Math.max(contact.penetration - slop, 0);
        if (!(penetration > EPSILON)) continue;
        const inverseMass = (contact.a?.inverseMass || 0) + (contact.b?.inverseMass || 0);
        if (!(inverseMass > EPSILON)) continue;
        const correction = (correctionPercent * penetration) / inverseMass;
        if (contact.a?.bodyType === "dynamic") {
          contact.a.position.x -= contact.normal.x * correction * contact.a.inverseMass;
          contact.a.position.y -= contact.normal.y * correction * contact.a.inverseMass;
        }
        if (contact.b?.bodyType === "dynamic") {
          contact.b.position.x += contact.normal.x * correction * contact.b.inverseMass;
          contact.b.position.y += contact.normal.y * correction * contact.b.inverseMass;
        }
        changed = true;
      }
      if (!changed) break;
    }
    contacts.forEach(refreshContact);
    return contacts;
  }

  function contactSummary(contact) {
    return {
      id: contact.id,
      kind: contact.kind,
      bodyAId: contact.a?.id || null,
      bodyBId: contact.b?.id || null,
      groundId: contact.ground?.id || null,
      normal: { ...contact.normal },
      point: { ...contact.point },
      penetration: Math.max(contact.penetration, 0),
      initialPenetration: contact.initialPenetration,
      maximumPenetration: Math.max(contact.initialPenetration || 0, contact.penetration, 0),
      normalImpulse: contact.normalImpulse,
      tangentImpulse: contact.tangentImpulse,
      frictionMode: contact.frictionMode,
      effectiveRestitution: contact.effectiveRestitution,
      dissipatedEnergy: contact.dissipatedEnergy,
    };
  }

  function solveContacts(contacts, options = {}) {
    if (!Array.isArray(contacts)) throw new TypeError("contacts must be an array.");
    const bodies = [...new Set(contacts.flatMap((contact) => [contact.a, contact.b]).filter(Boolean))];
    const energyBefore = systemKineticEnergy(bodies);
    solveVelocityConstraints(contacts, options);
    solvePositionConstraints(contacts, options);
    const summaries = contacts.map(contactSummary);
    const energyAfter = systemKineticEnergy(bodies);
    return {
      contacts: summaries,
      contactCount: summaries.length,
      dissipatedEnergy: Math.max(0, energyBefore - energyAfter),
      attributedDissipatedEnergy: summaries.reduce((sum, contact) => sum + contact.dissipatedEnergy, 0),
    };
  }

  function generateContacts(rawBodies, rawGrounds = [], options = {}) {
    if (!Array.isArray(rawBodies)) throw new TypeError("bodies must be an array.");
    if (!Array.isArray(rawGrounds)) throw new TypeError("grounds must be an array.");
    const bodies = rawBodies.map(assertSupportedCollisionBody);
    const grounds = rawGrounds.map(normalizeGround);
    const contacts = [];
    for (let first = 0; first < bodies.length; first += 1) {
      for (let second = first + 1; second < bodies.length; second += 1) {
        const contact = createCircleContact(bodies[first], bodies[second], options);
        if (contact) contacts.push(contact);
      }
    }
    for (const ground of grounds) {
      for (const body of bodies) {
        const contact = createGroundContact(body, ground, options);
        if (contact) contacts.push(contact);
      }
    }
    return contacts;
  }

  function bodyAccelerationMagnitude(body, gravity) {
    if (body.bodyType !== "dynamic") return 0;
    return Math.hypot(
      body.force.x * body.inverseMass + gravity.x,
      body.force.y * body.inverseMass + gravity.y
    );
  }

  function computeAdaptiveSubsteps(rawBodies, rawGrounds, timeStep, options = {}) {
    const step = finiteNumber(timeStep, "timeStep");
    if (!(step > 0)) throw new RangeError("timeStep must be greater than zero.");
    const bodies = rawBodies.map(assertSupportedCollisionBody);
    const grounds = (rawGrounds || []).map(normalizeGround);
    const fraction = finiteNumber(options.maxTravelFraction, "maxTravelFraction", 0.25);
    if (!(fraction > 0 && fraction <= 1)) throw new RangeError("maxTravelFraction must be in the range (0, 1].");
    const maximum = positiveInteger(options.maxSubsteps, "maxSubsteps", 512);
    const gravity = RigidBody.vector(options.gravity, "gravity");
    const minimumRadius = Math.min(...bodies.map((body) => body.collisionRadius));
    let maximumRelativeSpeed = 0;
    for (let first = 0; first < bodies.length; first += 1) {
      for (let second = first + 1; second < bodies.length; second += 1) {
        maximumRelativeSpeed = Math.max(
          maximumRelativeSpeed,
          RigidBody.magnitude(RigidBody.subtract(bodies[second].velocity, bodies[first].velocity))
        );
      }
    }
    for (const body of bodies) {
      if (!grounds.length && bodies.length === 1) maximumRelativeSpeed = Math.max(maximumRelativeSpeed, RigidBody.magnitude(body.velocity));
      for (const ground of grounds) {
        maximumRelativeSpeed = Math.max(
          maximumRelativeSpeed,
          RigidBody.magnitude(RigidBody.subtract(body.velocity, ground.velocity))
        );
      }
    }
    const maximumAcceleration = bodies.reduce(
      (current, body) => Math.max(current, bodyAccelerationMagnitude(body, gravity)),
      0
    );
    const estimatedTravel = maximumRelativeSpeed * step + 0.5 * maximumAcceleration * step * step;
    const required = Math.max(1, Math.ceil(estimatedTravel / Math.max(fraction * minimumRadius, EPSILON)));
    if (required > maximum) {
      const error = new RangeError(
        `Adaptive contact integration requires ${required} substeps, exceeding maxSubsteps ${maximum}.`
      );
      error.code = "CONTACT_SUBSTEP_LIMIT";
      error.requiredSubsteps = required;
      throw error;
    }
    return required;
  }

  function systemMomentum(bodies) {
    return bodies.reduce(
      (sum, body) => RigidBody.add(sum, RigidBody.linearMomentum(body)),
      { x: 0, y: 0 }
    );
  }

  function systemKineticEnergy(bodies) {
    return bodies.reduce((sum, body) => sum + RigidBody.kineticEnergy(body), 0);
  }

  function systemAngularMomentum(bodies) {
    return bodies.reduce((sum, body) => sum + RigidBody.angularMomentum(body), 0);
  }

  function aggregateContact(target, summary) {
    const existing = target.get(summary.id);
    if (!existing) {
      target.set(summary.id, {
        ...summary,
        occurrences: 1,
        maximumPenetration: summary.maximumPenetration,
        totalNormalImpulse: summary.normalImpulse,
        totalAbsoluteTangentImpulse: Math.abs(summary.tangentImpulse),
      });
      return;
    }
    existing.occurrences += 1;
    existing.maximumPenetration = Math.max(existing.maximumPenetration, summary.maximumPenetration);
    existing.totalNormalImpulse += summary.normalImpulse;
    existing.totalAbsoluteTangentImpulse += Math.abs(summary.tangentImpulse);
    existing.dissipatedEnergy += summary.dissipatedEnergy;
    existing.frictionMode = summary.frictionMode === "dynamic" || existing.frictionMode === "dynamic"
      ? "dynamic"
      : summary.frictionMode === "static" || existing.frictionMode === "static"
        ? "static"
        : "none";
    existing.point = summary.point;
    existing.normal = summary.normal;
    existing.penetration = summary.penetration;
  }

  function hasExternalEffects(bodies, grounds, gravity) {
    if (grounds.length || Math.hypot(gravity.x, gravity.y) > EPSILON) return true;
    return bodies.some(
      (body) =>
        Math.hypot(body.force.x, body.force.y) > EPSILON ||
        Math.abs(body.torque) > EPSILON ||
        body.linearDamping > EPSILON ||
        body.angularDamping > EPSILON
    );
  }

  function stepWorld(configuration = {}) {
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
      throw new TypeError("Contact step configuration must be an object.");
    }
    if (!Array.isArray(configuration.bodies) || !configuration.bodies.length) {
      throw new RangeError("Contact step requires at least one body.");
    }
    const timeStep = finiteNumber(configuration.timeStep, "timeStep");
    if (!(timeStep > 0)) throw new RangeError("timeStep must be greater than zero.");
    const bodies = configuration.bodies.map(assertSupportedCollisionBody);
    const grounds = (configuration.grounds || []).map(normalizeGround);
    const gravity = RigidBody.vector(configuration.gravity, "gravity");
    const initialMomentum = systemMomentum(bodies);
    const initialKineticEnergy = systemKineticEnergy(bodies);
    const initialAngularMomentum = systemAngularMomentum(bodies);
    const externalEffects = hasExternalEffects(bodies, grounds, gravity);
    const substeps = computeAdaptiveSubsteps(bodies, grounds, timeStep, { ...configuration, gravity });
    const substep = timeStep / substeps;
    const aggregatedContacts = new Map();
    let contactDissipation = 0;

    for (let index = 0; index < substeps; index += 1) {
      bodies.forEach((body) => RigidBody.integrateVelocity(body, substep, { gravity }));
      bodies.forEach((body) => RigidBody.integratePosition(body, substep));
      const contacts = generateContacts(bodies, grounds, {
        margin: configuration.contactMargin ?? configuration.contactSlop ?? 1e-6,
        defaultMaterial: configuration.defaultMaterial,
      });
      if (!contacts.length) continue;
      const solved = solveContacts(contacts, configuration);
      contactDissipation += solved.dissipatedEnergy;
      solved.contacts.forEach((contact) => aggregateContact(aggregatedContacts, contact));
    }

    if (configuration.clearAccumulators) bodies.forEach(RigidBody.clearAccumulators);
    const finalMomentum = systemMomentum(bodies);
    const finalKineticEnergy = systemKineticEnergy(bodies);
    const finalAngularMomentum = systemAngularMomentum(bodies);
    const momentumDelta = RigidBody.subtract(finalMomentum, initialMomentum);
    const kineticEnergyLoss = Math.max(0, initialKineticEnergy - finalKineticEnergy);
    const diagnostics = {
      closedSystem: !externalEffects,
      momentum: {
        initial: initialMomentum,
        final: finalMomentum,
        delta: momentumDelta,
        absoluteDrift: RigidBody.magnitude(momentumDelta),
        relativeDrift:
          RigidBody.magnitude(momentumDelta) / Math.max(1, RigidBody.magnitude(initialMomentum)),
      },
      angularMomentum: {
        initial: initialAngularMomentum,
        final: finalAngularMomentum,
        delta: finalAngularMomentum - initialAngularMomentum,
      },
      kineticEnergy: {
        initial: initialKineticEnergy,
        final: finalKineticEnergy,
        change: finalKineticEnergy - initialKineticEnergy,
        loss: kineticEnergyLoss,
        contactDissipation,
        balanceResidual: finalKineticEnergy - (initialKineticEnergy - contactDissipation),
      },
    };
    const messages = [];
    if (substeps > 1) {
      messages.push({
        level: "info",
        code: "adaptive_contact_substeps",
        message: `Contact step was divided into ${substeps} substeps to limit collision travel.`,
      });
    }
    if (diagnostics.closedSystem && diagnostics.momentum.relativeDrift > 1e-9) {
      messages.push({
        level: "warning",
        code: "momentum_drift",
        message: `Closed-system momentum drift is ${diagnostics.momentum.relativeDrift}.`,
      });
    }
    return {
      bodies,
      timeStep,
      substeps,
      contacts: [...aggregatedContacts.values()],
      contactCount: aggregatedContacts.size,
      dissipatedEnergy: contactDissipation,
      diagnostics,
      messages,
    };
  }

  return {
    EPSILON,
    DEFAULT_MATERIAL,
    validateMaterial,
    combineMaterials,
    assertSupportedCollisionBody,
    normalizeGround,
    detectCircleCircle,
    detectGroundContact,
    generateContacts,
    relativeVelocity,
    solveVelocityConstraints,
    solvePositionConstraints,
    solveContacts,
    computeAdaptiveSubsteps,
    systemMomentum,
    systemKineticEnergy,
    systemAngularMomentum,
    stepWorld,
  };
});

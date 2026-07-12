"use strict";

(function exposeDynamicsTracks(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsTracks = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsTracks() {
  const EPSILON = 1e-10;
  const TWO_PI = 2 * Math.PI;
  const DEFAULT_ARC_LENGTH_SAMPLES = 512;
  const DEFAULT_MAX_STEPS = 200_000;

  function finiteNumber(value, label) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be a finite number.`);
    return numeric;
  }

  function optionalFinite(value, fallback, label) {
    return value === undefined || value === null ? fallback : finiteNumber(value, label);
  }

  function positiveNumber(value, label) {
    const numeric = finiteNumber(value, label);
    if (!(numeric > EPSILON)) throw new RangeError(`${label} must be greater than zero.`);
    return numeric;
  }

  function nonNegativeNumber(value, label) {
    const numeric = finiteNumber(value, label);
    if (numeric < 0) throw new RangeError(`${label} must be non-negative.`);
    return numeric;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function point(value, label = "point") {
    if (!value || typeof value !== "object") throw new TypeError(`${label} must be an object.`);
    return {
      x: finiteNumber(value.x, `${label}.x`),
      y: finiteNumber(value.y, `${label}.y`),
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

  function magnitude(value) {
    return Math.hypot(value.x, value.y);
  }

  function leftNormal(tangent) {
    return { x: -tangent.y, y: tangent.x };
  }

  function normalizeType(value) {
    return String(value || "line")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
  }

  function normalizeEndpointMode(value) {
    const mode = String(value || "open").trim().toLowerCase();
    if (mode === "reflect" || mode === "reflection") return "bounce";
    if (mode === "closed" || mode === "halt") return "stop";
    if (!new Set(["open", "stop", "bounce"]).has(mode)) {
      throw new RangeError(`Unsupported endpoint behavior: ${String(value)}.`);
    }
    return mode;
  }

  function normalizeEndpoints(value) {
    if (!value || typeof value === "string") {
      const mode = normalizeEndpointMode(value || "open");
      return Object.freeze({ start: mode, end: mode });
    }
    return Object.freeze({
      start: normalizeEndpointMode(value.start || value.begin || "open"),
      end: normalizeEndpointMode(value.end || value.finish || "open"),
    });
  }

  function normalizeMaterial(spec) {
    const friction = spec?.friction;
    const common = typeof friction === "number"
      ? friction
      : spec?.frictionCoefficient ?? spec?.mu ?? undefined;
    const staticValue = spec?.staticFriction ?? spec?.muStatic ?? friction?.static ?? common ?? 0;
    const kineticValue = spec?.kineticFriction ?? spec?.muKinetic ?? friction?.kinetic ?? common ?? 0;
    const restitutionValue = spec?.restitution ?? spec?.coefficientOfRestitution ?? 0;
    const restitution = finiteNumber(restitutionValue, "restitution");
    if (restitution < 0 || restitution > 1) throw new RangeError("restitution must be between 0 and 1.");
    return Object.freeze({
      staticFriction: nonNegativeNumber(staticValue, "staticFriction"),
      kineticFriction: nonNegativeNumber(kineticValue, "kineticFriction"),
      restitution,
    });
  }

  function buildLookup(evaluate, segmentCount) {
    const count = Math.max(16, Math.min(20_000, Math.floor(segmentCount)));
    const parameters = new Array(count + 1);
    const points = new Array(count + 1);
    const lengths = new Array(count + 1);
    parameters[0] = 0;
    points[0] = evaluate(0);
    lengths[0] = 0;
    for (let index = 1; index <= count; index += 1) {
      const parameter = index / count;
      const current = evaluate(parameter);
      parameters[index] = parameter;
      points[index] = current;
      lengths[index] = lengths[index - 1] + magnitude(subtract(current, points[index - 1]));
    }
    const length = lengths[count];
    if (!(length > EPSILON)) throw new RangeError("Track length must be greater than zero.");

    function bracket(values, target) {
      let low = 0;
      let high = values.length - 1;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (values[middle] <= target) low = middle;
        else high = middle;
      }
      return low;
    }

    function uAtLength(value) {
      const target = clamp(value, 0, length);
      if (target <= 0) return 0;
      if (target >= length) return 1;
      const index = bracket(lengths, target);
      const span = lengths[index + 1] - lengths[index];
      const ratio = span > EPSILON ? (target - lengths[index]) / span : 0;
      return parameters[index] + ratio * (parameters[index + 1] - parameters[index]);
    }

    function lengthAtU(value) {
      const target = clamp(value, 0, 1);
      if (target <= 0) return 0;
      if (target >= 1) return length;
      const index = bracket(parameters, target);
      const span = parameters[index + 1] - parameters[index];
      const ratio = span > EPSILON ? (target - parameters[index]) / span : 0;
      return lengths[index] + ratio * (lengths[index + 1] - lengths[index]);
    }

    return { count, parameters, points, lengths, length, uAtLength, lengthAtU };
  }

  function makeTrack(spec, geometry, options = {}) {
    const normalSide = finiteNumber(spec.normalSide ?? spec.contactSide ?? 1, "normalSide");
    if (normalSide !== 1 && normalSide !== -1) throw new RangeError("normalSide must be 1 or -1.");
    const length = geometry.length;

    function derivativeAt(parameter) {
      let derivative = geometry.derivative(clamp(parameter, 0, 1));
      if (magnitude(derivative) > EPSILON) return derivative;
      const offset = 1e-6;
      const lower = geometry.evaluate(clamp(parameter - offset, 0, 1));
      const upper = geometry.evaluate(clamp(parameter + offset, 0, 1));
      derivative = subtract(upper, lower);
      if (!(magnitude(derivative) > EPSILON)) throw new RangeError("Track tangent is undefined at this point.");
      return derivative;
    }

    function frameAtU(parameter, explicitLength = null) {
      const u = clamp(finiteNumber(parameter, "parameter"), 0, 1);
      const position = geometry.evaluate(u);
      const derivative = derivativeAt(u);
      const speed = magnitude(derivative);
      const tangent = scale(derivative, 1 / speed);
      const baseNormal = leftNormal(tangent);
      const normal = scale(baseNormal, normalSide);
      const second = geometry.secondDerivative(u);
      const baseCurvature = speed > EPSILON ? cross(derivative, second) / (speed * speed * speed) : 0;
      const s = explicitLength === null ? geometry.lengthAtU(u) : explicitLength;
      const frame = {
        s,
        u,
        point: position,
        x: position.x,
        y: position.y,
        tangent,
        normal,
        curvature: baseCurvature * normalSide,
      };
      if (typeof geometry.cornerAt === "function") frame.corner = geometry.cornerAt(s);
      return frame;
    }

    function frameAt(value) {
      const s = clamp(finiteNumber(value, "s"), 0, length);
      return frameAtU(geometry.uAtLength(s), s);
    }

    function project(value) {
      const target = point(value);
      const u = clamp(geometry.projectU(target), 0, 1);
      const frame = frameAtU(u);
      const delta = subtract(target, frame.point);
      return {
        ...frame,
        distance: magnitude(delta),
        signedDistance: dot(delta, frame.normal),
      };
    }

    const track = {
      __dynamicsTrack: true,
      kind: geometry.kind,
      length,
      closed: Boolean(geometry.closed),
      normalSide,
      material: normalizeMaterial(spec),
      endpointBehavior: normalizeEndpoints(spec.endpointBehavior ?? spec.endBehavior ?? spec.endpoints),
      pointAt(value) {
        return frameAt(value).point;
      },
      tangentAt(value) {
        return frameAt(value).tangent;
      },
      normalAt(value) {
        return frameAt(value).normal;
      },
      curvatureAt(value) {
        return frameAt(value).curvature;
      },
      frameAt,
      frameAtNormalized(value) {
        return frameAtU(clamp(finiteNumber(value, "u"), 0, 1));
      },
      project,
      nearestProjection: project,
      sample(sampleOptions) {
        return sampleTrack(track, sampleOptions);
      },
    };
    if (options.freeze === true) Object.freeze(track);
    return track;
  }

  function lineGeometry(spec, type) {
    let start;
    let end;
    const explicitStart = spec.start || spec.p0;
    const explicitEnd = spec.end || spec.p1;
    if (explicitStart && explicitEnd) {
      start = point(explicitStart, "start");
      end = point(explicitEnd, "end");
    } else if (spec.length !== undefined && ["line", "linear", "incline", "inclined-line"].includes(type)) {
      start = point(explicitStart || spec.origin || { x: spec.x ?? 0, y: spec.y ?? 0 }, "origin");
      const length = positiveNumber(spec.length, "length");
      let angle;
      if (spec.angleRadians !== undefined) angle = finiteNumber(spec.angleRadians, "angleRadians");
      else if (spec.angleDegrees !== undefined) angle = finiteNumber(spec.angleDegrees, "angleDegrees") * Math.PI / 180;
      else angle = optionalFinite(spec.angle, 0, "angle") * Math.PI / 180;
      end = add(start, { x: length * Math.cos(angle), y: length * Math.sin(angle) });
    }
    if (!start || !end) throw new TypeError("A line track requires start/end or origin/length/angle.");
    const delta = subtract(end, start);
    const length = magnitude(delta);
    if (!(length > EPSILON)) throw new RangeError("Line endpoints must be distinct.");
    return {
      kind: type === "incline" || type === "inclined-line" ? "incline" : "line",
      length,
      closed: false,
      evaluate: (u) => add(start, scale(delta, u)),
      derivative: () => delta,
      secondDerivative: () => ({ x: 0, y: 0 }),
      uAtLength: (s) => clamp(s / length, 0, 1),
      lengthAtU: (u) => clamp(u, 0, 1) * length,
      projectU: (target) => clamp(dot(subtract(target, start), delta) / (length * length), 0, 1),
    };
  }

  function polylineGeometry(spec) {
    const rawPoints = spec.points || spec.vertices || spec.path;
    if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
      throw new TypeError("A polyline track requires at least two points.");
    }
    const points = [];
    rawPoints.forEach((value, index) => {
      const current = point(value, `points[${index}]`);
      if (!points.length || magnitude(subtract(current, points[points.length - 1])) > EPSILON) points.push(current);
    });
    if (points.length < 2) throw new RangeError("A polyline track requires two distinct points.");
    const segments = [];
    const cumulative = [0];
    for (let index = 0; index < points.length - 1; index += 1) {
      const delta = subtract(points[index + 1], points[index]);
      const length = magnitude(delta);
      segments.push({ start: points[index], end: points[index + 1], delta, length, tangent: scale(delta, 1 / length) });
      cumulative.push(cumulative[cumulative.length - 1] + length);
    }
    const length = cumulative[cumulative.length - 1];

    function segmentAtLength(value) {
      const s = clamp(value, 0, length);
      if (s >= length) return { segment: segments[segments.length - 1], index: segments.length - 1, local: 1 };
      let low = 0;
      let high = segments.length;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (cumulative[middle] <= s) low = middle;
        else high = middle;
      }
      const segment = segments[low];
      return { segment, index: low, local: (s - cumulative[low]) / segment.length };
    }

    function evaluate(u) {
      const selected = segmentAtLength(clamp(u, 0, 1) * length);
      return add(selected.segment.start, scale(selected.segment.delta, selected.local));
    }

    function derivative(u) {
      return scale(segmentAtLength(clamp(u, 0, 1) * length).segment.tangent, length);
    }

    function projectU(target) {
      let best = { distanceSquared: Infinity, s: 0 };
      segments.forEach((segment, index) => {
        const local = clamp(dot(subtract(target, segment.start), segment.delta) / (segment.length * segment.length), 0, 1);
        const candidate = add(segment.start, scale(segment.delta, local));
        const delta = subtract(target, candidate);
        const distanceSquared = dot(delta, delta);
        if (distanceSquared < best.distanceSquared) {
          best = { distanceSquared, s: cumulative[index] + local * segment.length };
        }
      });
      return best.s / length;
    }

    return {
      kind: "polyline",
      length,
      closed: false,
      evaluate,
      derivative,
      secondDerivative: () => ({ x: 0, y: 0 }),
      uAtLength: (s) => clamp(s / length, 0, 1),
      lengthAtU: (u) => clamp(u, 0, 1) * length,
      projectU,
      cornerAt(s) {
        for (let index = 1; index < cumulative.length - 1; index += 1) {
          if (Math.abs(s - cumulative[index]) <= 1e-9 * Math.max(1, length)) return true;
        }
        return false;
      },
    };
  }

  function angleValue(spec, name) {
    const degreeName = `${name}Degrees`;
    if (spec[degreeName] !== undefined) return finiteNumber(spec[degreeName], degreeName) * Math.PI / 180;
    const raw = finiteNumber(spec[name], name);
    return String(spec.angleUnit || "rad").toLowerCase().startsWith("deg") ? raw * Math.PI / 180 : raw;
  }

  function arcGeometry(spec) {
    const center = point(spec.center || { x: spec.centerX, y: spec.centerY }, "center");
    const radius = positiveNumber(spec.radius, "radius");
    const start = angleValue(spec, "startAngle");
    let sweep;
    if (spec.sweepAngle !== undefined || spec.sweepAngleDegrees !== undefined) {
      sweep = spec.sweepAngleDegrees !== undefined
        ? finiteNumber(spec.sweepAngleDegrees, "sweepAngleDegrees") * Math.PI / 180
        : angleValue(spec, "sweepAngle");
      if (spec.clockwise === true && sweep > 0) sweep *= -1;
      if (spec.clockwise === false && sweep < 0) sweep *= -1;
    } else {
      const end = angleValue(spec, "endAngle");
      sweep = end - start;
      if (spec.clockwise === true) {
        while (sweep > 0) sweep -= TWO_PI;
      } else {
        while (sweep < 0) sweep += TWO_PI;
      }
      if (Math.abs(sweep) <= EPSILON && spec.fullCircle === true) sweep = spec.clockwise === true ? -TWO_PI : TWO_PI;
    }
    if (!(Math.abs(sweep) > EPSILON)) throw new RangeError("Circular arc sweep must be non-zero.");
    if (Math.abs(sweep) > TWO_PI + 1e-9) throw new RangeError("Circular arc sweep cannot exceed one full revolution.");
    const length = radius * Math.abs(sweep);

    function evaluate(u) {
      const angle = start + sweep * u;
      return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
    }

    function derivative(u) {
      const angle = start + sweep * u;
      return { x: -radius * sweep * Math.sin(angle), y: radius * sweep * Math.cos(angle) };
    }

    function secondDerivative(u) {
      const angle = start + sweep * u;
      const factor = -radius * sweep * sweep;
      return { x: factor * Math.cos(angle), y: factor * Math.sin(angle) };
    }

    function projectU(target) {
      const angle = Math.atan2(target.y - center.y, target.x - center.x);
      let bestU = 0;
      let bestDistance = Infinity;
      for (let turn = -2; turn <= 2; turn += 1) {
        const candidate = clamp((angle + turn * TWO_PI - start) / sweep, 0, 1);
        const distance = magnitude(subtract(target, evaluate(candidate)));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestU = candidate;
        }
      }
      return bestU;
    }

    return {
      kind: "circular-arc",
      length,
      closed: Math.abs(Math.abs(sweep) - TWO_PI) <= 1e-9,
      evaluate,
      derivative,
      secondDerivative,
      uAtLength: (s) => clamp(s / length, 0, 1),
      lengthAtU: (u) => clamp(u, 0, 1) * length,
      projectU,
    };
  }

  function bezierGeometry(spec, options) {
    let controls = spec.points || spec.controlPoints;
    if (!controls) controls = [spec.p0 || spec.start, spec.p1 || spec.control1, spec.p2 || spec.control2, spec.p3 || spec.end];
    if (!Array.isArray(controls) || controls.length !== 4 || controls.some((value) => !value)) {
      throw new TypeError("A cubic Bezier track requires exactly four control points.");
    }
    const [p0, p1, p2, p3] = controls.map((value, index) => point(value, `points[${index}]`));

    function evaluate(u) {
      const oneMinus = 1 - u;
      const a = oneMinus * oneMinus * oneMinus;
      const b = 3 * oneMinus * oneMinus * u;
      const c = 3 * oneMinus * u * u;
      const d = u * u * u;
      return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
      };
    }

    function derivative(u) {
      const oneMinus = 1 - u;
      return add(
        add(scale(subtract(p1, p0), 3 * oneMinus * oneMinus), scale(subtract(p2, p1), 6 * oneMinus * u)),
        scale(subtract(p3, p2), 3 * u * u)
      );
    }

    function secondDerivative(u) {
      return add(
        scale(add(subtract(p2, scale(p1, 2)), p0), 6 * (1 - u)),
        scale(add(subtract(p3, scale(p2, 2)), p1), 6 * u)
      );
    }

    const requestedSamples = options.arcLengthSamples ?? spec.arcLengthSamples ?? DEFAULT_ARC_LENGTH_SAMPLES;
    const lookup = buildLookup(evaluate, positiveNumber(requestedSamples, "arcLengthSamples"));

    function projectU(target) {
      let bestU = 0;
      let bestDistanceSquared = Infinity;
      for (let index = 0; index < lookup.count; index += 1) {
        const startPoint = lookup.points[index];
        const delta = subtract(lookup.points[index + 1], startPoint);
        const lengthSquared = dot(delta, delta);
        const local = lengthSquared > EPSILON ? clamp(dot(subtract(target, startPoint), delta) / lengthSquared, 0, 1) : 0;
        const candidateU = lookup.parameters[index] + local / lookup.count;
        const candidatePoint = evaluate(candidateU);
        const offset = subtract(candidatePoint, target);
        const distanceSquared = dot(offset, offset);
        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestU = candidateU;
        }
      }
      for (let iteration = 0; iteration < 10; iteration += 1) {
        const current = evaluate(bestU);
        const first = derivative(bestU);
        const second = secondDerivative(bestU);
        const offset = subtract(current, target);
        const numerator = dot(offset, first);
        const denominator = dot(first, first) + dot(offset, second);
        if (Math.abs(denominator) <= EPSILON) break;
        const next = clamp(bestU - numerator / denominator, 0, 1);
        if (Math.abs(next - bestU) <= 1e-12) {
          bestU = next;
          break;
        }
        bestU = next;
      }
      const candidates = [0, bestU, 1];
      candidates.forEach((candidate) => {
        const offset = subtract(evaluate(candidate), target);
        const distanceSquared = dot(offset, offset);
        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestU = candidate;
        }
      });
      return bestU;
    }

    return {
      kind: "cubic-bezier",
      length: lookup.length,
      closed: false,
      evaluate,
      derivative,
      secondDerivative,
      uAtLength: lookup.uAtLength,
      lengthAtU: lookup.lengthAtU,
      projectU,
    };
  }

  function createTrack(spec, options = {}) {
    if (!spec || typeof spec !== "object") throw new TypeError("Track specification must be an object.");
    const type = normalizeType(spec.type || spec.kind || spec.trackType);
    let geometry;
    if (["line", "linear", "incline", "inclined-line"].includes(type)) geometry = lineGeometry(spec, type);
    else if (["polyline", "piecewise-linear", "broken-line"].includes(type)) geometry = polylineGeometry(spec);
    else if (["arc", "circular-arc", "circulararc", "circle-arc"].includes(type)) geometry = arcGeometry(spec);
    else if (["bezier", "cubic-bezier", "cubicbezier", "smooth", "smooth-curve"].includes(type)) geometry = bezierGeometry(spec, options);
    else throw new RangeError(`Unsupported track type: ${type}.`);
    return makeTrack(spec, geometry, options);
  }

  function validateTrack(spec, options = {}) {
    try {
      const track = createTrack(spec, options);
      return { valid: true, error: "", kind: track.kind, length: track.length };
    } catch (error) {
      return { valid: false, error: String(error.message || error), kind: null, length: 0 };
    }
  }

  function ensureTrack(value) {
    return value?.__dynamicsTrack === true ? value : createTrack(value);
  }

  function evaluateTrack(trackOrSpec, s) {
    return ensureTrack(trackOrSpec).frameAt(s);
  }

  function projectPoint(trackOrSpec, value) {
    return ensureTrack(trackOrSpec).project(value);
  }

  function sampleTrack(trackOrSpec, options = {}) {
    const track = ensureTrack(trackOrSpec);
    const normalized = typeof options === "number" ? { count: options } : options || {};
    let count;
    if (normalized.spacing !== undefined) {
      const spacing = positiveNumber(normalized.spacing, "spacing");
      count = Math.ceil(track.length / spacing) + 1;
    } else {
      count = Math.floor(optionalFinite(normalized.count, 65, "count"));
    }
    if (count < 2 || count > 100_001) throw new RangeError("sample count must be between 2 and 100001.");
    const samples = [];
    for (let index = 0; index < count; index += 1) {
      samples.push(track.frameAt((track.length * index) / (count - 1)));
    }
    return samples;
  }

  function solidDiskInertia(massValue, radiusValue) {
    const mass = positiveNumber(massValue, "mass");
    const radius = positiveNumber(radiusValue, "radius");
    return 0.5 * mass * radius * radius;
  }

  function vectorValue(value, label) {
    if (value === undefined || value === null) return { x: 0, y: 0 };
    if (typeof value === "number") return { x: 0, y: -Math.abs(finiteNumber(value, label)) };
    return point(value, label);
  }

  function normalizeBody(rawBody = {}) {
    const rawType = normalizeType(rawBody.type || rawBody.kind || rawBody.model || "particle");
    const diskTypes = new Set(["solid-disk", "soliddisk", "disk", "circle"]);
    const particleTypes = new Set(["particle", "point", "point-mass", "particle2d"]);
    if (!diskTypes.has(rawType) && !particleTypes.has(rawType)) {
      throw new RangeError(`Unsupported track body type: ${rawType}.`);
    }
    const type = diskTypes.has(rawType) ? "solid-disk" : "particle";
    const mass = positiveNumber(rawBody.mass ?? 1, "body.mass");
    const radius = type === "solid-disk" ? positiveNumber(rawBody.radius ?? rawBody.sizeB, "body.radius") : 0;
    const inertia = type === "solid-disk" ? solidDiskInertia(mass, radius) : 0;
    return Object.freeze({ type, mass, radius, inertia });
  }

  function simulationMaterial(config, track) {
    const source = {
      staticFriction: config.staticFriction ?? config.muStatic ?? track.material.staticFriction,
      kineticFriction: config.kineticFriction ?? config.muKinetic ?? track.material.kineticFriction,
      restitution: config.restitution ?? track.material.restitution,
    };
    return normalizeMaterial(source);
  }

  function conservativeAcceleration(config) {
    const gravity = config.gravity === undefined ? { x: 0, y: -9.81 } : vectorValue(config.gravity, "gravity");
    const external = typeof config.externalAcceleration === "function"
      ? { x: 0, y: 0 }
      : vectorValue(config.externalAcceleration, "externalAcceleration");
    return add(gravity, external);
  }

  function accelerationAt(config, time, frame, state) {
    let acceleration = conservativeAcceleration(config);
    if (typeof config.externalAcceleration === "function") {
      acceleration = add(acceleration, vectorValue(config.externalAcceleration({ time, frame, state: { ...state } }), "externalAcceleration result"));
    }
    return acceleration;
  }

  function rollingSolution(body, tangentialAcceleration, normalForce, material) {
    const rotationalMass = body.inertia / (body.radius * body.radius);
    const acceleration = (body.mass * tangentialAcceleration) / (body.mass + rotationalMass);
    const frictionForce = body.mass * acceleration - body.mass * tangentialAcceleration;
    const available = material.staticFriction * Math.max(normalForce, 0);
    return {
      feasible: Math.abs(frictionForce) <= available + 1e-10 * Math.max(1, available, Math.abs(frictionForce)),
      acceleration,
      angularAcceleration: acceleration / body.radius,
      frictionForce,
    };
  }

  function enforceRolling(state, body) {
    const slip = state.v - body.radius * state.omega;
    if (Math.abs(slip) <= 1e-14) return { ...state, omega: state.v / body.radius, mode: "rolling" };
    const impulse = -slip / (1 / body.mass + body.radius * body.radius / body.inertia);
    const velocity = state.v + impulse / body.mass;
    const omega = state.omega - body.radius * impulse / body.inertia;
    return { ...state, v: velocity, omega, mode: "rolling" };
  }

  function dynamicsAt(track, body, material, config, state, time) {
    const frame = track.frameAt(state.s);
    const external = accelerationAt(config, time, frame, state);
    const tangentialAcceleration = dot(external, frame.tangent);
    const normalAcceleration = dot(external, frame.normal);
    const rawNormalForce = body.mass * (state.v * state.v * frame.curvature - normalAcceleration);
    const detachTolerance = 1e-9 * Math.max(1, body.mass * magnitude(external), body.mass * state.v * state.v * Math.abs(frame.curvature));
    if (rawNormalForce < -detachTolerance) {
      return {
        frame,
        external,
        tangentialAcceleration,
        normalForce: rawNormalForce,
        detached: true,
        acceleration: tangentialAcceleration,
        angularAcceleration: 0,
        frictionForce: 0,
        mode: state.mode,
      };
    }
    const normalForce = Math.max(0, rawNormalForce);
    const velocityTolerance = optionalFinite(config.velocityTolerance, 1e-9, "velocityTolerance");

    if (body.type === "particle") {
      let direction = Math.sign(state.v);
      if (Math.abs(state.v) <= velocityTolerance) {
        const availableStaticAcceleration = material.staticFriction * normalForce / body.mass;
        if (Math.abs(tangentialAcceleration) <= availableStaticAcceleration + 1e-12) {
          return {
            frame,
            external,
            tangentialAcceleration,
            normalForce,
            detached: false,
            acceleration: 0,
            angularAcceleration: 0,
            frictionForce: -body.mass * tangentialAcceleration,
            mode: "particle-held",
          };
        }
        direction = Math.sign(tangentialAcceleration);
      }
      const frictionForce = direction === 0 ? 0 : -material.kineticFriction * normalForce * direction;
      return {
        frame,
        external,
        tangentialAcceleration,
        normalForce,
        detached: false,
        acceleration: tangentialAcceleration + frictionForce / body.mass,
        angularAcceleration: 0,
        frictionForce,
        mode: "particle-sliding",
      };
    }

    const rolling = rollingSolution(body, tangentialAcceleration, normalForce, material);
    const slipTolerance = optionalFinite(config.slipTolerance, 1e-8, "slipTolerance");
    const slip = state.v - body.radius * state.omega;
    if (state.mode !== "sliding" && rolling.feasible) {
      return { ...rolling, frame, external, tangentialAcceleration, normalForce, detached: false, mode: "rolling" };
    }
    if (Math.abs(slip) <= slipTolerance && rolling.feasible) {
      return { ...rolling, frame, external, tangentialAcceleration, normalForce, detached: false, mode: "rolling" };
    }
    const impendingSlip = Math.abs(slip) > slipTolerance ? slip : tangentialAcceleration;
    const direction = Math.sign(impendingSlip);
    const frictionForce = direction === 0 ? 0 : -material.kineticFriction * normalForce * direction;
    return {
      frame,
      external,
      tangentialAcceleration,
      normalForce,
      detached: false,
      acceleration: tangentialAcceleration + frictionForce / body.mass,
      angularAcceleration: -body.radius * frictionForce / body.inertia,
      frictionForce,
      mode: "sliding",
    };
  }

  function energyAt(body, conservative, frame, state) {
    const translational = 0.5 * body.mass * state.v * state.v;
    const rotational = body.type === "solid-disk" ? 0.5 * body.inertia * state.omega * state.omega : 0;
    const potential = -body.mass * dot(conservative, frame.point);
    return {
      translational,
      rotational,
      kinetic: translational + rotational,
      potential,
      mechanical: translational + rotational + potential,
    };
  }

  function sampleState(track, body, conservative, state, time, dynamics, flags = {}) {
    const frame = dynamics?.frame || track.frameAt(state.s);
    const energy = energyAt(body, conservative, frame, state);
    const sliding = body.type === "particle"
      ? dynamics?.mode === "particle-sliding" && Math.abs(state.v) > EPSILON
      : state.mode === "sliding";
    return {
      t: time,
      s: state.s,
      u: frame.u,
      x: frame.point.x,
      y: frame.point.y,
      point: frame.point,
      tangent: frame.tangent,
      normal: frame.normal,
      curvature: frame.curvature,
      v: state.v,
      speed: Math.abs(state.v),
      omega: state.omega,
      rollingConstraintError: body.type === "solid-disk" ? state.v - body.radius * state.omega : 0,
      normalForce: dynamics?.normalForce ?? 0,
      frictionForce: dynamics?.frictionForce ?? 0,
      tangentialAcceleration: dynamics?.tangentialAcceleration ?? 0,
      acceleration: dynamics?.acceleration ?? 0,
      angularAcceleration: dynamics?.angularAcceleration ?? 0,
      mode: dynamics?.mode || state.mode,
      sliding,
      detached: Boolean(flags.detached),
      endpointState: flags.endpointState || "none",
      energy,
    };
  }

  function solveBoundaryTime(s, velocity, acceleration, boundary, maximumTime) {
    const offset = s - boundary;
    const candidates = [];
    if (Math.abs(acceleration) <= 1e-14) {
      if (Math.abs(velocity) > EPSILON) candidates.push(-offset / velocity);
    } else {
      const discriminant = velocity * velocity - 2 * acceleration * offset;
      if (discriminant >= -1e-12) {
        const root = Math.sqrt(Math.max(0, discriminant));
        candidates.push((-velocity - root) / acceleration, (-velocity + root) / acceleration);
      }
    }
    const valid = candidates.filter((value) => value >= -1e-10 && value <= maximumTime + 1e-10);
    if (valid.length) return clamp(Math.min(...valid), 0, maximumTime);
    return maximumTime;
  }

  function simulateTrackMotion(configOrTrack, maybeOptions = null) {
    const config = maybeOptions ? { ...maybeOptions, track: configOrTrack } : configOrTrack;
    if (!config || typeof config !== "object") throw new TypeError("Simulation configuration must be an object.");
    const track = ensureTrack(config.track || config.path || config.constraint);
    const body = normalizeBody(config.body || config.object || {});
    const duration = positiveNumber(config.duration, "duration");
    const timeStep = positiveNumber(config.timeStep, "timeStep");
    const maxSteps = Math.floor(optionalFinite(config.maxSteps, DEFAULT_MAX_STEPS, "maxSteps"));
    if (maxSteps < 1) throw new RangeError("maxSteps must be at least one.");
    if (Math.ceil(duration / timeStep) > maxSteps) throw new RangeError(`Requested simulation exceeds maxSteps (${maxSteps}).`);
    const material = simulationMaterial(config, track);
    const endpoints = normalizeEndpoints(config.endpointBehavior ?? config.endBehavior ?? config.endpoints ?? track.endpointBehavior);
    const initial = config.initialState || {};
    let initialS = initial.s ?? config.initialS ?? config.s;
    if (initialS === undefined && (initial.position || config.initialPosition)) {
      initialS = track.project(initial.position || config.initialPosition).s;
    }
    initialS = optionalFinite(initialS, 0, "initialState.s");
    if (initialS < -EPSILON || initialS > track.length + EPSILON) throw new RangeError("initialState.s lies outside the track.");
    initialS = clamp(initialS, 0, track.length);
    const initialFrame = track.frameAt(initialS);
    let initialVelocity = initial.speed ?? initial.v ?? config.initialSpeed ?? config.speed;
    if (initialVelocity === undefined && (initial.velocity || config.initialVelocity)) {
      initialVelocity = dot(vectorValue(initial.velocity || config.initialVelocity, "initialVelocity"), initialFrame.tangent);
    }
    initialVelocity = optionalFinite(initialVelocity, 0, "initialState.speed");
    let initialOmega = initial.omega ?? config.initialOmega;
    const explicitSliding = initial.sliding ?? config.initialSliding;
    if (body.type === "solid-disk") {
      if (initialOmega === undefined) initialOmega = explicitSliding === true ? 0 : initialVelocity / body.radius;
      initialOmega = finiteNumber(initialOmega, "initialState.omega");
    } else initialOmega = 0;
    let mode = "particle";
    if (body.type === "solid-disk") {
      const slip = initialVelocity - body.radius * initialOmega;
      mode = explicitSliding === true || Math.abs(slip) > optionalFinite(config.slipTolerance, 1e-8, "slipTolerance")
        ? "sliding"
        : "rolling";
    }
    let state = { s: initialS, v: initialVelocity, omega: initialOmega, mode };
    if (body.type === "solid-disk" && mode === "rolling") state = enforceRolling(state, body);
    const conservative = conservativeAcceleration(config);
    const samples = [];
    let time = 0;
    let stepCount = 0;
    let arrivalTime = null;
    let endpointState = "none";
    let detached = false;
    let detachedReason = null;
    let terminated = false;
    let everSliding = mode === "sliding" || (body.type === "particle" && Math.abs(initialVelocity) > EPSILON);

    let currentDynamics = dynamicsAt(track, body, material, config, state, time);
    if (currentDynamics.detached) {
      detached = true;
      detachedReason = "negative-normal-force";
    }
    samples.push(sampleState(track, body, conservative, state, time, currentDynamics, { detached, endpointState }));

    while (!terminated && !detached && time < duration - 1e-12) {
      if (stepCount >= maxSteps) throw new RangeError(`Simulation exceeded maxSteps (${maxSteps}).`);
      const step = Math.min(timeStep, duration - time);
      currentDynamics = dynamicsAt(track, body, material, config, state, time);
      if (currentDynamics.detached) {
        detached = true;
        detachedReason = "negative-normal-force";
        samples[samples.length - 1] = sampleState(track, body, conservative, state, time, currentDynamics, { detached, endpointState });
        break;
      }
      if (body.type === "solid-disk" && currentDynamics.mode === "rolling" && state.mode !== "rolling") {
        state = enforceRolling(state, body);
        currentDynamics = dynamicsAt(track, body, material, config, state, time);
      }
      state.mode = currentDynamics.mode === "sliding" ? "sliding" : state.mode === "particle" ? "particle" : "rolling";
      const midpointState = {
        s: clamp(state.s + state.v * step / 2 + currentDynamics.acceleration * step * step / 8, 0, track.length),
        v: state.v + currentDynamics.acceleration * step / 2,
        omega: state.omega + currentDynamics.angularAcceleration * step / 2,
        mode: state.mode,
      };
      let midpointDynamics = dynamicsAt(track, body, material, config, midpointState, time + step / 2);
      if (midpointDynamics.detached) {
        state = midpointState;
        time += step / 2;
        stepCount += 1;
        detached = true;
        detachedReason = "negative-normal-force";
        samples.push(sampleState(track, body, conservative, state, time, midpointDynamics, { detached, endpointState }));
        break;
      }
      if (body.type === "solid-disk" && midpointDynamics.mode === "rolling" && midpointState.mode === "sliding") {
        Object.assign(midpointState, enforceRolling(midpointState, body));
        midpointDynamics = dynamicsAt(track, body, material, config, midpointState, time + step / 2);
      }
      const candidate = {
        s: state.s + state.v * step + midpointDynamics.acceleration * step * step / 2,
        v: state.v + midpointDynamics.acceleration * step,
        omega: state.omega + midpointDynamics.angularAcceleration * step,
        mode: midpointDynamics.mode === "sliding" ? "sliding" : state.mode,
      };
      if (body.type === "solid-disk") {
        const previousSlip = state.v - body.radius * state.omega;
        const candidateSlip = candidate.v - body.radius * candidate.omega;
        if (candidate.mode !== "sliding" || (previousSlip !== 0 && previousSlip * candidateSlip <= 0)) {
          const projected = enforceRolling(candidate, body);
          const projectedDynamics = dynamicsAt(track, body, material, config, { ...projected, s: clamp(projected.s, 0, track.length) }, time + step);
          if (projectedDynamics.mode === "rolling") Object.assign(candidate, projected);
        }
        if (candidate.mode === "rolling") candidate.omega = candidate.v / body.radius;
        if (candidate.mode === "sliding") everSliding = true;
      }
      if (body.type === "particle" && state.v * candidate.v < 0 && Math.abs(midpointDynamics.tangentialAcceleration) <= material.staticFriction * midpointDynamics.normalForce / body.mass + 1e-12) {
        const stopTime = midpointDynamics.acceleration === 0 ? step : clamp(-state.v / midpointDynamics.acceleration, 0, step);
        candidate.s = state.s + state.v * stopTime + midpointDynamics.acceleration * stopTime * stopTime / 2;
        candidate.v = 0;
      }

      const boundaryTolerance = 1e-10 * Math.max(1, track.length);
      const outsideStart = candidate.s < -EPSILON || (candidate.s <= boundaryTolerance && state.s > boundaryTolerance);
      const outsideEnd = candidate.s > track.length + EPSILON || (candidate.s >= track.length - boundaryTolerance && state.s < track.length - boundaryTolerance);
      if (outsideStart || outsideEnd) {
        const side = outsideStart ? "start" : "end";
        const boundary = outsideStart ? 0 : track.length;
        const hitTime = solveBoundaryTime(state.s, state.v, midpointDynamics.acceleration, boundary, step);
        const hitState = {
          s: boundary,
          v: state.v + midpointDynamics.acceleration * hitTime,
          omega: state.omega + midpointDynamics.angularAcceleration * hitTime,
          mode: candidate.mode,
        };
        if (body.type === "solid-disk" && hitState.mode === "rolling") hitState.omega = hitState.v / body.radius;
        time += hitTime;
        stepCount += 1;
        if (arrivalTime === null) arrivalTime = time;
        const behavior = endpoints[side];
        if (behavior === "open") {
          endpointState = `open-${side}`;
          detached = true;
          detachedReason = `open-${side}-endpoint`;
          state = hitState;
          const hitDynamics = dynamicsAt(track, body, material, config, state, time);
          samples.push(sampleState(track, body, conservative, state, time, hitDynamics, { detached, endpointState }));
          break;
        }
        if (behavior === "stop") {
          endpointState = `stopped-${side}`;
          const arrivalDynamics = dynamicsAt(track, body, material, config, hitState, time);
          samples.push(sampleState(track, body, conservative, hitState, time, arrivalDynamics, { endpointState: `arrived-${side}` }));
          state = { ...hitState, v: 0, omega: 0 };
          const hitDynamics = dynamicsAt(track, body, material, config, state, time);
          samples.push(sampleState(track, body, conservative, state, time, hitDynamics, { endpointState }));
          terminated = true;
          break;
        }
        endpointState = `bounced-${side}`;
        state = { ...hitState, v: -material.restitution * hitState.v };
        if (body.type === "solid-disk" && state.mode === "rolling") state.omega = state.v / body.radius;
        if (Math.abs(state.v) <= EPSILON && material.restitution === 0) {
          state.v = 0;
          state.omega = 0;
          endpointState = `stopped-${side}`;
          terminated = true;
        }
        const hitDynamics = dynamicsAt(track, body, material, config, state, time);
        samples.push(sampleState(track, body, conservative, state, time, hitDynamics, { endpointState }));
        continue;
      }

      candidate.s = clamp(candidate.s, 0, track.length);
      state = candidate;
      time += step;
      stepCount += 1;
      const acceptedDynamics = dynamicsAt(track, body, material, config, state, time);
      if (acceptedDynamics.mode === "particle-sliding") everSliding = true;
      if (acceptedDynamics.detached) {
        detached = true;
        detachedReason = "negative-normal-force";
      }
      samples.push(sampleState(track, body, conservative, state, time, acceptedDynamics, { detached, endpointState }));
    }

    const initialSample = samples[0];
    const final = samples[samples.length - 1];
    let bottomState = initialSample;
    for (const sample of samples) {
      if (sample.y < bottomState.y - 1e-12) bottomState = sample;
    }
    const initialEnergy = initialSample.energy;
    const finalEnergy = final.energy;
    const mechanicalChange = finalEnergy.mechanical - initialEnergy.mechanical;
    const energy = {
      initial: initialEnergy,
      final: finalEnergy,
      mechanicalChange,
      dissipated: Math.max(0, -mechanicalChange),
    };
    return {
      model: `track-${body.type}`,
      trackKind: track.kind,
      trackLength: track.length,
      body,
      material,
      endpointBehavior: endpoints,
      requestedDuration: duration,
      duration: final.t,
      timeStep,
      stepCount,
      samples,
      final,
      arrivalTime,
      bottomState,
      energy,
      sliding: final.sliding,
      everSliding,
      detached,
      detachedReason,
      endpointState,
      diagnostics: [
        ...(track.kind === "polyline" ? [{ level: "info", code: "polyline_corner_impulse", message: "Polyline corners use an ideal constraint impulse and zero segment curvature." }] : []),
        ...(detached ? [{ level: "info", code: "track_detached", message: "The constrained solve stopped at detachment; free-flight continuation belongs to the world solver." }] : []),
      ],
    };
  }

  return {
    EPSILON,
    DEFAULT_ARC_LENGTH_SAMPLES,
    createTrack,
    buildTrack: createTrack,
    validateTrack,
    sampleTrack,
    evaluateTrack,
    projectPoint,
    nearestProjection: projectPoint,
    solidDiskInertia,
    simulateTrackMotion,
    simulateConstrainedMotion: simulateTrackMotion,
    simulateTrack: simulateTrackMotion,
  };
});

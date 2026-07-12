"use strict";

(function exposeDynamicsRenderer(root, factory) {
  let tracks = root.DynamicsTracks;
  if (typeof module === "object" && module.exports) {
    try {
      tracks = require("./dynamics-tracks.js");
    } catch (_error) {
      tracks = null;
    }
  }
  const api = factory(tracks);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsRenderer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsRenderer(DynamicsTracks) {
  const SAMPLE_FIELDS = ["x", "y", "vx", "vy", "ax", "ay", "angle", "theta", "omega", "angularVelocity"];

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function interpolateSamples(samples, time) {
    if (!Array.isArray(samples) || samples.length === 0) return null;
    const requested = finite(time);
    if (requested <= finite(samples[0].t)) return { ...samples[0] };
    const last = samples[samples.length - 1];
    if (requested >= finite(last.t)) return { ...last };
    let low = 0;
    let high = samples.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (finite(samples[middle].t) <= requested) low = middle;
      else high = middle;
    }
    const before = samples[low];
    const after = samples[high];
    const span = Math.max(finite(after.t) - finite(before.t), 1e-12);
    const ratio = Math.max(0, Math.min(1, (requested - finite(before.t)) / span));
    const sample = { ...before, t: requested };
    for (const field of SAMPLE_FIELDS) {
      if (before[field] === undefined && after[field] === undefined) continue;
      sample[field] = finite(before[field]) + (finite(after[field]) - finite(before[field])) * ratio;
    }
    return sample;
  }

  function objectGeometry(projectObject) {
    const geometry = projectObject?.geometry || {};
    return {
      kind: String(geometry.kind || projectObject?.kind || "particle"),
      sizeA: finite(geometry.sizeA ?? projectObject?.sizeA, 1),
      sizeB: finite(geometry.sizeB ?? projectObject?.sizeB, 0.2),
      sizeC: finite(geometry.sizeC ?? projectObject?.sizeC, 0.1),
      collisionRadius: finite(geometry.collisionRadius ?? projectObject?.collisionRadius ?? geometry.sizeB ?? projectObject?.sizeB, 0),
      path: Array.isArray(geometry.path ?? projectObject?.path) ? geometry.path ?? projectObject.path : null,
    };
  }

  function buildObjectRenderModels(project, result, time) {
    const projectById = new Map((project?.objects || []).map((object) => [String(object.id), object]));
    return (result?.objectResults || []).map((objectResult) => {
      const objectId = String(objectResult.objectId ?? objectResult.id ?? "");
      const projectObject = projectById.get(objectId) || {};
      const sample = interpolateSamples(objectResult.samples, time) || objectResult.final || {};
      return {
        id: objectId,
        name: String(objectResult.name || projectObject.name || objectId),
        geometry: objectGeometry(projectObject),
        position: { x: finite(sample.x), y: finite(sample.y) },
        velocity: { x: finite(sample.vx), y: finite(sample.vy) },
        acceleration: { x: finite(sample.ax), y: finite(sample.ay) },
        angle: finite(sample.angle ?? sample.theta),
        angularVelocity: finite(sample.angularVelocity ?? sample.omega),
        contactState: sample.contactState || null,
        trackState: sample.trackState || null,
      };
    });
  }

  function buildTrackRenderModels(project, options = {}) {
    if (!DynamicsTracks) return [];
    return (project?.tracks || []).map((track) => {
      const built = DynamicsTracks.createTrack({ ...track, ...(track.geometry || {}) });
      return {
        id: String(track.id),
        kind: built.kind,
        points: DynamicsTracks.sampleTrack(built, { count: options.trackSampleCount || 96 }),
        endpointBehavior: track.endpointBehavior || "open",
      };
    });
  }

  function buildRenderModel({ project, result, time = 0, trackSampleCount = 96 }) {
    return Object.freeze({
      time: finite(time),
      objects: buildObjectRenderModels(project, result, time),
      tracks: buildTrackRenderModels(project, { trackSampleCount }),
      contacts: Array.isArray(result?.contacts) ? result.contacts.map((contact) => ({ ...contact })) : [],
      diagnostics: Array.isArray(result?.diagnostics) ? result.diagnostics.map((item) => ({ ...item })) : [],
    });
  }

  return { interpolateSamples, buildObjectRenderModels, buildTrackRenderModels, buildRenderModel };
});

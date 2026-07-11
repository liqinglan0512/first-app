"use strict";

(function exposeDynamicsFieldGeometry(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsFieldGeometry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsFieldGeometry() {
  const EPSILON = 1e-12;

  function finiteNumber(value, label) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be a finite number.`);
    return numeric;
  }

  function point(value, label = "point") {
    if (!value || typeof value !== "object") throw new TypeError(`${label} must be an object.`);
    return {
      x: finiteNumber(value.x, `${label}.x`),
      y: finiteNumber(value.y, `${label}.y`),
    };
  }

  function rectangleFromDrag(startValue, endValue) {
    const start = point(startValue, "start");
    const end = point(endValue, "end");
    return {
      centerX: (start.x + end.x) / 2,
      centerY: (start.y + end.y) / 2,
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  function circleFromDrag(centerValue, edgeValue) {
    const center = point(centerValue, "center");
    const edge = point(edgeValue, "edge");
    return {
      centerX: center.x,
      centerY: center.y,
      radius: Math.hypot(edge.x - center.x, edge.y - center.y),
    };
  }

  function polygonBounds(pathValue) {
    if (!Array.isArray(pathValue) || pathValue.length === 0) {
      throw new TypeError("path must contain at least one point.");
    }
    const path = pathValue.map((value, index) => point(value, `path[${index}]`));
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const value of path) {
      minX = Math.min(minX, value.x);
      maxX = Math.max(maxX, value.x);
      minY = Math.min(minY, value.y);
      maxY = Math.max(maxY, value.y);
    }
    return {
      minX,
      maxX,
      minY,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  function viewportWorldCenter({ origin, scale, canvasWidth, canvasHeight }) {
    const safeOrigin = point(origin, "origin");
    const safeScale = finiteNumber(scale, "scale");
    const width = finiteNumber(canvasWidth, "canvasWidth");
    const height = finiteNumber(canvasHeight, "canvasHeight");
    if (!(safeScale > 0)) throw new RangeError("scale must be greater than zero.");
    return {
      x: (width / 2 - safeOrigin.x) / safeScale,
      y: (safeOrigin.y - height / 2) / safeScale,
    };
  }

  function translatePathToCenter(pathValue, centerValue) {
    const bounds = polygonBounds(pathValue);
    const center = point(centerValue, "center");
    const dx = center.x - bounds.centerX;
    const dy = center.y - bounds.centerY;
    return pathValue.map((value, index) => {
      const current = point(value, `path[${index}]`);
      return { x: current.x + dx, y: current.y + dy };
    });
  }

  function polygonArea(pathValue) {
    if (!Array.isArray(pathValue) || pathValue.length < 3) return 0;
    const path = pathValue.map((value, index) => point(value, `path[${index}]`));
    let twiceArea = 0;
    for (let index = 0; index < path.length; index += 1) {
      const current = path[index];
      const next = path[(index + 1) % path.length];
      twiceArea += current.x * next.y - next.x * current.y;
    }
    return Math.abs(twiceArea) / 2;
  }

  function invalid(error) {
    return { valid: false, error };
  }

  function validateFieldGeometry(field) {
    if (!field || typeof field !== "object") return invalid("Field geometry is missing.");
    const rangeType = String(field.rangeType || "");
    if (rangeType === "global") return { valid: true, error: "" };
    try {
      point({ x: field.centerX, y: field.centerY }, "field center");
      if (rangeType === "rectangle") {
        const width = finiteNumber(field.width, "field.width");
        const height = finiteNumber(field.height, "field.height");
        if (!(width > EPSILON) || !(height > EPSILON)) return invalid("Rectangle width and height must be greater than zero.");
        return { valid: true, error: "" };
      }
      if (rangeType === "circle") {
        const radius = finiteNumber(field.radius, "field.radius");
        if (!(radius > EPSILON)) return invalid("Circle radius must be greater than zero.");
        return { valid: true, error: "" };
      }
      if (rangeType === "custom") {
        if (!Array.isArray(field.path) || field.path.length < 3) return invalid("Custom field path must contain at least three points.");
        const bounds = polygonBounds(field.path);
        if (!(bounds.width > EPSILON) || !(bounds.height > EPSILON) || !(polygonArea(field.path) > EPSILON)) {
          return invalid("Custom field path must enclose a non-zero area.");
        }
        return { valid: true, error: "" };
      }
    } catch (error) {
      return invalid(String(error.message || error));
    }
    return invalid(`Unsupported field range type: ${rangeType || "(empty)"}.`);
  }

  return {
    rectangleFromDrag,
    circleFromDrag,
    polygonBounds,
    viewportWorldCenter,
    translatePathToCenter,
    validateFieldGeometry,
  };
});

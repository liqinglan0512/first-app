"use strict";

(function exposeDynamicsFieldPlacement(root, factory) {
  const geometry = typeof module === "object" && module.exports
    ? require("./dynamics-field-geometry.js")
    : root.DynamicsFieldGeometry;
  const api = factory(geometry);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsFieldPlacement = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsFieldPlacement(Geometry) {
  if (!Geometry) throw new Error("DynamicsFieldPlacement requires DynamicsFieldGeometry.");

  function clonePoint(value) {
    return value ? { x: Number(value.x), y: Number(value.y) } : null;
  }

  function cloneField(field) {
    if (!field) return null;
    return {
      ...field,
      path: Array.isArray(field.path) ? field.path.map(clonePoint) : field.path ?? null,
    };
  }

  function createPlacementState() {
    return {
      phase: "idle",
      active: false,
      mode: null,
      editingFieldId: null,
      draft: null,
      startWorld: null,
      currentWorld: null,
      path: [],
    };
  }

  function configurePlacement(editingFieldId = null) {
    return {
      ...createPlacementState(),
      phase: "configuring",
      editingFieldId: editingFieldId ? String(editingFieldId) : null,
    };
  }

  function beginPlacement(placement, { mode, draft }) {
    if (!new Set(["rectangle", "circle", "custom"]).has(mode)) {
      throw new Error(`Unsupported field placement mode: ${String(mode)}.`);
    }
    return {
      ...createPlacementState(),
      phase: "placing",
      active: true,
      mode,
      editingFieldId: placement?.editingFieldId || null,
      draft: cloneField(draft),
    };
  }

  function startPlacement(placement, worldPoint) {
    if (!placement?.active) return placement;
    const current = clonePoint(worldPoint);
    return {
      ...placement,
      startWorld: current,
      currentWorld: current,
      path: placement.mode === "custom" ? [current] : [],
    };
  }

  function updatePlacement(placement, worldPoint, minimumDistance = 0) {
    if (!placement?.active || !placement.startWorld) return placement;
    const current = clonePoint(worldPoint);
    if (placement.mode !== "custom") return { ...placement, currentWorld: current };
    const last = placement.path[placement.path.length - 1];
    if (last && Math.hypot(current.x - last.x, current.y - last.y) < Math.max(Number(minimumDistance) || 0, 0)) {
      return placement;
    }
    return { ...placement, currentWorld: current, path: [...placement.path, current] };
  }

  function completePlacement(placement, worldPoint = null) {
    if (!placement?.active || !placement.startWorld || !placement.draft) {
      return {
        placement: createPlacementState(),
        field: null,
        validation: { valid: false, error: "Field placement has not started." },
      };
    }
    const updated = worldPoint ? updatePlacement(placement, worldPoint) : placement;
    let field = cloneField(updated.draft);
    if (updated.mode === "rectangle") {
      field = { ...field, ...Geometry.rectangleFromDrag(updated.startWorld, updated.currentWorld) };
    } else if (updated.mode === "circle") {
      field = { ...field, ...Geometry.circleFromDrag(updated.startWorld, updated.currentWorld) };
    } else {
      const path = updated.path.map(clonePoint);
      field = { ...field, path };
      if (path.length > 0) {
        const bounds = Geometry.polygonBounds(path);
        field.centerX = bounds.centerX;
        field.centerY = bounds.centerY;
        field.width = bounds.width;
        field.height = bounds.height;
      }
    }
    return {
      placement: createPlacementState(),
      field,
      validation: Geometry.validateFieldGeometry(field),
    };
  }

  function cancelPlacement() {
    return createPlacementState();
  }

  return {
    createPlacementState,
    configurePlacement,
    beginPlacement,
    startPlacement,
    updatePlacement,
    completePlacement,
    cancelPlacement,
  };
});

"use strict";

(function exposeProjectAdapter(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ProjectAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectAdapter() {
  const SOLVER_ELEMENT_TYPES = new Set(["frame", "rigid", "truss"]);

  function solverElementType(element) {
    const type = String(element?.type || "frame");
    return SOLVER_ELEMENT_TYPES.has(type) ? type : "frame";
  }

  function solverElement(element) {
    return {
      type: solverElementType(element),
      moment_release_i: Boolean(element?.moment_release_i),
      moment_release_j: Boolean(element?.moment_release_j),
    };
  }

  return { solverElementType, solverElement };
});

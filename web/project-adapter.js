"use strict";

(function exposeProjectAdapter(root, factory) {
  const projectSchema = typeof module === "object" && module.exports ? require("./project-schema.js") : root.ProjectSchema;
  const api = factory(projectSchema);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ProjectAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectAdapter(ProjectSchema) {
  if (!ProjectSchema) throw new Error("ProjectAdapter requires ProjectSchema.");
  const SOLVER_ELEMENT_TYPES = new Set(["frame", "rigid", "truss"]);

  function solverElementType(element) {
    const type = String(element?.type || "frame");
    return SOLVER_ELEMENT_TYPES.has(type) ? type : "frame";
  }

  function solverElement(element) {
    const type = solverElementType(element);
    const momentReleaseI = type === "frame" && Boolean(element?.moment_release_i);
    const momentReleaseJ = type === "frame" && Boolean(element?.moment_release_j);
    if (momentReleaseI && momentReleaseJ) {
      throw new Error("当前版本不支持普通梁柱双端弯矩释放，请拆分杆件或改用桁架单元。");
    }
    return {
      type,
      moment_release_i: momentReleaseI,
      moment_release_j: momentReleaseJ,
    };
  }

  return { ...ProjectSchema, solverElementType, solverElement };
});

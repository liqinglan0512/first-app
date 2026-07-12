"use strict";

(function exposeDynamicsController(root, factory) {
  const projectSchema =
    typeof module === "object" && module.exports ? require("./project-schema.js") : root.ProjectSchema;
  const dynamicsWorld =
    typeof module === "object" && module.exports ? require("./dynamics-world.js") : root.DynamicsWorld;
  const api = factory(projectSchema, dynamicsWorld);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsController = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsController(ProjectSchema, DynamicsWorld) {
  if (!ProjectSchema) throw new Error("DynamicsController requires ProjectSchema.");
  if (!DynamicsWorld) throw new Error("DynamicsController requires DynamicsWorld.");

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function emptyProject() {
    return {
      schema: ProjectSchema.DYNAMICS_SCHEMA,
      application: ProjectSchema.APPLICATION_ID,
      module: "dynamics",
      model: "independent-particle2d",
      simulation: { duration: 3, timeStep: 0.02 },
      objects: [],
      fields: [],
      forces: [],
      grounds: [],
      tracks: [],
      constraints: [],
    };
  }

  function loadProject(rawProject) {
    return ProjectSchema.loadDynamicsProject(clone(rawProject));
  }

  function createController(initialProject = emptyProject()) {
    let project = loadProject(initialProject);
    let result = null;
    let revision = 0;

    function snapshot() {
      return Object.freeze({
        revision,
        project: clone(project),
        result: clone(result),
      });
    }

    function replace(nextProject) {
      project = loadProject(nextProject);
      result = null;
      revision += 1;
      return snapshot();
    }

    function update(mutator) {
      if (typeof mutator !== "function") throw new Error("DynamicsController.update requires a function.");
      const draft = clone(project);
      const returned = mutator(draft);
      return replace(returned === undefined ? draft : returned);
    }

    function solve(options = {}) {
      const validated = loadProject(project);
      result = DynamicsWorld.simulateProject(validated, options);
      revision += 1;
      return clone(result);
    }

    function exportProject() {
      return clone(project);
    }

    return Object.freeze({ snapshot, replace, update, solve, exportProject });
  }

  return { emptyProject, loadProject, createController };
});

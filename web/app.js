"use strict";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const diagramCanvas = document.getElementById("diagramCanvas");
const dctx = diagramCanvas.getContext("2d");
const toast = document.getElementById("toast");
const dynamicsCanvas = document.getElementById("dynamicsCanvas");
const dynamicsCtx = dynamicsCanvas ? dynamicsCanvas.getContext("2d") : null;
const dynamicsToast = document.getElementById("dynamicsToast");

const els = {
  welcomeScreen: document.getElementById("welcomeScreen"),
  appShell: document.getElementById("appShell"),
  authChoicePanel: document.getElementById("authChoicePanel"),
  showLoginButton: document.getElementById("showLoginButton"),
  showRegisterButton: document.getElementById("showRegisterButton"),
  authPanel: document.getElementById("authPanel"),
  loginCard: document.getElementById("loginCard"),
  registerCard: document.getElementById("registerCard"),
  startPanel: document.getElementById("startPanel"),
  authMessage: document.getElementById("authMessage"),
  loginUsername: document.getElementById("loginUsername"),
  loginSubmit: document.getElementById("loginSubmit"),
  registerUsername: document.getElementById("registerUsername"),
  registerNickname: document.getElementById("registerNickname"),
  registerAvatar: document.getElementById("registerAvatar"),
  registerAvatarPreview: document.getElementById("registerAvatarPreview"),
  registerSubmit: document.getElementById("registerSubmit"),
  startAppButton: document.getElementById("startAppButton"),
  moduleChoicePanel: document.getElementById("moduleChoicePanel"),
  staticModuleButton: document.getElementById("staticModuleButton"),
  dynamicsModuleButton: document.getElementById("dynamicsModuleButton"),
  staticActiveButton: document.getElementById("staticActiveButton"),
  staticToDynamicsButton: document.getElementById("staticToDynamicsButton"),
  welcomeLogoutButton: document.getElementById("welcomeLogoutButton"),
  mainUserAvatar: document.getElementById("mainUserAvatar"),
  mainUserName: document.getElementById("mainUserName"),
  dynamicsShell: document.getElementById("dynamicsShell"),
  dynamicsUserAvatar: document.getElementById("dynamicsUserAvatar"),
  dynamicsUserName: document.getElementById("dynamicsUserName"),
  dynamicsSettingsButton: document.getElementById("dynamicsSettingsButton"),
  dynamicsToStaticButton: document.getElementById("dynamicsToStaticButton"),
  dynamicsBuildKind: document.getElementById("dynamicsBuildKind"),
  dynamicsCustomMode: document.getElementById("dynamicsCustomMode"),
  dynamicsPlaceButton: document.getElementById("dynamicsPlaceButton"),
  dynamicsFieldButton: document.getElementById("dynamicsFieldButton"),
  dynamicsForceButton: document.getElementById("dynamicsForceButton"),
  dynamicsFieldStatus: document.getElementById("dynamicsFieldStatus"),
  dynamicsClearButton: document.getElementById("dynamicsClearButton"),
  dynamicsUndoButton: document.getElementById("dynamicsUndoButton"),
  dynamicsRedoButton: document.getElementById("dynamicsRedoButton"),
  dynamicsDeleteButton: document.getElementById("dynamicsDeleteButton"),
  dynamicsOpenButton: document.getElementById("dynamicsOpenButton"),
  dynamicsSaveButton: document.getElementById("dynamicsSaveButton"),
  dynamicsReportButton: document.getElementById("dynamicsReportButton"),
  dynamicsFileInput: document.getElementById("dynamicsFileInput"),
  dynamicsSolveDialog: document.getElementById("dynamicsSolveDialog"),
  runDynamicsSolveButton: document.getElementById("runDynamicsSolveButton"),
  dynamicsFieldDialog: document.getElementById("dynamicsFieldDialog"),
  dynamicsEnvironment: document.getElementById("dynamicsEnvironment"),
  dynamicsFieldMagnitude: document.getElementById("dynamicsFieldMagnitude"),
  dynamicsFieldDirectionPreset: document.getElementById("dynamicsFieldDirectionPreset"),
  dynamicsVectorDirectionField: document.getElementById("dynamicsVectorDirectionField"),
  dynamicsFieldAngleField: document.getElementById("dynamicsFieldAngleField"),
  dynamicsFieldAngle: document.getElementById("dynamicsFieldAngle"),
  dynamicsMagneticDirectionField: document.getElementById("dynamicsMagneticDirectionField"),
  dynamicsMagneticDirection: document.getElementById("dynamicsMagneticDirection"),
  dynamicsFieldRange: document.getElementById("dynamicsFieldRange"),
  dynamicsFieldCenterX: document.getElementById("dynamicsFieldCenterX"),
  dynamicsFieldCenterY: document.getElementById("dynamicsFieldCenterY"),
  dynamicsRectangleRangeFields: document.getElementById("dynamicsRectangleRangeFields"),
  dynamicsFieldWidth: document.getElementById("dynamicsFieldWidth"),
  dynamicsFieldHeight: document.getElementById("dynamicsFieldHeight"),
  dynamicsCircleRangeField: document.getElementById("dynamicsCircleRangeField"),
  dynamicsFieldRadius: document.getElementById("dynamicsFieldRadius"),
  dynamicsFieldMessage: document.getElementById("dynamicsFieldMessage"),
  dynamicsFieldApplyButton: document.getElementById("dynamicsFieldApplyButton"),
  dynamicsForceDialog: document.getElementById("dynamicsForceDialog"),
  dynamicsForceTarget: document.getElementById("dynamicsForceTarget"),
  dynamicsForceType: document.getElementById("dynamicsForceType"),
  dynamicsForceMagnitudeLabel: document.getElementById("dynamicsForceMagnitudeLabel"),
  dynamicsForceMagnitude: document.getElementById("dynamicsForceMagnitude"),
  dynamicsForceDirectionPreset: document.getElementById("dynamicsForceDirectionPreset"),
  dynamicsForceAngle: document.getElementById("dynamicsForceAngle"),
  dynamicsForceStartField: document.getElementById("dynamicsForceStartField"),
  dynamicsForceStart: document.getElementById("dynamicsForceStart"),
  dynamicsForceDurationField: document.getElementById("dynamicsForceDurationField"),
  dynamicsForceDuration: document.getElementById("dynamicsForceDuration"),
  dynamicsForceMessage: document.getElementById("dynamicsForceMessage"),
  dynamicsForceApplyButton: document.getElementById("dynamicsForceApplyButton"),
  dynamicsRigidToggle: document.getElementById("dynamicsRigidToggle"),
  dynamicsSolveButton: document.getElementById("dynamicsSolveButton"),
  dynamicsMass: document.getElementById("dynamicsMass"),
  dynamicsDensity: document.getElementById("dynamicsDensity"),
  dynamicsCharge: document.getElementById("dynamicsCharge"),
  dynamicsSizeALabel: document.getElementById("dynamicsSizeALabel"),
  dynamicsSizeBLabel: document.getElementById("dynamicsSizeBLabel"),
  dynamicsSizeCLabel: document.getElementById("dynamicsSizeCLabel"),
  dynamicsSizeA: document.getElementById("dynamicsSizeA"),
  dynamicsSizeB: document.getElementById("dynamicsSizeB"),
  dynamicsSizeC: document.getElementById("dynamicsSizeC"),
  dynamicsMaterialE: document.getElementById("dynamicsMaterialE"),
  dynamicsShapeEquation: document.getElementById("dynamicsShapeEquation"),
  dynamicsX0: document.getElementById("dynamicsX0"),
  dynamicsY0: document.getElementById("dynamicsY0"),
  dynamicsVx0: document.getElementById("dynamicsVx0"),
  dynamicsVy0: document.getElementById("dynamicsVy0"),
  dynamicsDuration: document.getElementById("dynamicsDuration"),
  dynamicsTimeStep: document.getElementById("dynamicsTimeStep"),
  dynamicsOptionInputs: [...document.querySelectorAll("input[name='dynamicsOption']")],
  dynamicsResultText: document.getElementById("dynamicsResultText"),
  dynamicsObjectPanelTitle: document.getElementById("dynamicsObjectPanelTitle"),
  dynamicsObjectCount: document.getElementById("dynamicsObjectCount"),
  dynamicsFieldCount: document.getElementById("dynamicsFieldCount"),
  dynamicsForceCount: document.getElementById("dynamicsForceCount"),
  dynamicsObjectList: document.getElementById("dynamicsObjectList"),
  dynamicsFieldList: document.getElementById("dynamicsFieldList"),
  dynamicsForceList: document.getElementById("dynamicsForceList"),
  settingsButton: document.getElementById("settingsButton"),
  settingsDialog: document.getElementById("settingsDialog"),
  fontSizeSelect: document.getElementById("fontSizeSelect"),
  settingsNickname: document.getElementById("settingsNickname"),
  settingsAvatar: document.getElementById("settingsAvatar"),
  settingsAvatarPreview: document.getElementById("settingsAvatarPreview"),
  saveNicknameButton: document.getElementById("saveNicknameButton"),
  saveAvatarButton: document.getElementById("saveAvatarButton"),
  logoutButton: document.getElementById("logoutButton"),
  settingsMessage: document.getElementById("settingsMessage"),
  toolButtons: [...document.querySelectorAll(".tool-button")],
  selectionMode: document.getElementById("selectionMode"),
  supportPreset: document.getElementById("supportPreset"),
  gridToggle: document.getElementById("gridToggle"),
  snapToggle: document.getElementById("snapToggle"),
  orthogonalToggle: document.getElementById("orthogonalToggle"),
  themeButton: document.getElementById("themeButton"),
  solverBackend: document.getElementById("solverBackend"),
  elementType: document.getElementById("elementType"),
  momentReleaseI: document.getElementById("momentReleaseI"),
  momentReleaseJ: document.getElementById("momentReleaseJ"),
  elementLength: document.getElementById("elementLength"),
  setElementLengthButton: document.getElementById("setElementLengthButton"),
  materialE: document.getElementById("materialE"),
  sectionA: document.getElementById("sectionA"),
  sectionI: document.getElementById("sectionI"),
  deformScale: document.getElementById("deformScale"),
  deformedToggle: document.getElementById("deformedToggle"),
  momentToggle: document.getElementById("momentToggle"),
  shearToggle: document.getElementById("shearToggle"),
  axialToggle: document.getElementById("axialToggle"),
  stressStrainToggle: document.getElementById("stressStrainToggle"),
  nodeCount: document.getElementById("nodeCount"),
  elementCount: document.getElementById("elementCount"),
  loadCount: document.getElementById("loadCount"),
  selectionInfo: document.getElementById("selectionInfo"),
  resultText: document.getElementById("resultText"),
  solveButton: document.getElementById("solveButton"),
  saveButton: document.getElementById("saveButton"),
  reportButton: document.getElementById("reportButton"),
  openButton: document.getElementById("openButton"),
  fileInput: document.getElementById("fileInput"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  deleteButton: document.getElementById("deleteButton"),
  elementDialog: document.getElementById("elementDialog"),
  elementGeometry: document.getElementById("elementGeometry"),
  sectionShape: document.getElementById("sectionShape"),
  sectionRadius: document.getElementById("sectionRadius"),
  shapeInertia: document.getElementById("shapeInertia"),
  shapeInertiaProduct: document.getElementById("shapeInertiaProduct"),
  shapeStaticMoment: document.getElementById("shapeStaticMoment"),
  teeDepth: document.getElementById("teeDepth"),
  elementCurvature: document.getElementById("elementCurvature"),
  elementArcAngle: document.getElementById("elementArcAngle"),
  applyElementSettingsButton: document.getElementById("applyElementSettingsButton"),
  loadDialog: document.getElementById("loadDialog"),
  concentratedLoadPanel: document.getElementById("concentratedLoadPanel"),
  pointMomentPanel: document.getElementById("pointMomentPanel"),
  distributedLoadPanel: document.getElementById("distributedLoadPanel"),
  distributedMomentPanel: document.getElementById("distributedMomentPanel"),
  loadModeRadios: [...document.querySelectorAll("input[name='loadMode']")],
  loadDirectionButtons: [...document.querySelectorAll("[data-load-direction]")],
  pointLoadMagnitude: document.getElementById("pointLoadMagnitude"),
  pointLoadAngle: document.getElementById("pointLoadAngle"),
  pointLoadMoment: document.getElementById("pointLoadMoment"),
  pointMomentOnly: document.getElementById("pointMomentOnly"),
  distributedShape: document.getElementById("distributedShape"),
  distributedDirection: document.getElementById("distributedDirection"),
  distributedAngle: document.getElementById("distributedAngle"),
  distributedQi: document.getElementById("distributedQi"),
  distributedQj: document.getElementById("distributedQj"),
  distributedCoefficients: document.getElementById("distributedCoefficients"),
  distributedMoment: document.getElementById("distributedMoment"),
  applyLoadToSelectionButton: document.getElementById("applyLoadToSelectionButton"),
  solveDialog: document.getElementById("solveDialog"),
  runSolveButton: document.getElementById("runSolveButton"),
  supportDialog: document.getElementById("supportDialog"),
  supportAngle: document.getElementById("supportAngle"),
  applySupportSettingsButton: document.getElementById("applySupportSettingsButton"),
  solidifySupportNodeButton: document.getElementById("solidifySupportNodeButton"),
  nodeDialog: document.getElementById("nodeDialog"),
  solidifyNodeButton: document.getElementById("solidifyNodeButton"),
};

const state = {
  tool: "select",
  nodes: [],
  elements: [],
  loads: [],
  elementLoads: [],
  selected: null,
  selection: { nodes: [], elements: [] },
  pendingNode: null,
  pointer: null,
  drag: null,
  pan: null,
  rotateSupport: null,
  freeformDraw: null,
  dialogNodeId: null,
  pendingAvatar: "",
  pendingSettingsAvatar: "",
  currentUser: null,
  result: null,
  lastProject: null,
  lastScope: "whole",
  nodeSeq: 1,
  elementSeq: 1,
  undoStack: [],
  redoStack: [],
  origin: { x: 80, y: 620 },
  pxPerMeter: 90,
  minPxPerMeter: 18,
  maxPxPerMeter: 420,
  gridSize: 0.5,
  loadMode: "concentrated",
  loadDirection: "down",
  elementGeometry: "straight",
  elementDefaults: {
    sectionShape: "circle",
    sectionRadius: "50 mm",
    inertia: "80000000 mm^4",
    inertiaProduct: "0 mm^4",
    staticMoment: "0 mm^3",
    teeDepth: "0.35 m",
    curvature: 0.25,
    arcAngle: 45,
  },
  solveOptions: ["determinacy", "system", "internal", "moment", "shear", "axial", "displacement", "reaction", "danger"],
  activeModule: "welcome",
  dynamics: {
    objects: [],
    fields: [],
    forces: [],
    objectSeq: 1,
    fieldSeq: 1,
    forceSeq: 1,
    selectedObjectId: null,
    editingFieldId: null,
    object: null,
    field: null,
    result: null,
    animationId: null,
    animationStart: 0,
    paintPath: [],
    painting: false,
    placementMode: false,
    pan: null,
    fieldRangeDrawing: false,
    fieldRangePath: [],
    fieldRangeDraft: null,
    undoStack: [],
    redoStack: [],
    scale: 58,
    origin: { x: 80, y: 520 },
    viewportInitialized: false,
  },
};

const AUTH_USERS_KEY = "cms_users";
const AUTH_CURRENT_KEY = "cms_current_user";
const AUTH_FONT_SIZE_KEY = "cms_font_size";
const DEFAULT_USER_AVATAR = "/static/brand-avatar.png";

function loadUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "{}");
    const users = {};
    let removedPlaintextPassword = false;
    for (const [username, rawUser] of Object.entries(stored)) {
      if (!rawUser || typeof rawUser !== "object") continue;
      const { password: _discardedPassword, ...safeUser } = rawUser;
      removedPlaintextPassword ||= "password" in rawUser;
      users[username] = { ...safeUser, username };
    }
    if (removedPlaintextPassword) localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    return users;
  } catch (error) {
    return {};
  }
}

function saveUsers(users) {
  const safeUsers = {};
  for (const [username, rawUser] of Object.entries(users || {})) {
    const { password: _discardedPassword, ...safeUser } = rawUser || {};
    safeUsers[username] = { ...safeUser, username };
  }
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(safeUsers));
}

function setAuthMessage(message) {
  els.authMessage.textContent = message || "";
}

function setSettingsMessage(message) {
  els.settingsMessage.textContent = message || "";
}

function normalizedFontSize(value) {
  const size = String(value || "14");
  return ["13", "14", "16", "18"].includes(size) ? size : "14";
}

function applyFontSize(value, persist = true) {
  const size = normalizedFontSize(value);
  document.documentElement.style.setProperty("--ui-font-size", `${size}px`);
  els.fontSizeSelect.value = size;
  if (persist) localStorage.setItem(AUTH_FONT_SIZE_KEY, size);
}

function showDefaultAvatar(target) {
  target.classList.add("default-avatar");
  target.textContent = "CM";
}

function showAvatar(target, avatarData) {
  target.replaceChildren();
  target.classList.toggle("default-avatar", !avatarData);
  if (avatarData) {
    const image = document.createElement("img");
    image.src = avatarData;
    image.alt = "用户头像";
    target.appendChild(image);
  } else {
    target.textContent = "CM";
  }
}

function userAvatar(user) {
  return (user && user.avatar) || DEFAULT_USER_AVATAR;
}

function refreshCurrentUserDisplay(user = state.currentUser) {
  if (!user) {
    els.mainUserName.textContent = "未登录";
    els.mainUserName.title = "";
    showAvatar(els.mainUserAvatar, DEFAULT_USER_AVATAR);
    if (els.dynamicsUserName && els.dynamicsUserAvatar) {
      els.dynamicsUserName.textContent = "未登录";
      els.dynamicsUserName.title = "";
      showAvatar(els.dynamicsUserAvatar, DEFAULT_USER_AVATAR);
    }
    return;
  }
  const displayName = user.nickname || user.username;
  els.mainUserName.textContent = displayName;
  els.mainUserName.title = user.nickname ? `${user.nickname} (${user.username})` : user.username;
  showAvatar(els.mainUserAvatar, userAvatar(user));
  if (els.dynamicsUserName && els.dynamicsUserAvatar) {
    els.dynamicsUserName.textContent = displayName;
    els.dynamicsUserName.title = user.nickname ? `${user.nickname} (${user.username})` : user.username;
    showAvatar(els.dynamicsUserAvatar, userAvatar(user));
  }
}

function updateCurrentUser(patch) {
  if (!state.currentUser) return null;
  const users = loadUsers();
  const username = state.currentUser.username;
  const nextUser = { ...(users[username] || state.currentUser), ...patch, username };
  users[username] = nextUser;
  saveUsers(users);
  state.currentUser = nextUser;
  refreshCurrentUserDisplay(nextUser);
  return nextUser;
}

function showAuthMode(mode) {
  const isLogin = mode === "login";
  els.authPanel.classList.remove("hidden");
  els.loginCard.classList.toggle("hidden", !isLogin);
  els.registerCard.classList.toggle("hidden", isLogin);
  els.showLoginButton.classList.toggle("active", isLogin);
  els.showRegisterButton.classList.toggle("active", !isLogin);
  setAuthMessage("");
  const focusTarget = isLogin ? els.loginUsername : els.registerUsername;
  focusTarget.focus();
}

function resetAuthChoice() {
  els.authChoicePanel.classList.remove("hidden");
  els.authPanel.classList.add("hidden");
  els.loginCard.classList.add("hidden");
  els.registerCard.classList.add("hidden");
  els.showLoginButton.classList.remove("active");
  els.showRegisterButton.classList.remove("active");
  els.startAppButton.classList.remove("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.add("hidden");
}

function setCurrentUser(user) {
  state.currentUser = user;
  localStorage.setItem(AUTH_CURRENT_KEY, user.username);
  els.authChoicePanel.classList.add("hidden");
  els.authPanel.classList.add("hidden");
  els.loginCard.classList.add("hidden");
  els.registerCard.classList.add("hidden");
  els.startPanel.classList.remove("hidden");
  els.startAppButton.classList.remove("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.add("hidden");
  refreshCurrentUserDisplay(user);
  setAuthMessage(`当前本地配置：${user.username}`);
}

function initAuth() {
  const users = loadUsers();
  const currentUsername = localStorage.getItem(AUTH_CURRENT_KEY);
  const currentUser = currentUsername ? users[currentUsername] : null;
  if (currentUser) {
    setCurrentUser(currentUser);
  } else {
    resetAuthChoice();
    els.startPanel.classList.add("hidden");
    showDefaultAvatar(els.registerAvatarPreview);
    refreshCurrentUserDisplay(null);
    setAuthMessage("");
  }
}

function loginUser() {
  const username = els.loginUsername.value.trim();
  if (!username) {
    setAuthMessage("请填写本地配置名称。");
    return;
  }
  const user = loadUsers()[username];
  if (!user) {
    setAuthMessage("未找到该本地配置。");
    return;
  }
  setCurrentUser(user);
}

function registerUser() {
  const username = els.registerUsername.value.trim();
  const nickname = els.registerNickname.value.trim();
  if (!username || !nickname) {
    setAuthMessage("创建本地配置需要填写账户名和昵称。");
    return;
  }
  const users = loadUsers();
  if (users[username]) {
    setAuthMessage("该账户名已存在，请换一个。");
    return;
  }
  const user = {
    username,
    nickname,
    avatar: state.pendingAvatar || "",
  };
  users[username] = user;
  saveUsers(users);
  setCurrentUser(user);
}

function previewRegisterAvatar(file) {
  if (!file) {
    state.pendingAvatar = "";
    showDefaultAvatar(els.registerAvatarPreview);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.pendingAvatar = String(reader.result || "");
    showAvatar(els.registerAvatarPreview, state.pendingAvatar);
  });
  reader.readAsDataURL(file);
}

function openSettingsDialog() {
  if (!state.currentUser) return;
  state.pendingSettingsAvatar = "";
  els.settingsNickname.value = state.currentUser.nickname || "";
  els.settingsAvatar.value = "";
  applyFontSize(localStorage.getItem(AUTH_FONT_SIZE_KEY), false);
  showAvatar(els.settingsAvatarPreview, userAvatar(state.currentUser));
  setSettingsMessage("");
  if (!els.settingsDialog.open) els.settingsDialog.showModal();
}

function saveNickname() {
  const nickname = els.settingsNickname.value.trim();
  if (!nickname) {
    setSettingsMessage("昵称不能为空。");
    return;
  }
  updateCurrentUser({ nickname });
  setSettingsMessage("昵称已保存。");
}

function previewSettingsAvatar(file) {
  if (!file) {
    state.pendingSettingsAvatar = "";
    showAvatar(els.settingsAvatarPreview, userAvatar(state.currentUser));
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.pendingSettingsAvatar = String(reader.result || "");
    showAvatar(els.settingsAvatarPreview, state.pendingSettingsAvatar);
  });
  reader.readAsDataURL(file);
}

function saveSettingsAvatar() {
  if (!state.pendingSettingsAvatar) {
    setSettingsMessage("请选择新的头像文件。");
    return;
  }
  updateCurrentUser({ avatar: state.pendingSettingsAvatar });
  setSettingsMessage("头像已保存。");
}

function logoutUser() {
  state.currentUser = null;
  localStorage.removeItem(AUTH_CURRENT_KEY);
  if (els.settingsDialog.open) els.settingsDialog.close();
  els.appShell.classList.add("app-hidden");
  if (els.dynamicsShell) els.dynamicsShell.classList.add("app-hidden");
  els.welcomeScreen.classList.remove("hidden");
  els.startPanel.classList.add("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.add("hidden");
  state.activeModule = "welcome";
  resetAuthChoice();
  showDefaultAvatar(els.registerAvatarPreview);
  refreshCurrentUserDisplay(null);
  setAuthMessage("");
  setSettingsMessage("");
}

function startApplication() {
  if (!state.currentUser) {
    initAuth();
    return;
  }
  els.startAppButton.classList.add("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.remove("hidden");
  setAuthMessage("请选择计算模块。");
}

function launchStaticApplication() {
  if (!state.currentUser) {
    initAuth();
    return;
  }
  state.activeModule = "static";
  cancelDynamicsAnimation();
  els.welcomeScreen.classList.add("hidden");
  els.appShell.classList.remove("app-hidden");
  if (els.dynamicsShell) els.dynamicsShell.classList.add("app-hidden");
  resizeCanvas();
  syncUi();
}

function launchDynamicsApplication() {
  if (!state.currentUser) {
    initAuth();
    return;
  }
  state.activeModule = "dynamics";
  els.welcomeScreen.classList.add("hidden");
  els.appShell.classList.add("app-hidden");
  els.dynamicsShell.classList.remove("app-hidden");
  resizeDynamicsCanvas();
  syncDynamicsControls();
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function snapshot() {
  return JSON.stringify({
    nodes: state.nodes,
    elements: state.elements,
    loads: state.loads,
    elementLoads: state.elementLoads,
    nodeSeq: state.nodeSeq,
    elementSeq: state.elementSeq,
  });
}

function restore(serialized) {
  const data = JSON.parse(serialized);
  state.nodes = data.nodes || [];
  state.elements = data.elements || [];
  state.loads = data.loads || [];
  state.elementLoads = data.elementLoads || [];
  state.nodeSeq = data.nodeSeq || nextSequence(state.nodes, "N");
  state.elementSeq = data.elementSeq || nextSequence(state.elements, "E");
  state.selected = null;
  state.selection = { nodes: [], elements: [] };
  state.pendingNode = null;
  state.result = null;
  syncUi();
  draw();
}

function mutate(change) {
  state.undoStack.push(snapshot());
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
  change();
  state.result = null;
  syncUi();
  draw();
}

function undo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(snapshot());
  restore(state.undoStack.pop());
}

function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(snapshot());
  restore(state.redoStack.pop());
}

function dynamicsSnapshot() {
  return JSON.stringify({
    objects: state.dynamics.objects,
    fields: state.dynamics.fields,
    forces: state.dynamics.forces,
    objectSeq: state.dynamics.objectSeq,
    fieldSeq: state.dynamics.fieldSeq,
    forceSeq: state.dynamics.forceSeq,
  });
}

function recordDynamicsHistory() {
  state.dynamics.undoStack.push(dynamicsSnapshot());
  if (state.dynamics.undoStack.length > 100) state.dynamics.undoStack.shift();
  state.dynamics.redoStack = [];
}

function restoreDynamics(serialized) {
  cancelDynamicsAnimation();
  const data = JSON.parse(serialized);
  state.dynamics.objects = data.objects || [];
  state.dynamics.fields = data.fields || [];
  state.dynamics.forces = data.forces || [];
  state.dynamics.objectSeq = data.objectSeq || nextSequence(state.dynamics.objects, "D");
  state.dynamics.fieldSeq = data.fieldSeq || nextSequence(state.dynamics.fields, "F");
  state.dynamics.forceSeq = data.forceSeq || nextSequence(state.dynamics.forces, "A");
  state.dynamics.selectedObjectId = state.dynamics.objects[0]?.id || null;
  state.dynamics.object = state.dynamics.objects[0] || null;
  state.dynamics.field = state.dynamics.fields[state.dynamics.fields.length - 1] || null;
  state.dynamics.result = null;
  syncDynamicsObjectControls(state.dynamics.object);
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  renderDynamicsResult();
  drawDynamicsScene();
}

function undoDynamics() {
  if (!state.dynamics.undoStack.length) return;
  state.dynamics.redoStack.push(dynamicsSnapshot());
  restoreDynamics(state.dynamics.undoStack.pop());
}

function redoDynamics() {
  if (!state.dynamics.redoStack.length) return;
  state.dynamics.undoStack.push(dynamicsSnapshot());
  restoreDynamics(state.dynamics.redoStack.pop());
}

function setTool(tool) {
  if (tool === "element") {
    openElementDialog();
    return;
  }
  activateTool(tool);
}

function activateTool(tool) {
  state.tool = tool;
  state.pendingNode = null;
  state.freeformDraw = null;
  document.body.classList.toggle("freeform-drawing", tool === "element" && state.elementGeometry === "freeform");
  els.toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
  if (tool === "load") openLoadDialog();
  draw();
}

function openElementDialog() {
  els.elementGeometry.value = state.elementGeometry;
  els.sectionShape.value = state.elementDefaults.sectionShape;
  els.sectionRadius.value = state.elementDefaults.sectionRadius;
  els.shapeInertia.value = state.elementDefaults.inertia;
  els.shapeInertiaProduct.value = state.elementDefaults.inertiaProduct;
  els.shapeStaticMoment.value = state.elementDefaults.staticMoment;
  els.teeDepth.value = state.elementDefaults.teeDepth;
  els.elementCurvature.value = state.elementDefaults.curvature;
  els.elementArcAngle.value = state.elementDefaults.arcAngle;
  if (!els.elementDialog.open) els.elementDialog.showModal();
}

function applyElementSettings() {
  state.elementGeometry = els.elementGeometry.value;
  state.elementDefaults = {
    sectionShape: els.sectionShape.value,
    sectionRadius: els.sectionRadius.value || "50 mm",
    inertia: els.shapeInertia.value || "80000000 mm^4",
    inertiaProduct: els.shapeInertiaProduct.value || "0 mm^4",
    staticMoment: els.shapeStaticMoment.value || "0 mm^3",
    teeDepth: els.teeDepth.value || "0.35 m",
    curvature: Number(els.elementCurvature.value || 0),
    arcAngle: Number(els.elementArcAngle.value || 45),
  };
  els.sectionI.value = state.elementDefaults.inertia;
  activateTool("element");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(760, Math.floor(rect.width));
  canvas.height = Math.max(500, Math.floor(rect.height));
  const diagramRect = diagramCanvas.getBoundingClientRect();
  diagramCanvas.width = Math.max(760, Math.floor(diagramRect.width));
  diagramCanvas.height = Math.max(300, Math.floor(diagramRect.height));
  if (!state.originInitialized) {
    state.origin = { x: 70, y: canvas.height - 58 };
    state.originInitialized = true;
  }
  draw();
}

function screenToWorld(point) {
  const raw = {
    x: (point.x - state.origin.x) / state.pxPerMeter,
    y: (state.origin.y - point.y) / state.pxPerMeter,
  };
  return snapWorld(raw);
}

function screenToWorldRaw(point) {
  return {
    x: (point.x - state.origin.x) / state.pxPerMeter,
    y: (state.origin.y - point.y) / state.pxPerMeter,
  };
}

function worldToScreen(point) {
  return {
    x: state.origin.x + point.x * state.pxPerMeter,
    y: state.origin.y - point.y * state.pxPerMeter,
  };
}

function snapWorld(point) {
  if (!els.snapToggle.checked) return point;
  return {
    x: Math.round(point.x / state.gridSize) * state.gridSize,
    y: Math.round(point.y / state.gridSize) * state.gridSize,
  };
}

function applyOrthogonalLock(point) {
  if (!els.orthogonalToggle.checked || !state.pendingNode) return point;
  const first = getNode(state.pendingNode);
  if (!first) return point;
  const dx = Math.abs(point.x - first.x);
  const dy = Math.abs(point.y - first.y);
  return dx >= dy ? { x: point.x, y: first.y } : { x: first.x, y: point.y };
}

function getNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function getElement(id) {
  return state.elements.find((element) => element.id === id);
}

function elementGeometryOf(element) {
  if (element.geometry) return element.geometry;
  if (["arc", "tee", "freeform", "right_angle"].includes(element.type)) return element.type;
  return "straight";
}

function nodeAtScreen(x, y) {
  let best = null;
  let bestDistance = 9;
  for (const node of state.nodes) {
    if (node.fused) continue;
    const screen = worldToScreen(node);
    const distance = Math.hypot(screen.x - x, screen.y - y);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

function nodeOrSupportAtScreen(x, y) {
  return nodeAtScreen(x, y) || supportAtScreen(x, y);
}

function supportAtScreen(x, y) {
  const point = { x, y };
  let best = null;
  let bestDistance = 10;
  for (const node of state.nodes) {
    if (!isSupportNode(node)) continue;
    const distance = supportHitDistance(node, point);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

function supportSymbolSize() {
  return Math.max(42, Math.min(110, state.pxPerMeter * 0.95));
}

function supportHitDistance(node, point) {
  const screen = worldToScreen(node);
  const support = node.support || supportFromRestraints(node.restraints);
  const dir = supportDirection(node);
  const normal = { x: -dir.y, y: dir.x };
  const size = supportSymbolSize();
  const toNode = Math.hypot(screen.x - point.x, screen.y - point.y);
  let best = toNode;
  if (support.type === "ground") {
    const halfWidth = size * 0.62;
    best = Math.min(best, pointToSegmentDistance(point, groundStart(screen, normal, halfWidth), groundEnd(screen, normal, halfWidth)));
    return best;
  }
  if (support.type === "fixed" || (node.restraints.ux && node.restraints.uy && node.restraints.rz)) {
    const halfWidth = size * 0.62;
    best = Math.min(best, pointToSegmentDistance(point, groundStart(screen, normal, halfWidth), groundEnd(screen, normal, halfWidth)));
    return best;
  }
  const height = support.type === "roller" ? size * 0.58 : size * 0.55;
  const halfBase = support.type === "roller" ? size * 0.36 : size * 0.38;
  const base = { x: screen.x - dir.x * height, y: screen.y - dir.y * height };
  const p1 = { x: base.x + normal.x * halfBase, y: base.y + normal.y * halfBase };
  const p2 = { x: base.x - normal.x * halfBase, y: base.y - normal.y * halfBase };
  best = Math.min(best, pointToSegmentDistance(point, screen, p1), pointToSegmentDistance(point, screen, p2), pointToSegmentDistance(point, p1, p2));
  if (support.type === "roller") {
    const radius = Math.max(4, size * 0.085);
    const rollerCenter = { x: base.x - dir.x * (radius + 3), y: base.y - dir.y * (radius + 3) };
    for (const offset of [-radius * 1.8, radius * 1.8]) {
      const center = { x: rollerCenter.x + normal.x * offset, y: rollerCenter.y + normal.y * offset };
      best = Math.min(best, Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius));
    }
    const groundCenter = { x: base.x - dir.x * (radius * 3 + 8), y: base.y - dir.y * (radius * 3 + 8) };
    best = Math.min(best, pointToSegmentDistance(point, groundStart(groundCenter, normal, halfBase + 12), groundEnd(groundCenter, normal, halfBase + 12)));
  } else {
    best = Math.min(best, pointToSegmentDistance(point, groundStart(base, normal, halfBase + 8), groundEnd(base, normal, halfBase + 8)));
  }
  return best;
}

function groundStart(center, normal, halfWidth) {
  return { x: center.x + normal.x * halfWidth, y: center.y + normal.y * halfWidth };
}

function groundEnd(center, normal, halfWidth) {
  return { x: center.x - normal.x * halfWidth, y: center.y - normal.y * halfWidth };
}

function elementAtScreen(x, y) {
  let best = null;
  let bestDistance = 8;
  for (const element of state.elements) {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    const distance = elementDistanceAtScreen(element, { x, y }, a, b);
    if (distance < bestDistance) {
      best = element;
      bestDistance = distance;
    }
  }
  return best;
}

function elementDistanceAtScreen(element, point, a, b) {
  if (elementGeometryOf(element) !== "arc" && elementGeometryOf(element) !== "freeform") return pointToSegmentDistance(point, a, b);
  if (elementGeometryOf(element) === "freeform" && Array.isArray(element.path) && element.path.length > 1) {
    const points = element.path.map((item) => worldToScreen(item));
    let best = Infinity;
    for (let index = 1; index < points.length; index++) {
      best = Math.min(best, pointToSegmentDistance(point, points[index - 1], points[index]));
    }
    return best;
  }
  const control = arcControlPoint(element, a, b);
  let best = Infinity;
  let previous = a;
  for (let index = 1; index <= 48; index++) {
    const t = index / 48;
    const current = quadraticPoint(a, control, b, t);
    best = Math.min(best, pointToSegmentDistance(point, previous, current));
    previous = current;
  }
  return best;
}

function quadraticPoint(a, c, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function pointToSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  const projection = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function addNode(point) {
  const node = {
    id: `N${state.nodeSeq++}`,
    x: Number(point.x.toFixed(4)),
    y: Number(point.y.toFixed(4)),
    restraints: { ux: false, uy: false, rz: false },
    support: { type: "free", angle: 0, mode: "free" },
    fused: false,
  };
  state.nodes.push(node);
  setSelection("node", node.id);
  return node;
}

function addElement(nodeI, nodeJ) {
  if (nodeI === nodeJ) return null;
  const exists = state.elements.some((element) => {
    return (
      (element.node_i === nodeI && element.node_j === nodeJ) ||
      (element.node_i === nodeJ && element.node_j === nodeI)
    );
  });
  if (exists) {
    showToast("杆件已存在");
    return null;
  }
  const element = {
    id: `E${state.elementSeq++}`,
    node_i: nodeI,
    node_j: nodeJ,
    material: "steel",
    section: "default",
    type: els.elementType.value || "frame",
    geometry: state.elementGeometry,
    curvature: Number(state.elementDefaults.curvature || 0),
    arcAngle: Number(state.elementDefaults.arcAngle || 45),
    teeDepth: state.elementDefaults.teeDepth || "0.35 m",
    sectionParams: { ...state.elementDefaults },
    moment_release_i: false,
    moment_release_j: false,
  };
  state.elements.push(element);
  setSelection("element", element.id);
  return element;
}

function addFreeformElement(screenPath) {
  if (screenPath.length < 2) return null;
  const worldPath = screenPath.map((point) => {
    const world = screenToWorldRaw(point);
    return { x: Number(world.x.toFixed(4)), y: Number(world.y.toFixed(4)) };
  });
  const start = addNode(worldPath[0]);
  const end = addNode(worldPath[worldPath.length - 1]);
  const element = addElement(start.id, end.id);
  if (!element) return null;
  element.geometry = "freeform";
  element.path = worldPath;
  setSelection("element", element.id);
  return element;
}

function setSelection(type, id, additive = false) {
  if (!additive) state.selection = { nodes: [], elements: [] };
  const key = type === "node" ? "nodes" : "elements";
  if (!state.selection[key].includes(id)) state.selection[key].push(id);
  state.selected = { type, id };
  syncUi();
}

function clearSelection() {
  state.selected = null;
  state.selection = { nodes: [], elements: [] };
  syncUi();
}

function isNodeSelected(id) {
  return state.selection.nodes.includes(id) || (state.selected && state.selected.type === "node" && state.selected.id === id);
}

function isElementSelected(id) {
  return state.selection.elements.includes(id) || (state.selected && state.selected.type === "element" && state.selected.id === id);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function handlePointAction(point, event) {
  const hitNode = nodeOrSupportAtScreen(point.x, point.y);
  const hitElement = elementAtScreen(point.x, point.y);
  let world = screenToWorld(point);
  world = applyOrthogonalLock(world);

  if (state.tool === "select") {
    if (hitNode) {
      setSelection("node", hitNode.id, event.shiftKey);
    } else if (hitElement) {
      setSelection("element", hitElement.id, event.shiftKey);
    } else {
      clearSelection();
    }
    draw();
    return;
  }

  if (state.tool === "node") {
    mutate(() => {
      if (hitNode) setSelection("node", hitNode.id);
      else addNode(world);
    });
    return;
  }

  if (state.tool === "element") {
    mutate(() => {
      const target = hitNode || addNode(world);
      if (!state.pendingNode) {
        state.pendingNode = target.id;
        setSelection("node", target.id);
        return;
      }
      addElement(state.pendingNode, target.id);
      state.pendingNode = null;
    });
    return;
  }

  if (state.tool === "support") {
    if (!hitNode) return;
    mutate(() => {
      applySupportPreset(hitNode, els.supportPreset.value);
      setSelection("node", hitNode.id);
    });
    return;
  }

  if (state.tool === "load") {
    mutate(() => applyCurrentLoad(hitNode, hitElement, point));
  }
}

function selectByBox(start, end) {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  const nodes = state.nodes.filter((node) => {
    if (node.fused) return false;
    const point = worldToScreen(node);
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  });
  const nodeIds = nodes.map((node) => node.id);
  const elements = state.elements.filter((element) => {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) return false;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    return (
      (a.x >= left && a.x <= right && a.y >= top && a.y <= bottom) ||
      (b.x >= left && b.x <= right && b.y >= top && b.y <= bottom) ||
      pointToSegmentDistance({ x: left, y: top }, a, b) < Math.max(right - left, bottom - top)
    );
  });
  setGroupSelection(nodeIds, elements.map((element) => element.id));
}

function selectByLasso(path) {
  if (path.length < 3) return;
  const nodeIds = state.nodes
    .filter((node) => !node.fused)
    .filter((node) => pointInPolygon(worldToScreen(node), path))
    .map((node) => node.id);
  const elementIds = state.elements
    .filter((element) => {
      const nodeI = getNode(element.node_i);
      const nodeJ = getNode(element.node_j);
      if (!nodeI || !nodeJ) return false;
      const a = worldToScreen(nodeI);
      const b = worldToScreen(nodeJ);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return pointInPolygon(mid, path);
    })
    .map((element) => element.id);
  setGroupSelection(nodeIds, elementIds);
}

function setGroupSelection(nodeIds, elementIds) {
  state.selection = {
    nodes: [...new Set(nodeIds)],
    elements: [...new Set(elementIds)],
  };
  if (state.selection.elements.length) {
    state.selected = { type: "element", id: state.selection.elements[0] };
  } else if (state.selection.nodes.length) {
    state.selected = { type: "node", id: state.selection.nodes[0] };
  } else {
    state.selected = null;
  }
  syncUi();
  draw();
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function supportPresetToRestraints(preset) {
  if (preset === "fixed") return { ux: true, uy: true, rz: true };
  if (preset === "ground") return { ux: true, uy: true, rz: true };
  if (preset === "pin") return { ux: true, uy: true, rz: false };
  if (preset === "roller") return { ux: false, uy: true, rz: false };
  return { ux: false, uy: false, rz: false };
}

function applySupportPreset(node, preset) {
  const current = node.support || {};
  node.restraints = supportPresetToRestraints(preset);
  node.support = {
    type: preset,
    mode: preset === "pin" ? "fixed-ground" : preset === "roller" ? "rolling-ground" : preset === "ground" ? "fixed-ground" : preset,
    angle: Number(current.angle || 0),
    orientationExplicit: Boolean(current.orientationExplicit || current.mode === "rotating"),
  };
}

function parseRestraints(raw) {
  if (!raw) return { ux: false, uy: false, rz: false };
  if (Array.isArray(raw)) {
    return {
      ux: raw.includes("ux"),
      uy: raw.includes("uy"),
      rz: raw.includes("rz"),
    };
  }
  return {
    ux: Boolean(raw.ux),
    uy: Boolean(raw.uy),
    rz: Boolean(raw.rz),
  };
}

function restraintsToList(restraints) {
  return ["ux", "uy", "rz"].filter((dof) => Boolean(restraints[dof]));
}

function deleteSelection() {
  if (!state.selected && !state.selection.nodes.length && !state.selection.elements.length && state.pointer) {
    const hitNode = nodeOrSupportAtScreen(state.pointer.x, state.pointer.y);
    const hitElement = elementAtScreen(state.pointer.x, state.pointer.y);
    if (hitNode) {
      state.selected = { type: "node", id: hitNode.id };
      state.selection = { nodes: [hitNode.id], elements: [] };
    } else if (hitElement) {
      state.selected = { type: "element", id: hitElement.id };
      state.selection = { nodes: [], elements: [hitElement.id] };
    }
  }
  if (!state.selected && !state.selection.nodes.length && !state.selection.elements.length) return;
  mutate(() => {
    const nodeIds = new Set(state.selection.nodes);
    const elementIds = new Set(state.selection.elements);
    if (state.selected) {
      if (state.selected.type === "node") nodeIds.add(state.selected.id);
      if (state.selected.type === "element") elementIds.add(state.selected.id);
    }
    state.elements.forEach((element) => {
      if (nodeIds.has(element.node_i) || nodeIds.has(element.node_j)) elementIds.add(element.id);
    });
    state.nodes = state.nodes.filter((node) => !nodeIds.has(node.id));
    state.elements = state.elements.filter((element) => !elementIds.has(element.id));
    state.loads = state.loads.filter((load) => {
      if (load.node) return !nodeIds.has(load.node);
      if (load.element) return !elementIds.has(load.element);
      return true;
    });
    state.elementLoads = state.elementLoads.filter((load) => !elementIds.has(load.element));
    clearSelection();
    state.pendingNode = null;
  });
}

function buildProject(options = {}) {
  const scope = options.scope || "whole";
  const model = scopedModel(scope);
  return {
    metadata: {
      name: scope === "selection" ? "isolated_body" : "canvas_project",
      solve_options: state.solveOptions.join(","),
    },
    solver: els.solverBackend.value,
    materials: [{ id: "steel", E: els.materialE.value, nu: 0.3 }],
    sections: [{ id: "default", A: els.sectionA.value, I: els.sectionI.value }],
    nodes: model.nodes.map((node) => ({
      id: node.id,
      x: `${node.x} m`,
      y: `${node.y} m`,
      restraints: restraintsToList(node.restraints),
      support: node.support || { type: "free", angle: 0, mode: "free" },
      fused: Boolean(node.fused),
    })),
    elements: model.elements.map((element) => ({
      id: element.id,
      node_i: element.node_i,
      node_j: element.node_j,
      material: "steel",
      section: "default",
      ...ProjectAdapter.solverElement(element),
      geometry: elementGeometryOf(element),
      curvature: Number(element.curvature || 0),
      arcAngle: Number(element.arcAngle || 45),
      teeDepth: element.teeDepth || "0.35 m",
      sectionParams: element.sectionParams || {},
    })),
    loads: {
      nodes: projectNodalLoads(model),
      elements: projectElementLoads(model),
    },
  };
}

function solverElementType(element) {
  return ProjectAdapter.solverElementType(element);
}

function projectElementLoads(model) {
  if (model.elementLoads.some((load) => load.kind === "uniform_moment_local")) {
    throw new Error("均布力偶的一致荷载向量仍在开发中，请先删除该荷载后求解。");
  }
  const distributedLoads = model.elementLoads.map((load) => ({ ...load }));
  const pointLoads = model.loads
    .filter((load) => load.kind === "element_point" && load.element)
    .map((load) => ({
      element: load.element,
      kind: "point_global",
      ratio: Math.max(0, Math.min(1, Number(load.ratio ?? 0.5))),
      fx: load.fx || "0 N",
      fy: load.fy || "0 N",
      mz: load.mz || "0 N*m",
    }));
  return [...distributedLoads, ...pointLoads];
}

function projectNodalLoads(model) {
  return model.loads
    .filter((load) => load.node)
    .map((load) => ({
        node: load.node,
        fx: load.fx || "0 N",
        fy: load.fy || "0 N",
        mz: load.mz || "0 N*m",
      }));
}

function scopedModel(scope) {
  if (scope !== "selection") {
    return {
      nodes: state.nodes,
      elements: state.elements,
      loads: state.loads,
      elementLoads: state.elementLoads,
    };
  }
  const elementIds = new Set(state.selection.elements);
  const nodeIds = new Set(state.selection.nodes);
  if (state.selected) {
    if (state.selected.type === "element") elementIds.add(state.selected.id);
    if (state.selected.type === "node") nodeIds.add(state.selected.id);
  }
  for (const element of state.elements) {
    if (nodeIds.has(element.node_i) && nodeIds.has(element.node_j)) elementIds.add(element.id);
  }
  for (const element of state.elements) {
    if (elementIds.has(element.id)) {
      nodeIds.add(element.node_i);
      nodeIds.add(element.node_j);
    }
  }
  const nodes = state.nodes.filter((node) => nodeIds.has(node.id));
  const elements = state.elements.filter((element) => elementIds.has(element.id));
  if (!elements.length) throw new Error("选中隔离体至少需要包含一根杆件。");
  return {
    nodes,
    elements,
    loads: state.loads.filter((load) => (load.node ? nodeIds.has(load.node) : elementIds.has(load.element))),
    elementLoads: state.elementLoads.filter((load) => elementIds.has(load.element)),
  };
}

function importProject(project) {
  state.nodes = (project.nodes || []).map((node, index) => ({
    id: String(node.id || `N${index + 1}`),
    x: quantityToNumber(node.x ?? 0, "m"),
    y: quantityToNumber(node.y ?? 0, "m"),
    restraints: parseRestraints(node.restraints),
    support: parseSupport(node.support, node.restraints),
    fused: Boolean(node.fused),
  }));
  state.elements = (project.elements || []).map((element, index) => ({
    id: String(element.id || `E${index + 1}`),
    node_i: String(element.node_i),
    node_j: String(element.node_j),
    material: "steel",
    section: "default",
    type: ["arc", "tee", "freeform", "right_angle"].includes(String(element.type)) ? "frame" : String(element.type || "frame"),
    geometry: String(element.geometry || (["arc", "tee", "freeform", "right_angle"].includes(String(element.type)) ? element.type : "straight")),
    curvature: Number(element.curvature || 0),
    arcAngle: Number(element.arcAngle || 45),
    teeDepth: element.teeDepth == null ? "0.35 m" : quantityToText(element.teeDepth, "m"),
    path: (element.path || []).map((point) => ({ x: Number(point.x || 0), y: Number(point.y || 0) })),
    sectionParams: element.sectionParams || {},
    moment_release_i: Boolean(element.moment_release_i),
    moment_release_j: Boolean(element.moment_release_j),
  }));
  const rawNodeLoads = (project.loads && project.loads.nodes) || [];
  const rawElementLoads = (project.loads && project.loads.elements) || [];
  state.loads = rawNodeLoads.map((load) => {
    const imported = {
      kind: load.kind ? String(load.kind) : "node",
      fx: quantityToText(load.fx, "N"),
      fy: quantityToText(load.fy, "N"),
      mz: quantityToText(load.mz, "N*m"),
    };
    if (load.element) {
      imported.element = String(load.element);
      imported.ratio = load.ratio == null ? 0.5 : Number(load.ratio);
    } else {
      imported.node = String(load.node);
    }
    return imported;
  });
  for (const load of rawElementLoads.filter((item) => ["point_global", "element_point"].includes(String(item.kind)))) {
    state.loads.push({
      kind: "element_point",
      element: String(load.element),
      ratio: load.ratio == null ? 0.5 : Number(load.ratio),
      fx: quantityToText(load.fx, "N"),
      fy: quantityToText(load.fy, "N"),
      mz: quantityToText(load.mz, "N*m"),
    });
  }
  state.elementLoads = rawElementLoads.filter((load) => !["point_global", "element_point"].includes(String(load.kind))).map((load) => ({
    element: String(load.element),
    kind: String(load.kind || "uniform_local"),
    qx: quantityToText(load.qx, "N/m"),
    qy: quantityToText(load.qy, "N/m"),
    qx_i: quantityToText(load.qx_i, "N/m"),
    qx_j: quantityToText(load.qx_j, "N/m"),
    qy_i: quantityToText(load.qy_i, "N/m"),
    qy_j: quantityToText(load.qy_j, "N/m"),
    qx_coefficients: (load.qx_coefficients || []).map((item) => quantityToText(item, "N/m")),
    qy_coefficients: (load.qy_coefficients || []).map((item) => quantityToText(item, "N/m")),
    mz: quantityToText(load.mz, "N*m/m"),
  }));
  els.solverBackend.value = String(project.solver || (project.metadata && project.metadata.solver) || "frame2d");
  state.nodeSeq = nextSequence(state.nodes, "N");
  state.elementSeq = nextSequence(state.elements, "E");
  clearSelection();
  state.pendingNode = null;
  state.result = null;
  syncUi();
  draw();
}

function parseSupport(raw, restraints) {
  if (raw && typeof raw === "object") {
    return {
      type: String(raw.type || "free"),
      mode: String(raw.mode || raw.type || "free"),
      angle: Number(raw.angle || 0),
      orientationExplicit: Boolean(raw.orientationExplicit || raw.mode === "rotating"),
    };
  }
  const parsed = parseRestraints(restraints);
  if (parsed.ux && parsed.uy && parsed.rz) return { type: "fixed", mode: "fixed", angle: 0 };
  if (parsed.ux && parsed.uy) return { type: "pin", mode: "fixed-ground", angle: 0 };
  if (parsed.uy) return { type: "roller", mode: "rolling-ground", angle: 0 };
  return { type: "free", mode: "free", angle: 0 };
}

function nextSequence(items, prefix) {
  let max = 0;
  for (const item of items) {
    const match = String(item.id).match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function quantityToText(value, defaultUnit) {
  return Units.quantityToText(value, defaultUnit);
}

function quantityToNumber(value, defaultUnit) {
  return Units.parseQuantity(value, defaultUnit);
}

function formatQuantity(value, unit) {
  const rounded = Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6));
  return `${rounded} ${unit}`;
}

function saveProject() {
  const blob = new Blob([JSON.stringify(buildEditableProject(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "mechanics-project.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildEditableProject() {
  return {
    metadata: {
      name: "canvas_project",
      solve_options: state.solveOptions.join(","),
    },
    solver: els.solverBackend.value,
    materials: [{ id: "steel", E: els.materialE.value, nu: 0.3 }],
    sections: [{ id: "default", A: els.sectionA.value, I: els.sectionI.value }],
    nodes: state.nodes.map((node) => ({
      id: node.id,
      x: `${node.x} m`,
      y: `${node.y} m`,
      restraints: restraintsToList(node.restraints),
      support: node.support || { type: "free", angle: 0, mode: "free" },
      fused: Boolean(node.fused),
    })),
    elements: state.elements.map((element) => ({
      id: element.id,
      node_i: element.node_i,
      node_j: element.node_j,
      material: "steel",
      section: "default",
      type: element.type || "frame",
      geometry: elementGeometryOf(element),
      curvature: Number(element.curvature || 0),
      arcAngle: Number(element.arcAngle || 45),
      teeDepth: element.teeDepth || "0.35 m",
      sectionParams: element.sectionParams || {},
      moment_release_i: Boolean(element.moment_release_i),
      moment_release_j: Boolean(element.moment_release_j),
    })),
    loads: {
      nodes: state.loads.filter((load) => load.node).map((load) => ({ ...load })),
      elements: [
        ...state.elementLoads.map((load) => ({ ...load })),
        ...state.loads
          .filter((load) => load.kind === "element_point" && load.element)
          .map((load) => ({ ...load, kind: "point_global" })),
      ],
    },
  };
}

function selectedElement() {
  if (!state.selected || state.selected.type !== "element") return null;
  return getElement(state.selected.id);
}

function setSelectedElementType() {
  const element = selectedElement();
  if (!element) {
    showToast("请先选择杆件。");
    return;
  }
  mutate(() => {
    element.type = els.elementType.value;
    if (element.type !== "frame") {
      element.moment_release_i = false;
      element.moment_release_j = false;
    }
  });
}

function setSelectedElementReleases(changedEnd) {
  const element = selectedElement();
  if (!element) {
    showToast("请先选择普通梁柱杆件。");
    syncUi();
    return;
  }
  if (solverElementType(element) !== "frame") {
    showToast("端部弯矩释放仅适用于普通梁柱杆件。");
    syncUi();
    return;
  }
  let releaseI = Boolean(els.momentReleaseI.checked);
  let releaseJ = Boolean(els.momentReleaseJ.checked);
  if (releaseI && releaseJ) {
    if (changedEnd === "i") releaseJ = false;
    else releaseI = false;
    showToast("当前版本一次仅支持一个端部弯矩释放。");
  }
  mutate(() => {
    element.moment_release_i = releaseI;
    element.moment_release_j = releaseJ;
  });
}

function setSelectedElementShapeProperties() {
  const element = selectedElement();
  if (!element) return;
  mutate(() => {
    element.curvature = Number(els.elementCurvature.value || 0);
    element.teeDepth = els.teeDepth.value || "0.35 m";
  });
}

function setSelectedElementLength() {
  const element = selectedElement();
  if (!element) {
    showToast("请先选择杆件。");
    return;
  }
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  const length = quantityToNumber(els.elementLength.value, "m");
  if (!nodeI || !nodeJ || length <= 0) {
    showToast("杆件长度必须大于 0。");
    return;
  }
  mutate(() => {
    const dx = nodeJ.x - nodeI.x;
    const dy = nodeJ.y - nodeI.y;
    const current = Math.hypot(dx, dy) || 1;
    nodeJ.x = Number((nodeI.x + (dx / current) * length).toFixed(4));
    nodeJ.y = Number((nodeI.y + (dy / current) * length).toFixed(4));
  });
}

function openLoadDialog() {
  if (!els.loadDialog.open) els.loadDialog.showModal();
}

function syncLoadPanels() {
  state.loadMode = els.loadModeRadios.find((radio) => radio.checked).value;
  els.concentratedLoadPanel.classList.toggle("hidden", state.loadMode !== "concentrated");
  els.pointMomentPanel.classList.toggle("hidden", state.loadMode !== "point_moment");
  els.distributedLoadPanel.classList.toggle("hidden", state.loadMode !== "distributed");
  els.distributedMomentPanel.classList.toggle("hidden", state.loadMode !== "distributed_moment");
}

function setLoadDirection(direction) {
  state.loadDirection = direction;
  const angleMap = { right: 0, up: 90, left: 180, down: -90 };
  els.pointLoadAngle.value = angleMap[direction];
  els.loadDirectionButtons.forEach((button) => button.classList.toggle("active", button.dataset.loadDirection === direction));
}

function applyCurrentLoad(hitNode = null, hitElement = null, screenPoint = null) {
  if (state.loadMode === "distributed_moment") {
    showToast("均布力偶的一致荷载向量仍在开发中，当前版本暂不允许施加。");
    return;
  }

  if (state.loadMode === "concentrated" || state.loadMode === "point_moment") {
    const node = hitNode || (state.selected && state.selected.type === "node" ? getNode(state.selected.id) : null);
    if (node) {
      const load = state.loadMode === "point_moment" ? makePointMomentLoad(node.id) : makeConcentratedLoad(node.id);
      state.loads.push(load);
      setSelection("node", node.id);
      return;
    }
    const element = hitElement || (state.selected && state.selected.type === "element" ? getElement(state.selected.id) : null);
    if (!element) {
      showToast("集中力或集中力偶需要点选节点或杆件上的任意位置。");
      return;
    }
    if (solverElementType(element) === "truss") {
      showToast("桁架杆只能在节点处承受外荷载；请在荷载位置插入节点并拆分杆件。");
      return;
    }
    const ratio = screenPoint ? elementRatioAtScreen(element, screenPoint) : 0.5;
    const load = state.loadMode === "point_moment" ? makeElementPointMomentLoad(element.id, ratio) : makeElementPointLoad(element.id, ratio);
    state.loads.push(load);
    setSelection("element", element.id);
    return;
  }

  const element = hitElement || (state.selected && state.selected.type === "element" ? getElement(state.selected.id) : null);
  if (!element) {
    showToast("分布荷载需要点选一根杆件。");
    return;
  }
  const load = makeDistributedLoad(element);
  state.elementLoads.push(load);
  setSelection("element", element.id);
}

function makeConcentratedLoad(nodeId) {
  const magnitude = Math.abs(quantityToNumber(els.pointLoadMagnitude.value, "N"));
  const angle = Number(els.pointLoadAngle.value || 0) * (Math.PI / 180);
  const fx = magnitude * Math.cos(angle);
  const fy = magnitude * Math.sin(angle);
  return {
    node: nodeId,
    fx: formatQuantity(fx, "N"),
    fy: formatQuantity(fy, "N"),
    mz: els.pointLoadMoment.value || "0 N*m",
  };
}

function makePointMomentLoad(nodeId) {
  return {
    node: nodeId,
    fx: "0 N",
    fy: "0 N",
    mz: els.pointMomentOnly.value || "0 N*m",
  };
}

function makeElementPointLoad(elementId, ratio) {
  const magnitude = Math.abs(quantityToNumber(els.pointLoadMagnitude.value, "N"));
  const angle = Number(els.pointLoadAngle.value || 0) * (Math.PI / 180);
  const fx = magnitude * Math.cos(angle);
  const fy = magnitude * Math.sin(angle);
  return {
    kind: "element_point",
    element: elementId,
    ratio: Number(Math.max(0, Math.min(1, ratio)).toFixed(4)),
    fx: formatQuantity(fx, "N"),
    fy: formatQuantity(fy, "N"),
    mz: els.pointLoadMoment.value || "0 N*m",
  };
}

function makeElementPointMomentLoad(elementId, ratio) {
  return {
    kind: "element_point",
    element: elementId,
    ratio: Number(Math.max(0, Math.min(1, ratio)).toFixed(4)),
    fx: "0 N",
    fy: "0 N",
    mz: els.pointMomentOnly.value || "0 N*m",
  };
}

function elementRatioAtScreen(element, point) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return 0.5;
  const a = worldToScreen(nodeI);
  const b = worldToScreen(nodeJ);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (!length2) return 0.5;
  return Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
}

function elementLengthWorld(element) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return 0;
  return Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y);
}

function makeDistributedLoad(element) {
  const shape = els.distributedShape.value;
  if (shape === "custom") {
    return {
      element: element.id,
      kind: "polynomial_local",
      qx_coefficients: [],
      qy_coefficients: splitCoefficients(els.distributedCoefficients.value),
    };
  }

  const qiMagnitude = shape === "triangular" ? 0 : Math.abs(quantityToNumber(els.distributedQi.value, "N/m"));
  const qjMagnitude = Math.abs(quantityToNumber(els.distributedQj.value, "N/m"));
  const qi = localLoadComponents(element, qiMagnitude);
  const qj = localLoadComponents(element, qjMagnitude);
  if (shape === "rectangular") {
    return {
      element: element.id,
      kind: "uniform_local",
      qx: formatQuantity(qi.qx, "N/m"),
      qy: formatQuantity(qi.qy, "N/m"),
    };
  }
  return {
    element: element.id,
    kind: "linear_local",
    qx_i: formatQuantity(qi.qx, "N/m"),
    qy_i: formatQuantity(qi.qy, "N/m"),
    qx_j: formatQuantity(qj.qx, "N/m"),
    qy_j: formatQuantity(qj.qy, "N/m"),
  };
}

function splitCoefficients(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function globalVectorFromDirection(magnitude, direction, angleValue) {
  const angleMap = { right: 0, up: 90, left: 180, down: -90 };
  const angle = (direction === "angle" ? Number(angleValue || 0) : angleMap[direction]) * (Math.PI / 180);
  return { x: magnitude * Math.cos(angle), y: magnitude * Math.sin(angle) };
}

function localLoadComponents(element, magnitude) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  const dx = nodeJ.x - nodeI.x;
  const dy = nodeJ.y - nodeI.y;
  const length = Math.hypot(dx, dy) || 1;
  const c = dx / length;
  const s = dy / length;
  const global = globalVectorFromDirection(magnitude, els.distributedDirection.value, els.distributedAngle.value);
  return {
    qx: c * global.x + s * global.y,
    qy: -s * global.x + c * global.y,
  };
}

function openSolveDialog() {
  if (!els.solveDialog.open) els.solveDialog.showModal();
}

function openSupportDialog(node) {
  if (!node || !els.supportDialog) return;
  state.dialogNodeId = node.id;
  const support = node.support || supportFromRestraints(node.restraints);
  const mode = support.mode === "rotating" ? "rotating" : "fixed";
  const radio = document.querySelector(`input[name='supportMode'][value='${mode}']`);
  if (radio) radio.checked = true;
  els.supportAngle.value = Number(support.angle || 0);
  if (!els.supportDialog.open) els.supportDialog.showModal();
}

function applySupportSettings() {
  const node = getNode(state.dialogNodeId);
  if (!node) return;
  const mode = document.querySelector("input[name='supportMode']:checked").value;
  const angle = Number(els.supportAngle.value || 0);
  const current = node.support || supportFromRestraints(node.restraints);
  const type = ["pin", "roller", "ground", "fixed"].includes(current.type) ? current.type : "pin";
  const orientationExplicit = Boolean(
    current.orientationExplicit ||
    current.mode === "rotating" ||
    mode === "rotating" ||
    Math.abs(angle - Number(current.angle || 0)) > 1e-9
  );
  mutate(() => {
    if (type === "ground") {
      node.restraints = { ux: true, uy: true, rz: true };
      node.support = { type: "ground", mode: "fixed-ground", angle, orientationExplicit };
    } else if (type === "fixed") {
      node.restraints = { ux: true, uy: true, rz: true };
      node.support = { type: "fixed", mode: "fixed", angle, orientationExplicit };
    } else if (type === "roller") {
      node.restraints = supportPresetToRestraints("roller");
      node.support = { type: "roller", mode: mode === "rotating" ? "rotating" : "rolling-ground", angle, orientationExplicit };
    } else {
      node.restraints = { ux: true, uy: true, rz: false };
      node.support = { type: "pin", mode: mode === "rotating" ? "rotating" : "fixed-ground", angle, orientationExplicit };
    }
    setSelection("node", node.id);
  });
}

function openNodeDialog(node) {
  if (!node || !els.nodeDialog) return;
  state.dialogNodeId = node.id;
  if (!els.nodeDialog.open) els.nodeDialog.showModal();
}

function solidifyDialogNode() {
  const node = getNode(state.dialogNodeId);
  if (!node) return;
  const connected = state.elements.filter((element) => element.node_i === node.id || element.node_j === node.id);
  if (!connected.length) {
    showToast("游离节点不能固化为杆件内部点。");
    return;
  }
  mutate(() => {
    node.fused = true;
    if (state.selected && state.selected.type === "node" && state.selected.id === node.id) clearSelection();
  });
  showToast(`${node.id} 已固化为杆件内部点。`);
}

async function solveFromDialog() {
  state.solveOptions = [...document.querySelectorAll("input[name='solveOption']:checked")].map((input) => input.value);
  const scope = document.querySelector("input[name='solveScope']:checked").value;
  els.solveDialog.close();
  await solveProject(scope);
}

async function solveProject(scope = "whole") {
  let project;
  try {
    project = buildProject({ scope });
  } catch (error) {
    showToast(String(error.message || error));
    return;
  }
  els.solveButton.disabled = true;
  try {
    const response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "求解失败。");
    state.result = payload;
    state.lastProject = project;
    state.lastScope = scope;
    els.resultText.textContent = formatResult(payload, project, scope);
    applySolveDisplayOptions();
    showToast("求解完成。");
    draw();
  } catch (error) {
    state.result = null;
    els.resultText.textContent = String(error.message || error);
    showToast(String(error.message || error));
    draw();
  } finally {
    els.solveButton.disabled = false;
  }
}

function applySolveDisplayOptions() {
  els.momentToggle.checked = state.solveOptions.includes("moment");
  els.shearToggle.checked = state.solveOptions.includes("shear");
  els.axialToggle.checked = state.solveOptions.includes("axial");
  els.stressStrainToggle.checked = state.solveOptions.includes("stress_strain");
}

function formatResult(payload, project, scope) {
  const summary = payload.summary || {};
  const optionLabels = state.solveOptions.map((option) => solveOptionLabel(option));
  const lines = [
    "求解结果",
    `求解范围：${scope === "selection" ? "选中隔离体" : "整体模型"}`,
    `求解内容：${optionLabels.join("、") || "未指定"}`,
    `体系判断：${simpleSystemJudgement(project)}`,
    "",
  ];

  appendDiagnosticsResult(lines, summary.diagnostics);

  if (state.solveOptions.includes("displacement")) {
    lines.push("节点位移与转角");
    for (const [nodeId, values] of sortedEntries(payload.displacements || {})) {
      lines.push(
        `- ${nodeId}: ux=${formatSigned(values.ux * 1000)} mm，uy=${formatSigned(values.uy * 1000)} mm，θ=${formatSigned(values.rz)} rad`
      );
    }
    lines.push("");
  }

  if (state.solveOptions.includes("reaction")) {
    lines.push("支座反力");
    const reactions = sortedEntries(payload.reactions || {});
    if (!reactions.length) lines.push("- 未形成支座反力。");
    for (const [nodeId, values] of reactions) {
      lines.push(
        `- ${nodeId}: Fx=${formatSigned((values.fx || 0) / 1000)} kN，Fy=${formatSigned((values.fy || 0) / 1000)} kN，Mz=${formatSigned(
          (values.mz || 0) / 1000
        )} kN·m`
      );
    }
    lines.push("");
  }

  if (state.solveOptions.includes("internal")) {
    lines.push("杆端内力");
    for (const [elementId, values] of sortedEntries(payload.element_end_forces || {})) {
      lines.push(
        `- ${elementId}: Ni=${formatSigned(values.n_i / 1000)} kN，Vi=${formatSigned(values.v_i / 1000)} kN，Mi=${formatSigned(
          values.m_i / 1000
        )} kN·m；Nj=${formatSigned(values.n_j / 1000)} kN，Vj=${formatSigned(values.v_j / 1000)} kN，Mj=${formatSigned(
          values.m_j / 1000
        )} kN·m`
      );
    }
    lines.push("");
  }

  const extrema = [];
  if (state.solveOptions.includes("shear")) extrema.push(["剪力 V", "v", 1 / 1000, "kN"]);
  if (state.solveOptions.includes("moment")) extrema.push(["弯矩 M", "m", 1 / 1000, "kN·m"]);
  if (state.solveOptions.includes("axial")) extrema.push(["轴力 N", "n", 1 / 1000, "kN"]);
  if (extrema.length) {
    lines.push("内力图极值");
    for (const [label, component, scale, unit] of extrema) {
      const item = resultExtrema(payload, component, scale);
      if (!item) continue;
      lines.push(
        `- ${label}: 最大 ${formatSigned(item.max.value)} ${unit}（${item.max.element}, x=${formatNumber(item.max.x)} m），最小 ${formatSigned(
          item.min.value
        )} ${unit}（${item.min.element}, x=${formatNumber(item.min.x)} m）`
      );
    }
    lines.push("");
  }

  if (state.solveOptions.includes("stress") || state.solveOptions.includes("strain") || state.solveOptions.includes("stress_strain")) {
    appendStressStrainSummary(lines, payload, project);
  }

  if (state.solveOptions.includes("danger") && (summary.dangerous_sections || []).length) {
    lines.push("危险截面");
    for (const item of summary.dangerous_sections.slice(0, 3)) {
      lines.push(`- ${item.element}: x=${formatNumber(item.x)} m，|M|=${formatSigned(Math.abs(item.moment) / 1000)} kN·m`);
    }
    lines.push("");
  }

  if (state.solveOptions.includes("flexibility")) {
    lines.push("柔度");
    const flexibility = summary.load_point_flexibility || [];
    if (!flexibility.length) lines.push("- 当前荷载点没有可计算的柔度结果。");
    for (const item of flexibility) {
      const unit = item.kind === "rotation" ? "rad/(N·m)" : "m/N";
      lines.push(
        `- ${item.node}: 荷载=${formatSigned(item.load)}，响应=${formatSigned(item.displacement)}，柔度=${formatSigned(item.flexibility, 6)} ${unit}`
      );
    }
    lines.push("");
  }

  lines.push("计算推导过程");
  lines.push("1. 将界面输入统一换算到 SI 单位：力 N、长度 m、弹性模量 Pa、截面 A 为 m²、惯性矩 I 为 m⁴。");
  lines.push("2. 对每根杆件建立局部坐标梁柱单元刚度矩阵 k'，再用方向余弦构造转换矩阵 T，得到全局刚度 k=Tᵀk'T。");
  lines.push("3. 把集中荷载、分布荷载换算成等效节点荷载，组装总体方程 [K]{u}={P}。");
  lines.push("4. 按支座约束消去受限自由度，求得节点位移 ux、uy 和转角 θ。");
  lines.push("5. 由 {R}=[K]{u}-{P} 得到支座反力，由杆端位移反算 Ni、Vi、Mi、Nj、Vj、Mj，并沿杆长插值得到 N/V/M 图。");
  if (state.solveOptions.includes("stress") || state.solveOptions.includes("strain") || state.solveOptions.includes("stress_strain")) {
    lines.push("6. 应力按 σ=N/A+M·c/I 估算，应变按 ε=σ/E 计算；当前 c 取等效截面高度 sqrt(A)/2。");
  }
  return lines.join("\n");
}

function solveOptionLabel(option) {
  const labels = {
    determinacy: "静定/超静定分析",
    system: "体系判断",
    internal: "各内力求解",
    moment: "弯矩图",
    shear: "剪力图",
    axial: "轴力图",
    displacement: "位移",
    reaction: "支座反力",
    danger: "危险截面",
    flexibility: "柔度",
    stress: "组合正应力估算",
    strain: "应变",
    stress_strain: "应变-应力图",
  };
  return labels[option] || option;
}

function appendDiagnosticsResult(lines, diagnostics) {
  if (!diagnostics) return;
  lines.push("模型诊断");
  lines.push(`- 节点数：${diagnostics.node_count ?? 0}`);
  lines.push(`- 单元数：${diagnostics.element_count ?? 0}`);
  lines.push(`- 约束自由度数：${diagnostics.restrained_dof_count ?? 0}`);
  lines.push(`- 总自由度数：${diagnostics.total_dof_count ?? 0}`);
  lines.push(`- 自由自由度数：${diagnostics.free_dof_count ?? 0}`);
  lines.push(`- 静定指数 s：${diagnostics.determinacy_index ?? 0}`);
  const components = diagnostics.connected_components || [];
  if (components.length) {
    lines.push(`- 连通分量：${components.map((component) => `[${component.join(", ")}]`).join("；")}`);
  }
  const issues = diagnostics.issues || [];
  if (issues.length) {
    lines.push("提示：");
    for (const issue of issues) {
      lines.push(`- [${diagnosticLevelLabel(issue.level)}] ${diagnosticIssueText(issue)}`);
    }
  } else {
    lines.push("提示：未发现拓扑级诊断问题。");
  }
  lines.push("");
}

function diagnosticLevelLabel(level) {
  const labels = {
    info: "信息",
    warning: "警告",
    error: "错误",
  };
  return labels[level] || level || "信息";
}

function diagnosticIssueText(issue) {
  const messages = {
    duplicate_node_id: "存在重复节点 ID。",
    missing_node_i: "存在杆件引用了缺失的起点节点。",
    missing_node_j: "存在杆件引用了缺失的终点节点。",
    zero_length_element: "存在零长度杆件。",
    disconnected_structure: "模型存在多个不连通部分。",
    isolated_node: "存在未连接到任何杆件的孤立节点。",
    no_free_dof: "模型没有可求解的自由自由度。",
    likely_mechanism: "静定指数为负，模型可能为机构或约束不足。",
    roughly_determinate: "静定指数为 0，拓扑估算可能为静定结构。",
    roughly_indeterminate: "静定指数为正，拓扑估算可能为超静定结构。",
  };
  return messages[issue.code] || issue.message || issue.code || "未知诊断信息。";
}

function sortedEntries(object) {
  return Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

function formatNumber(value, digits = 4) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (Math.abs(numeric) < 1e-12) return "0";
  const abs = Math.abs(numeric);
  if (abs >= 100000 || abs < 0.001) return numeric.toExponential(3);
  return String(Number(numeric.toFixed(digits)));
}

function formatSigned(value, digits = 4) {
  return formatNumber(value, digits);
}

function resultExtrema(payload, component, scale = 1) {
  const points = [];
  for (const [elementId, rows] of sortedEntries(payload.element_diagrams || {})) {
    for (const row of rows || []) {
      points.push({ element: elementId, x: Number(row.x || 0), value: Number(row[component] || 0) * scale });
    }
  }
  if (!points.length) return null;
  return {
    max: points.reduce((best, point) => (point.value > best.value ? point : best), points[0]),
    min: points.reduce((best, point) => (point.value < best.value ? point : best), points[0]),
  };
}

function appendStressStrainSummary(lines, payload, project) {
  const values = [];
  for (const [elementId, rows] of sortedEntries(payload.element_diagrams || {})) {
    for (const row of rows || []) {
      const stress = stressAtProjectRow(row, project);
      values.push({
        element: elementId,
        x: Number(row.x || 0),
        stress: stress / 1e6,
        strain: (stress / projectElasticModulus(project)) * 1e6,
      });
    }
  }
  if (!values.length) return;
  const maxStress = values.reduce((best, item) => (Math.abs(item.stress) > Math.abs(best.stress) ? item : best), values[0]);
  const maxStrain = values.reduce((best, item) => (Math.abs(item.strain) > Math.abs(best.strain) ? item : best), values[0]);
  lines.push("应力与应变");
  if (state.solveOptions.includes("stress") || state.solveOptions.includes("stress_strain")) {
    lines.push(`- 最大组合正应力：${formatSigned(maxStress.stress)} MPa（${maxStress.element}, x=${formatNumber(maxStress.x)} m）`);
  }
  if (state.solveOptions.includes("strain") || state.solveOptions.includes("stress_strain")) {
    lines.push(`- 最大应变：${formatSigned(maxStrain.strain)} με（${maxStrain.element}, x=${formatNumber(maxStrain.x)} m）`);
  }
  lines.push("");
}

function stressAtProjectRow(row, project) {
  const section = (project.sections && project.sections[0]) || {};
  const area = Math.max(quantityToNumber(section.A || els.sectionA.value, "m^2"), 1e-12);
  const inertia = Math.max(quantityToNumber(section.I || els.sectionI.value, "m^4"), 1e-18);
  const c = Math.sqrt(area) / 2;
  return Number(row.n || 0) / area + (Number(row.m || 0) * c) / inertia;
}

function projectElasticModulus(project) {
  const material = (project.materials && project.materials[0]) || {};
  return Math.max(quantityToNumber(material.E || els.materialE.value, "Pa"), 1);
}

function simpleSystemJudgement(project) {
  const restraints = project.nodes.reduce((sum, node) => sum + (node.restraints || []).length, 0);
  if (project.nodes.length === 0 || project.elements.length === 0) return "未形成结构";
  if (restraints < 3) return "常变或瞬变风险：约束自由度少于 3";
  if (restraints === 3) return "外部静定近似，不变体系需结合几何继续判断";
  return `外部超静定近似，冗余约束约 ${restraints - 3}`;
}

async function downloadReport() {
  let project;
  try {
    project = buildProject();
  } catch (error) {
    showToast(String(error.message || error));
    return;
  }
  els.reportButton.disabled = true;
  try {
    draw();
    const reportProject = {
      ...project,
      metadata: {
        ...project.metadata,
        report_options: state.solveOptions.join(","),
        report_scope: state.lastScope || "whole",
      },
      report_options: state.solveOptions,
      report_images: {
        model: canvasDataUrl(canvas),
        diagrams: canvasDataUrl(diagramCanvas),
      },
    };
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportProject),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "导出失败。");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mechanics-report.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("计算书已导出。");
  } catch (error) {
    showToast(String(error.message || error));
  } finally {
    els.reportButton.disabled = false;
  }
}

function canvasDataUrl(target) {
  try {
    return target.toDataURL("image/jpeg", 0.92);
  } catch (error) {
    return "";
  }
}

function syncUi() {
  els.nodeCount.textContent = String(state.nodes.filter((node) => !node.fused).length);
  els.elementCount.textContent = String(state.elements.length);
  els.loadCount.textContent = String(state.loads.length + state.elementLoads.length);
  els.undoButton.disabled = state.undoStack.length === 0;
  els.redoButton.disabled = state.redoStack.length === 0;
  els.deleteButton.disabled = !state.selected && !state.selection.nodes.length && !state.selection.elements.length;
  syncSelectionInfo();
}

function syncSelectionInfo() {
  const selectedCount = state.selection.nodes.length + state.selection.elements.length;
  if (!state.selected && selectedCount === 0) {
    els.selectionInfo.textContent = "未选择";
    els.setElementLengthButton.disabled = true;
    els.momentReleaseI.checked = false;
    els.momentReleaseJ.checked = false;
    els.momentReleaseI.disabled = true;
    els.momentReleaseJ.disabled = true;
    return;
  }
  els.setElementLengthButton.disabled = !(state.selected && state.selected.type === "element");
  if (selectedCount > 1) {
    els.selectionInfo.textContent = `已选择：${state.selection.nodes.length} 个节点，${state.selection.elements.length} 根杆件`;
    els.momentReleaseI.disabled = true;
    els.momentReleaseJ.disabled = true;
    return;
  }
  if (state.selected && state.selected.type === "node") {
    const node = getNode(state.selected.id);
    const load = state.loads.find((item) => item.node === node.id);
    const restraints = restraintsToList(node.restraints).join(", ") || "自由";
    els.selectionInfo.textContent = `${node.id}: x=${node.x.toFixed(3)} m, y=${node.y.toFixed(3)} m, 约束=${restraints}${
      load ? `, 荷载=(${load.fx}, ${load.fy}, ${load.mz})` : ""
    }`;
    els.momentReleaseI.checked = false;
    els.momentReleaseJ.checked = false;
    els.momentReleaseI.disabled = true;
    els.momentReleaseJ.disabled = true;
    return;
  }
  if (state.selected && state.selected.type === "element") {
    const element = getElement(state.selected.id);
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    const length = Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y);
    const load = state.elementLoads.find((item) => item.element === element.id);
    els.elementType.value = element.type || "frame";
    const canReleaseMoment = solverElementType(element) === "frame";
    els.momentReleaseI.checked = Boolean(element.moment_release_i);
    els.momentReleaseJ.checked = Boolean(element.moment_release_j);
    els.momentReleaseI.disabled = !canReleaseMoment;
    els.momentReleaseJ.disabled = !canReleaseMoment;
    els.elementLength.value = `${Number(length.toFixed(4))} m`;
    const geometry = elementGeometryOf(element);
    els.selectionInfo.textContent = `${element.id}: ${element.node_i} -> ${element.node_j}, 长度=${length.toFixed(3)} m, 力学类型=${
      element.type || "frame"
    }, 几何=${geometryLabel(geometry)}${geometry === "arc" ? `, 曲率=${element.curvature || 0}` : ""}${
      geometry === "tee" ? `, T形高度=${element.teeDepth || "0.35 m"}` : ""
    }${
      load ? `, 分布荷载=${load.kind}` : ""
    }`;
  }
}

function geometryLabel(geometry) {
  const labels = {
    right_angle: "直角杆件",
    straight: "直杆",
    arc: "弧形杆件",
    tee: "T形杆件",
    freeform: "任意形状杆件",
  };
  return labels[geometry] || geometry;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function cssColor(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawElements();
  drawElementLoads();
  if (state.result && els.deformedToggle.checked) drawDeformedShape();
  drawSupports();
  drawLoads();
  drawNodes();
  drawPreview();
  drawSelectionGesture();
  drawDiagrams();
}

function resizeDynamicsCanvas() {
  if (!dynamicsCanvas) return;
  const rect = dynamicsCanvas.getBoundingClientRect();
  const previousWidth = dynamicsCanvas.width;
  const previousHeight = dynamicsCanvas.height;
  const nextWidth = Math.max(760, Math.floor(rect.width || 760));
  const nextHeight = Math.max(460, Math.floor(rect.height || 560));
  dynamicsCanvas.width = nextWidth;
  dynamicsCanvas.height = nextHeight;
  if (!state.dynamics.viewportInitialized) {
    state.dynamics.origin = { x: nextWidth / 2, y: nextHeight / 2 };
    state.dynamics.viewportInitialized = true;
  } else {
    state.dynamics.origin.x += (nextWidth - previousWidth) / 2;
    state.dynamics.origin.y += (nextHeight - previousHeight) / 2;
  }
  drawDynamicsScene();
}

function syncDynamicsControls() {
  if (!els.dynamicsBuildKind) return;
  const isCustom = els.dynamicsBuildKind.value === "custom";
  els.dynamicsCustomMode.disabled = !isCustom;
  els.dynamicsShapeEquation.disabled = true;
  syncDynamicsSizeLabels();
  syncDynamicsFieldDialog();
  syncDynamicsCanvasCursor();
}

function dynamicsObjectById(id) {
  return state.dynamics.objects.find((object) => object.id === id) || null;
}

function selectedDynamicsObject() {
  return dynamicsObjectById(state.dynamics.selectedObjectId);
}

function dynamicsObjectColor(index) {
  return ["#1688c5", "#e06c3b", "#6f9f39", "#8b5fc7", "#c08b18", "#d04f7b"][index % 6];
}

function syncDynamicsSizeLabels() {
  const kind = els.dynamicsBuildKind.value;
  const labels = {
    particle: ["显示尺寸", "质点半径", "厚度"],
    rod: ["杆长", "杆宽", "厚度"],
    circle: ["圆盘直径", "圆盘半径", "厚度"],
    ring: ["外径", "圆环半径", "厚度"],
    rectangle: ["矩形长度", "矩形宽度", "厚度"],
    custom: ["包络长度", "包络宽度", "厚度"],
  }[kind] || ["尺寸 A", "尺寸 B", "厚度"];
  els.dynamicsSizeALabel.textContent = labels[0];
  els.dynamicsSizeBLabel.textContent = labels[1];
  els.dynamicsSizeCLabel.textContent = labels[2];
}

function dynamicsObjectFromControls(kind, world, path = null) {
  const id = `D${state.dynamics.objectSeq++}`;
  return {
    id,
    name: `${dynamicsKindLabel(kind)} ${id}`,
    dynamicsModel: "particle2d",
    kind,
    x: world.x,
    y: world.y,
    vx0: dynamicsValue(els.dynamicsVx0, "m/s"),
    vy0: dynamicsValue(els.dynamicsVy0, "m/s"),
    mass: Math.max(dynamicsValue(els.dynamicsMass, "kg"), 1e-9),
    density: Math.max(dynamicsValue(els.dynamicsDensity, "kg/m^3"), 0),
    charge: dynamicsValue(els.dynamicsCharge, "C"),
    sizeA: Math.max(Math.abs(dynamicsValue(els.dynamicsSizeA, "m")), 1e-6),
    sizeB: Math.max(Math.abs(dynamicsValue(els.dynamicsSizeB, "m")), 1e-6),
    sizeC: Math.max(Math.abs(dynamicsValue(els.dynamicsSizeC, "m")), 1e-6),
    materialE: Math.max(dynamicsValue(els.dynamicsMaterialE, "Pa"), 0),
    rigid: els.dynamicsRigidToggle.checked,
    equation: els.dynamicsShapeEquation.value.trim(),
    path,
  };
}

function syncDynamicsObjectControls(object) {
  if (!object) {
    els.dynamicsObjectPanelTitle.textContent = "对象参数";
    return;
  }
  els.dynamicsObjectPanelTitle.textContent = `对象参数 · ${object.name}`;
  els.dynamicsBuildKind.value = object.kind;
  els.dynamicsMass.value = `${formatNumber(object.mass)} kg`;
  els.dynamicsDensity.value = `${formatNumber(object.density)} kg/m^3`;
  els.dynamicsCharge.value = `${formatNumber(object.charge)} C`;
  els.dynamicsSizeA.value = `${formatNumber(object.sizeA)} m`;
  els.dynamicsSizeB.value = `${formatNumber(object.sizeB)} m`;
  els.dynamicsSizeC.value = `${formatNumber(object.sizeC)} m`;
  els.dynamicsMaterialE.value = `${formatNumber(object.materialE)} Pa`;
  els.dynamicsShapeEquation.value = object.equation || els.dynamicsShapeEquation.value;
  els.dynamicsRigidToggle.checked = Boolean(object.rigid);
  els.dynamicsX0.value = `${formatNumber(object.x)} m`;
  els.dynamicsY0.value = `${formatNumber(object.y)} m`;
  els.dynamicsVx0.value = `${formatNumber(object.vx0)} m/s`;
  els.dynamicsVy0.value = `${formatNumber(object.vy0)} m/s`;
  state.dynamics.object = object;
  syncDynamicsControls();
}

function updateSelectedDynamicsObjectFromControls() {
  const object = selectedDynamicsObject();
  if (!object) return;
  recordDynamicsHistory();
  object.mass = Math.max(dynamicsValue(els.dynamicsMass, "kg"), 1e-9);
  object.density = Math.max(dynamicsValue(els.dynamicsDensity, "kg/m^3"), 0);
  object.charge = dynamicsValue(els.dynamicsCharge, "C");
  object.sizeA = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeA, "m")), 1e-6);
  object.sizeB = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeB, "m")), 1e-6);
  object.sizeC = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeC, "m")), 1e-6);
  object.materialE = Math.max(dynamicsValue(els.dynamicsMaterialE, "Pa"), 0);
  object.rigid = els.dynamicsRigidToggle.checked;
  object.equation = els.dynamicsShapeEquation.value.trim();
  object.x = dynamicsValue(els.dynamicsX0, "m");
  object.y = dynamicsValue(els.dynamicsY0, "m");
  object.vx0 = dynamicsValue(els.dynamicsVx0, "m/s");
  object.vy0 = dynamicsValue(els.dynamicsVy0, "m/s");
  state.dynamics.object = object;
  state.dynamics.result = null;
  cancelDynamicsAnimation();
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function selectDynamicsObject(id) {
  const object = dynamicsObjectById(id);
  if (!object) return;
  state.dynamics.selectedObjectId = id;
  state.dynamics.object = object;
  syncDynamicsObjectControls(object);
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsObject(id) {
  if (!dynamicsObjectById(id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.objects = state.dynamics.objects.filter((object) => object.id !== id);
  state.dynamics.forces = state.dynamics.forces.filter((force) => force.targetId !== id);
  if (state.dynamics.selectedObjectId === id) {
    state.dynamics.selectedObjectId = state.dynamics.objects[0]?.id || null;
    state.dynamics.object = state.dynamics.objects[0] || null;
    syncDynamicsObjectControls(state.dynamics.object);
  }
  state.dynamics.result = null;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsField(id) {
  if (!state.dynamics.fields.some((field) => field.id === id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.fields = state.dynamics.fields.filter((field) => field.id !== id);
  state.dynamics.field = state.dynamics.fields[state.dynamics.fields.length - 1] || null;
  state.dynamics.result = null;
  renderDynamicsResult();
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsForce(id) {
  if (!state.dynamics.forces.some((force) => force.id === id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.forces = state.dynamics.forces.filter((force) => force.id !== id);
  state.dynamics.result = null;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function createDynamicsSceneRow({ id, text, color, selected = false, kind }) {
  const row = document.createElement("div");
  row.className = `dynamics-scene-row${selected ? " selected" : ""}`;
  row.dataset.kind = String(kind);
  row.dataset.id = String(id);

  const swatch = document.createElement("span");
  swatch.className = "dynamics-scene-swatch";
  swatch.style.backgroundColor = color;

  const label = document.createElement("span");
  label.className = "dynamics-scene-row-main";
  label.textContent = text;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.dataset.delete = String(kind);
  deleteButton.setAttribute("aria-label", "删除");
  deleteButton.textContent = "×";
  row.append(swatch, label, deleteButton);
  return row;
}

function replaceDynamicsSceneList(container, rows, emptyText) {
  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "dynamics-scene-empty";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => fragment.appendChild(row));
  container.appendChild(fragment);
}

function renderDynamicsSceneLists() {
  if (!els.dynamicsObjectList) return;
  els.dynamicsObjectCount.textContent = String(state.dynamics.objects.length);
  els.dynamicsFieldCount.textContent = String(state.dynamics.fields.length);
  els.dynamicsForceCount.textContent = String(state.dynamics.forces.length);
  replaceDynamicsSceneList(
    els.dynamicsObjectList,
    state.dynamics.objects.map((object, index) =>
      createDynamicsSceneRow({
        id: object.id,
        text: `${object.name} · m=${formatNumber(object.mass)} kg`,
        color: dynamicsObjectColor(index),
        selected: object.id === state.dynamics.selectedObjectId,
        kind: "object",
      })
    ),
    "暂无对象"
  );
  replaceDynamicsSceneList(
    els.dynamicsFieldList,
    state.dynamics.fields.map((field) =>
      createDynamicsSceneRow({
        id: field.id,
        text: `${dynamicsFieldKindLabel(field.kind)} · ${dynamicsRangeLabel(field.rangeType)}`,
        color: dynamicsFieldColor(field.kind),
        kind: "field",
      })
    ),
    "暂无场"
  );
  replaceDynamicsSceneList(
    els.dynamicsForceList,
    state.dynamics.forces.map((force) => {
      const target = dynamicsObjectById(force.targetId);
      const type = force.type === "impulse" ? "瞬时" : "持续";
      const unit = force.type === "impulse" ? "N·s" : "N";
      return createDynamicsSceneRow({
        id: force.id,
        text: `${type} · ${target?.name || force.targetId} · ${formatNumber(force.magnitude)} ${unit}`,
        color: force.type === "impulse" ? "#8b5fc7" : "#e06c3b",
        kind: "force",
      });
    }),
    "暂无外力"
  );
  syncDynamicsActionUi();
}

function selectedDynamicsOptions() {
  return new Set(els.dynamicsOptionInputs.filter((input) => input.checked).map((input) => input.value));
}

function buildDynamicsProject() {
  return {
    schema: "mechanics-dynamics-project@1",
    module: "dynamics",
    model: "independent-particle2d",
    simulation: {
      duration: els.dynamicsDuration.value,
      timeStep: els.dynamicsTimeStep.value,
    },
    objects: JSON.parse(JSON.stringify(state.dynamics.objects)),
    fields: JSON.parse(JSON.stringify(state.dynamics.fields)),
    forces: JSON.parse(JSON.stringify(state.dynamics.forces)),
  };
}

function saveDynamicsProject() {
  const blob = new Blob([JSON.stringify(buildDynamicsProject(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "mechanics-dynamics-project.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importDynamicsProject(project) {
  if (!project || project.module !== "dynamics" || !Array.isArray(project.objects)) {
    throw new Error("这不是有效的动力学工程文件。");
  }
  cancelDynamicsAnimation();
  state.dynamics.objects = project.objects.map((raw, index) => {
    const object = DynamicsCore.normalizeObject(raw);
    return {
      ...object,
      id: String(raw.id || `D${index + 1}`),
      name: String(raw.name || `${dynamicsKindLabel(object.kind)} D${index + 1}`),
      dynamicsModel: "particle2d",
      rigid: false,
      path: Array.isArray(object.path) ? object.path.map((point) => ({ x: Number(point.x), y: Number(point.y) })) : null,
    };
  });
  const objectIds = new Set(state.dynamics.objects.map((object) => object.id));
  state.dynamics.fields = Array.isArray(project.fields) ? JSON.parse(JSON.stringify(project.fields)) : [];
  state.dynamics.forces = Array.isArray(project.forces)
    ? JSON.parse(JSON.stringify(project.forces)).filter((force) => objectIds.has(force.targetId))
    : [];
  state.dynamics.objectSeq = nextSequence(state.dynamics.objects, "D");
  state.dynamics.fieldSeq = nextSequence(state.dynamics.fields, "F");
  state.dynamics.forceSeq = nextSequence(state.dynamics.forces, "A");
  state.dynamics.selectedObjectId = state.dynamics.objects[0]?.id || null;
  state.dynamics.object = state.dynamics.objects[0] || null;
  state.dynamics.field = state.dynamics.fields[state.dynamics.fields.length - 1] || null;
  state.dynamics.result = null;
  state.dynamics.undoStack = [];
  state.dynamics.redoStack = [];
  els.dynamicsDuration.value = project.simulation?.duration || "3 s";
  els.dynamicsTimeStep.value = project.simulation?.timeStep || "0.02 s";
  syncDynamicsObjectControls(state.dynamics.object);
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  renderDynamicsResult();
  drawDynamicsScene();
}

function deleteSelectedDynamicsObject() {
  if (!state.dynamics.selectedObjectId) return;
  deleteDynamicsObject(state.dynamics.selectedObjectId);
}

function syncDynamicsActionUi() {
  if (!els.dynamicsUndoButton) return;
  els.dynamicsUndoButton.disabled = state.dynamics.undoStack.length === 0;
  els.dynamicsRedoButton.disabled = state.dynamics.redoStack.length === 0;
  els.dynamicsDeleteButton.disabled = !state.dynamics.selectedObjectId;
  els.dynamicsReportButton.disabled = !state.dynamics.result;
}

function openDynamicsSolveDialog() {
  if (!state.dynamics.objects.length) {
    showDynamicsToast("请先放置至少一个对象。", 2600);
    return;
  }
  if (!els.dynamicsSolveDialog.open) els.dynamicsSolveDialog.showModal();
}

async function downloadDynamicsReport() {
  if (!state.dynamics.result) {
    showDynamicsToast("请先完成动力学求解。", 2600);
    return;
  }
  els.dynamicsReportButton.disabled = true;
  const derivation = [
    "",
    "计算方法",
    "1. 所有输入先换算为 SI 单位，位置为 m、时间为 s、质量为 kg、力为 N。",
    "2. 瞬时力按冲量 J 处理，初速度增量为 Δv=J/m；持续力在设定时间段内进入合力。",
    "3. 重力场、电场和磁场按各自空间范围叠加，洛伦兹力采用 F=q(E+v×B)。",
    "4. 平动方程 m·a=ΣF 采用四阶 Runge-Kutta 方法逐步积分，得到位置、速度和加速度。",
    "5. 当前各对象独立求解，不包含碰撞、接触、约束及对象间相互作用。",
  ].join("\n");
  try {
    const response = await fetch("/api/dynamics-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_text: `${els.dynamicsResultText.textContent}${derivation}`,
        report_images: { model: canvasDataUrl(dynamicsCanvas) },
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "导出失败。");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "动力学计算书.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
    showDynamicsToast("动力学计算书已导出。", 2200);
  } catch (error) {
    showDynamicsToast(String(error.message || error), 3600);
  } finally {
    syncDynamicsActionUi();
  }
}

function dynamicsValue(input, defaultUnit) {
  return quantityToNumber(input.value, defaultUnit);
}

function vectorFromAngle(magnitude, angleDegrees) {
  return DynamicsCore.vectorFromAngle(magnitude, angleDegrees);
}

function dynamicsFieldUnit(kind) {
  if (kind === "electric") return "N/C";
  if (kind === "magnetic") return "T";
  return "m/s^2";
}

function dynamicsFieldKindLabel(kind) {
  return {
    zero: "零场",
    gravity: "重力场",
    electric: "电场",
    magnetic: "磁场",
  }[kind] || kind;
}

function dynamicsRangeLabel(rangeType) {
  return {
    global: "全局范围",
    rectangle: "矩形范围",
    circle: "圆形范围",
    custom: "任意范围",
  }[rangeType] || rangeType;
}

function dynamicsFieldColor(kind) {
  return { gravity: "#1688c5", electric: "#e08a2e", magnetic: "#8b5fc7" }[kind] || "#1688c5";
}

function setDynamicsFieldDefaults(kind) {
  if (kind === "gravity") {
    els.dynamicsFieldMagnitude.value = "9.81 m/s^2";
    els.dynamicsFieldDirectionPreset.value = "down";
    els.dynamicsFieldAngle.value = "-90";
  } else if (kind === "electric") {
    els.dynamicsFieldMagnitude.value = "1 N/C";
    els.dynamicsFieldDirectionPreset.value = "right";
    els.dynamicsFieldAngle.value = "0";
  } else if (kind === "magnetic") {
    els.dynamicsFieldMagnitude.value = "1 T";
    els.dynamicsMagneticDirection.value = "out";
  } else {
    els.dynamicsFieldMagnitude.value = "0";
  }
}

function syncDynamicsFieldDialog() {
  if (!els.dynamicsEnvironment) return;
  const kind = els.dynamicsEnvironment.value;
  const rangeType = els.dynamicsFieldRange.value;
  const isZero = kind === "zero";
  const isMagnetic = kind === "magnetic";
  els.dynamicsFieldMagnitude.disabled = isZero;
  els.dynamicsVectorDirectionField.classList.toggle("hidden", isMagnetic || isZero);
  els.dynamicsFieldAngleField.classList.toggle("hidden", isMagnetic || isZero);
  els.dynamicsMagneticDirectionField.classList.toggle("hidden", !isMagnetic);
  els.dynamicsFieldRange.disabled = isZero;
  els.dynamicsFieldCenterX.disabled = isZero || rangeType === "global";
  els.dynamicsFieldCenterY.disabled = isZero || rangeType === "global";
  els.dynamicsRectangleRangeFields.classList.toggle("hidden", rangeType !== "rectangle" || isZero);
  els.dynamicsCircleRangeField.classList.toggle("hidden", rangeType !== "circle" || isZero);
  els.dynamicsFieldAngle.disabled = els.dynamicsFieldDirectionPreset.value !== "custom" || isZero;
  if (!isMagnetic && !isZero && els.dynamicsFieldDirectionPreset.value !== "custom") {
    const angles = { right: 0, up: 90, left: 180, down: -90 };
    els.dynamicsFieldAngle.value = String(angles[els.dynamicsFieldDirectionPreset.value] ?? -90);
  }
  if (isZero) {
    els.dynamicsFieldMessage.textContent = "零场不会在画布中绘制，也不会对对象施加外场作用。";
  } else if (rangeType === "global") {
    els.dynamicsFieldMessage.textContent = "全局均匀场作用于无限建模空间，可连续定义重力势能或电势能。";
  } else if (rangeType === "custom") {
    els.dynamicsFieldMessage.textContent = "应用后，在建模区按住鼠标左键绘制任意场范围。";
  } else {
    els.dynamicsFieldMessage.textContent = "场参数只有点击“应用到建模区”后才会生效。";
  }
}

function openDynamicsFieldDialog(fieldId = null) {
  const field = fieldId ? state.dynamics.fields.find((item) => item.id === fieldId) : null;
  state.dynamics.editingFieldId = field?.id || null;
  if (field) {
    els.dynamicsEnvironment.value = field.kind;
    els.dynamicsFieldMagnitude.value = field.magnitudeText || `${field.magnitude} ${dynamicsFieldUnit(field.kind)}`;
    els.dynamicsFieldDirectionPreset.value = field.directionPreset || "custom";
    els.dynamicsFieldAngle.value = String(field.angle ?? -90);
    els.dynamicsMagneticDirection.value = field.magneticDirection || "out";
    els.dynamicsFieldRange.value = field.rangeType || "rectangle";
    els.dynamicsFieldCenterX.value = `${field.centerX || 0} m`;
    els.dynamicsFieldCenterY.value = `${field.centerY || 0} m`;
    els.dynamicsFieldWidth.value = `${field.width || 8} m`;
    els.dynamicsFieldHeight.value = `${field.height || 6} m`;
    els.dynamicsFieldRadius.value = `${field.radius || 3} m`;
    els.dynamicsFieldApplyButton.textContent = "更新场";
  } else {
    els.dynamicsEnvironment.value = "gravity";
    setDynamicsFieldDefaults("gravity");
    els.dynamicsFieldRange.value = "rectangle";
    els.dynamicsFieldCenterX.value = "0 m";
    els.dynamicsFieldCenterY.value = "0 m";
    els.dynamicsFieldWidth.value = "8 m";
    els.dynamicsFieldHeight.value = "6 m";
    els.dynamicsFieldRadius.value = "3 m";
    els.dynamicsFieldApplyButton.textContent = "添加到建模区";
  }
  syncDynamicsFieldDialog();
  els.dynamicsFieldDialog.showModal();
}

function applyDynamicsField() {
  cancelDynamicsAnimation();
  const kind = els.dynamicsEnvironment.value;
  if (kind === "zero") {
    if (state.dynamics.editingFieldId) deleteDynamicsField(state.dynamics.editingFieldId);
    state.dynamics.field = state.dynamics.fields[state.dynamics.fields.length - 1] || null;
    state.dynamics.fieldRangeDrawing = false;
    state.dynamics.result = null;
    els.dynamicsFieldDialog.close();
    updateDynamicsFieldStatus();
    renderDynamicsSceneLists();
    syncDynamicsCanvasCursor();
    drawDynamicsScene();
    showDynamicsToast("零场不产生作用，未添加新的场。", 2200);
    return;
  }
  const magnitude = Math.abs(dynamicsValue(els.dynamicsFieldMagnitude, dynamicsFieldUnit(kind)));
  const rangeType = els.dynamicsFieldRange.value;
  const existingIndex = state.dynamics.fields.findIndex((field) => field.id === state.dynamics.editingFieldId);
  recordDynamicsHistory();
  const field = {
    id: existingIndex >= 0 ? state.dynamics.fields[existingIndex].id : `F${state.dynamics.fieldSeq++}`,
    kind,
    magnitude,
    magnitudeText: els.dynamicsFieldMagnitude.value.trim(),
    directionPreset: els.dynamicsFieldDirectionPreset.value,
    angle: Number(els.dynamicsFieldAngle.value || 0),
    magneticDirection: els.dynamicsMagneticDirection.value,
    rangeType,
    centerX: dynamicsValue(els.dynamicsFieldCenterX, "m"),
    centerY: dynamicsValue(els.dynamicsFieldCenterY, "m"),
    width: Math.max(Math.abs(dynamicsValue(els.dynamicsFieldWidth, "m")), 0.01),
    height: Math.max(Math.abs(dynamicsValue(els.dynamicsFieldHeight, "m")), 0.01),
    radius: Math.max(Math.abs(dynamicsValue(els.dynamicsFieldRadius, "m")), 0.01),
    path: rangeType === "custom" ? [] : null,
  };
  if (existingIndex >= 0) state.dynamics.fields[existingIndex] = field;
  else state.dynamics.fields.push(field);
  state.dynamics.field = field;
  state.dynamics.editingFieldId = null;
  state.dynamics.result = null;
  els.dynamicsFieldDialog.close();
  if (rangeType === "custom") {
    state.dynamics.fieldRangeDrawing = true;
    state.dynamics.fieldRangePath = [];
    showDynamicsToast("按住鼠标左键绘制任意场范围。", 3200);
  } else {
    state.dynamics.fieldRangeDrawing = false;
    showDynamicsToast(`${dynamicsFieldKindLabel(kind)}已应用到建模区。`, 2200);
  }
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  syncDynamicsCanvasCursor();
  renderDynamicsResult();
  drawDynamicsScene();
}

function updateDynamicsFieldStatus() {
  const fields = state.dynamics.fields;
  if (!fields.length) {
    els.dynamicsFieldStatus.textContent = "未应用场";
    return;
  }
  const pending = fields.some((field) => field.rangeType === "custom" && (!field.path || field.path.length < 3));
  els.dynamicsFieldStatus.textContent = pending ? `复合场 ${fields.length} · 待绘制` : `复合场 ${fields.length}`;
}

function dynamicsFieldVector(field) {
  return DynamicsCore.fieldVector(field);
}

function pointInDynamicsField(point, field) {
  return DynamicsCore.pointInField(point, field);
}

function syncDynamicsForceDialog() {
  const continuous = els.dynamicsForceType.value === "continuous";
  els.dynamicsForceMagnitudeLabel.textContent = continuous ? "力的大小" : "冲量大小";
  els.dynamicsForceStartField.classList.toggle("hidden", !continuous);
  els.dynamicsForceDurationField.classList.toggle("hidden", !continuous);
  els.dynamicsForceAngle.disabled = els.dynamicsForceDirectionPreset.value !== "custom";
  if (els.dynamicsForceDirectionPreset.value !== "custom") {
    const angles = { right: 0, up: 90, left: 180, down: -90 };
    els.dynamicsForceAngle.value = String(angles[els.dynamicsForceDirectionPreset.value] ?? 0);
  }
  els.dynamicsForceMessage.textContent = continuous
    ? "持续力在设定时间段内参与每一步积分；持续时间为 0 时作用到求解结束。"
    : "瞬时力按冲量处理，只在初始瞬间改变对象速度，之后不再持续作用。";
}

function openDynamicsForceDialog() {
  if (!state.dynamics.objects.length) {
    showDynamicsToast("请先放置至少一个对象。", 2400);
    return;
  }
  els.dynamicsForceTarget.replaceChildren();
  state.dynamics.objects.forEach((object) => {
    const option = document.createElement("option");
    option.value = String(object.id);
    option.textContent = object.name;
    els.dynamicsForceTarget.appendChild(option);
  });
  if (state.dynamics.selectedObjectId) els.dynamicsForceTarget.value = state.dynamics.selectedObjectId;
  els.dynamicsForceType.value = "impulse";
  els.dynamicsForceMagnitude.value = "1 N*s";
  els.dynamicsForceDirectionPreset.value = "right";
  els.dynamicsForceAngle.value = "0";
  els.dynamicsForceStart.value = "0 s";
  els.dynamicsForceDuration.value = "0 s";
  syncDynamicsForceDialog();
  els.dynamicsForceDialog.showModal();
}

function applyDynamicsForce() {
  const targetId = els.dynamicsForceTarget.value;
  if (!dynamicsObjectById(targetId)) return;
  const type = els.dynamicsForceType.value;
  const unit = type === "impulse" ? "N*s" : "N";
  const magnitude = Math.abs(dynamicsValue(els.dynamicsForceMagnitude, unit));
  const angle = Number(els.dynamicsForceAngle.value || 0);
  const vector = vectorFromAngle(magnitude, angle);
  recordDynamicsHistory();
  state.dynamics.forces.push({
    id: `A${state.dynamics.forceSeq++}`,
    targetId,
    type,
    magnitude,
    angle,
    x: vector.x,
    y: vector.y,
    start: type === "continuous" ? Math.max(0, dynamicsValue(els.dynamicsForceStart, "s")) : 0,
    duration: type === "continuous" ? Math.max(0, dynamicsValue(els.dynamicsForceDuration, "s")) : 0,
  });
  state.dynamics.result = null;
  els.dynamicsForceDialog.close();
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
  showDynamicsToast(type === "impulse" ? "瞬时冲量已添加。" : "持续力已添加。", 2000);
}

function solveDynamics() {
  if (!els.dynamicsMass) return;
  if (!state.dynamics.objects.length) {
    showDynamicsToast("请先点击“放置对象”，并在建模区确定对象位置。", 3200);
    return;
  }
  cancelDynamicsAnimation();
  const duration = dynamicsValue(els.dynamicsDuration, "s");
  const timeStep = dynamicsValue(els.dynamicsTimeStep, "s");
  try {
    state.dynamics.result = DynamicsCore.simulateScene({
      objects: state.dynamics.objects,
      fields: state.dynamics.fields,
      forces: state.dynamics.forces,
      duration,
      timeStep,
    });
  } catch (error) {
    state.dynamics.result = null;
    renderDynamicsResult();
    showDynamicsToast(String(error.message || error), 4500);
    return;
  }
  renderDynamicsResult();
  drawDynamicsScene();
  if (selectedDynamicsOptions().has("trajectory")) startDynamicsAnimation();
  showDynamicsToast(`已完成 ${state.dynamics.result.objectResults.length} 个对象的动力学求解。`);
}

function dynamicsTrajectoryEquation(model) {
  if (!model || model.kind !== "constant-acceleration") {
    return {
      x: "x(t)：由四阶 Runge-Kutta 数值积分得到",
      y: "y(t)：分区场、磁场或分段外力使加速度变化，无单一二次解析式",
    };
  }
  return {
    x: `x(t) = ${formatNumber(model.x0)} + ${formatNumber(model.vx0)} t + ${formatNumber(0.5 * model.ax)} t^2`,
    y: `y(t) = ${formatNumber(model.y0)} + ${formatNumber(model.vy0)} t + ${formatNumber(0.5 * model.ay)} t^2`,
  };
}

function renderDynamicsResult() {
  const result = state.dynamics.result;
  if (!result) {
    els.dynamicsResultText.textContent = "暂无结果";
    syncDynamicsActionUi();
    return;
  }
  const options = selectedDynamicsOptions();
  const lines = [
    "求解模块：二维多对象独立质点动力学",
    `场景：${result.objectResults.length} 个对象，${state.dynamics.fields.length} 个场，${state.dynamics.forces.length} 个外加作用力`,
    `用户请求步长：${formatNumber(result.requestedTimeStep)} s`,
    `实际采用步长：${formatNumber(result.timeStep)} s`,
    `单对象积分步数：${result.stepCount}，总样本数：${result.totalSampleCount}`,
  ];
  if (options.has("kinetic")) lines.push(`系统总动能：${formatNumber(result.totals.kineticEnergy)} J`);
  if (options.has("potential")) lines.push(`系统总势能：${formatNumber(result.totals.potentialEnergy)} J（坐标原点为零势能参考）`);
  if (options.has("total_energy")) lines.push(`系统机械能：${formatNumber(result.totals.mechanicalEnergy)} J`);
  if (options.has("momentum")) {
    lines.push(`系统总动量：px=${formatNumber(result.totals.momentumX)} kg·m/s, py=${formatNumber(result.totals.momentumY)} kg·m/s`);
  }
  if (options.has("angular_momentum")) {
    lines.push(`系统关于全局原点的轨道角动量：Lz=${formatNumber(result.totals.orbitalAngularMomentum)} kg·m^2/s`);
  }
  for (const diagnostic of result.diagnostics || []) {
    lines.push(`[${diagnostic.level === "warning" ? "警告" : "提示"}] ${diagnostic.message}`);
  }
  for (const item of result.objectResults) {
    lines.push("", `${item.name}：`);
    if (options.has("kinetic")) lines.push(`  动能：${formatNumber(item.kineticEnergy)} J`);
    if (options.has("potential")) lines.push(`  势能：${formatNumber(item.potentialEnergy)} J`);
    if (options.has("total_energy")) lines.push(`  机械能：${formatNumber(item.mechanicalEnergy)} J`);
    if (options.has("momentum")) lines.push(`  动量：(${formatNumber(item.momentum.x)}, ${formatNumber(item.momentum.y)}) kg·m/s`);
    if (options.has("angular_momentum")) {
      lines.push(`  关于全局原点的轨道角动量 Lz：${formatNumber(item.orbitalAngularMomentum)} kg·m^2/s`);
    }
    if (options.has("lorentz_force")) {
      lines.push(`  洛伦兹力：Fx=${formatNumber(item.lorentzForce.x)} N, Fy=${formatNumber(item.lorentzForce.y)} N`);
    }
    if (options.has("velocity")) lines.push(`  速度：vx=${formatNumber(item.final.vx)} m/s, vy=${formatNumber(item.final.vy)} m/s`);
    if (options.has("acceleration")) lines.push(`  加速度：ax=${formatNumber(item.ax)} m/s^2, ay=${formatNumber(item.ay)} m/s^2`);
    if (options.has("inertia")) {
      lines.push(`  几何质心转动惯量估算：I=${formatNumber(item.inertia)} kg·m^2（不参与当前平动积分）`);
    }
    if (options.has("displacement")) {
      lines.push(`  位移：Δx=${formatNumber(item.final.x - item.x0)} m, Δy=${formatNumber(item.final.y - item.y0)} m`);
    }
    if (options.has("trajectory_equation")) {
      const equation = dynamicsTrajectoryEquation(item.trajectoryModel);
      lines.push(`  ${equation.x}`);
      lines.push(`  ${equation.y}`);
    }
  }
  if (options.has("trajectory")) lines.push("", "位移轨迹：已在建模区生成多对象动态演示。");
  els.dynamicsResultText.textContent = lines.join("\n");
  syncDynamicsActionUi();
}

function dynamicsKindLabel(kind) {
  return {
    particle: "质点",
    rod: "杆",
    circle: "圆",
    ring: "圆环",
    rectangle: "矩形",
    custom: "任意形状",
  }[kind] || kind;
}

function drawDynamicsScene(sampleMap = null) {
  if (!dynamicsCtx || !dynamicsCanvas) return;
  dynamicsCtx.clearRect(0, 0, dynamicsCanvas.width, dynamicsCanvas.height);
  drawDynamicsGrid();
  drawDynamicsField();
  const result = state.dynamics.result;
  if (result && selectedDynamicsOptions().has("trajectory")) {
    for (const item of result.objectResults) {
      const sample = sampleMap?.[item.objectId] || null;
      drawDynamicsTrajectory(item.samples, sample ? sample.t : Infinity, item.objectId);
      drawDynamicsObject(sample || item.samples[0], item);
    }
  } else {
    for (const object of state.dynamics.objects) drawDynamicsObject(object, null);
  }
  drawDynamicsAppliedForces();
  drawDynamicsRangeDraft();
}

function dynamicsToScreen(point) {
  return {
    x: state.dynamics.origin.x + point.x * state.dynamics.scale,
    y: state.dynamics.origin.y - point.y * state.dynamics.scale,
  };
}

function dynamicsToWorld(point) {
  return {
    x: (point.x - state.dynamics.origin.x) / state.dynamics.scale,
    y: (state.dynamics.origin.y - point.y) / state.dynamics.scale,
  };
}

function dynamicsGridStep() {
  const desiredWorld = 62 / state.dynamics.scale;
  const power = 10 ** Math.floor(Math.log10(desiredWorld));
  const normalized = desiredWorld / power;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * power;
}

function drawDynamicsGrid() {
  dynamicsCtx.save();
  dynamicsCtx.fillStyle = cssColor("--canvas");
  dynamicsCtx.fillRect(0, 0, dynamicsCanvas.width, dynamicsCanvas.height);
  dynamicsCtx.strokeStyle = cssColor("--grid");
  dynamicsCtx.lineWidth = 1;
  const worldStep = dynamicsGridStep();
  const step = worldStep * state.dynamics.scale;
  for (let x = ((state.dynamics.origin.x % step) + step) % step; x < dynamicsCanvas.width; x += step) {
    lineDynamics({ x, y: 0 }, { x, y: dynamicsCanvas.height });
  }
  for (let y = ((state.dynamics.origin.y % step) + step) % step; y < dynamicsCanvas.height; y += step) {
    lineDynamics({ x: 0, y }, { x: dynamicsCanvas.width, y });
  }
  dynamicsCtx.strokeStyle = cssColor("--grid-major");
  dynamicsCtx.lineWidth = 1.4;
  if (state.dynamics.origin.y >= 0 && state.dynamics.origin.y <= dynamicsCanvas.height) {
    lineDynamics({ x: 0, y: state.dynamics.origin.y }, { x: dynamicsCanvas.width, y: state.dynamics.origin.y });
  }
  if (state.dynamics.origin.x >= 0 && state.dynamics.origin.x <= dynamicsCanvas.width) {
    lineDynamics({ x: state.dynamics.origin.x, y: 0 }, { x: state.dynamics.origin.x, y: dynamicsCanvas.height });
  }
  dynamicsCtx.fillStyle = cssColor("--muted");
  dynamicsCtx.font = "12px Segoe UI, Arial, sans-serif";
  dynamicsCtx.fillText(`网格 ${formatNumber(worldStep)} m`, 14, 22);
  if (state.dynamics.origin.y >= 18 && state.dynamics.origin.y <= dynamicsCanvas.height) {
    dynamicsCtx.fillText("x (m)", dynamicsCanvas.width - 54, state.dynamics.origin.y - 8);
  }
  if (state.dynamics.origin.x >= 0 && state.dynamics.origin.x <= dynamicsCanvas.width - 42) {
    dynamicsCtx.fillText("y (m)", state.dynamics.origin.x + 8, 18);
  }
  dynamicsCtx.restore();
}

function drawDynamicsField() {
  for (const field of state.dynamics.fields) drawSingleDynamicsField(field);
}

function drawSingleDynamicsField(field) {
  if (field.kind === "zero" || (field.rangeType === "custom" && (!field.path || field.path.length < 3))) return;
  const color = dynamicsFieldColor(field.kind);
  dynamicsCtx.save();
  traceDynamicsFieldRange(field);
  dynamicsCtx.fillStyle = `${color}${document.body.classList.contains("dark-theme") ? "20" : "14"}`;
  dynamicsCtx.fill();
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.lineWidth = 1.5;
  dynamicsCtx.setLineDash([7, 5]);
  dynamicsCtx.stroke();
  dynamicsCtx.setLineDash([]);
  traceDynamicsFieldRange(field);
  dynamicsCtx.clip();
  const spacing = 54;
  for (let x = 26; x < dynamicsCanvas.width; x += spacing) {
    for (let y = 30; y < dynamicsCanvas.height; y += spacing) {
      const world = dynamicsToWorld({ x, y });
      if (!pointInDynamicsField(world, field)) continue;
      if (field.kind === "magnetic") drawDynamicsMagneticSymbol({ x, y }, field.magneticDirection, color);
      else drawDynamicsVectorSymbol({ x, y }, dynamicsFieldVector(field), color);
    }
  }
  dynamicsCtx.restore();
}

function traceDynamicsFieldRange(field) {
  dynamicsCtx.beginPath();
  if (field.rangeType === "global") {
    dynamicsCtx.rect(0, 0, dynamicsCanvas.width, dynamicsCanvas.height);
    return;
  }
  if (field.rangeType === "circle") {
    const center = dynamicsToScreen({ x: field.centerX, y: field.centerY });
    dynamicsCtx.arc(center.x, center.y, field.radius * state.dynamics.scale, 0, Math.PI * 2);
    return;
  }
  if (field.rangeType === "custom") {
    field.path.forEach((point, index) => {
      const screen = dynamicsToScreen(point);
      if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
      else dynamicsCtx.lineTo(screen.x, screen.y);
    });
    dynamicsCtx.closePath();
    return;
  }
  const topLeft = dynamicsToScreen({ x: field.centerX - field.width / 2, y: field.centerY + field.height / 2 });
  dynamicsCtx.rect(topLeft.x, topLeft.y, field.width * state.dynamics.scale, field.height * state.dynamics.scale);
}

function drawDynamicsVectorSymbol(center, vector, color = cssColor("--blue")) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1e-12) return;
  const unit = { x: vector.x / length, y: -vector.y / length };
  const start = { x: center.x - unit.x * 10, y: center.y - unit.y * 10 };
  const end = { x: center.x + unit.x * 10, y: center.y + unit.y * 10 };
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.fillStyle = color;
  dynamicsCtx.lineWidth = 1.6;
  drawDynamicsArrow(start, end, 6);
}

function drawDynamicsMagneticSymbol(center, direction, color = cssColor("--blue")) {
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.fillStyle = color;
  dynamicsCtx.lineWidth = 1.5;
  dynamicsCtx.beginPath();
  dynamicsCtx.arc(center.x, center.y, 7, 0, Math.PI * 2);
  dynamicsCtx.stroke();
  if (direction === "out") {
    dynamicsCtx.beginPath();
    dynamicsCtx.arc(center.x, center.y, 2.2, 0, Math.PI * 2);
    dynamicsCtx.fill();
  } else {
    lineDynamics({ x: center.x - 4, y: center.y - 4 }, { x: center.x + 4, y: center.y + 4 });
    lineDynamics({ x: center.x + 4, y: center.y - 4 }, { x: center.x - 4, y: center.y + 4 });
  }
}

function drawDynamicsTrajectory(samples, endTime = Infinity, objectId = null) {
  if (!samples.length) return;
  const visibleSamples = samples.filter((point) => point.t <= endTime + 1e-9);
  if (!visibleSamples.length) return;
  dynamicsCtx.save();
  const objectIndex = Math.max(0, state.dynamics.objects.findIndex((object) => object.id === objectId));
  dynamicsCtx.strokeStyle = dynamicsObjectColor(objectIndex);
  dynamicsCtx.lineWidth = 2.2;
  dynamicsCtx.beginPath();
  visibleSamples.forEach((point, index) => {
    const screen = dynamicsToScreen(point);
    if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
    else dynamicsCtx.lineTo(screen.x, screen.y);
  });
  dynamicsCtx.stroke();
  dynamicsCtx.setLineDash([5, 5]);
  dynamicsCtx.strokeStyle = cssColor("--muted");
  for (let index = 0; index < visibleSamples.length; index += Math.max(1, Math.floor(samples.length / 18))) {
    const screen = dynamicsToScreen(visibleSamples[index]);
    lineDynamics({ x: screen.x, y: screen.y }, { x: screen.x, y: state.dynamics.origin.y });
  }
  dynamicsCtx.restore();
}

function drawDynamicsObject(point, result) {
  const model = result ? dynamicsObjectById(result.objectId) : dynamicsObjectById(point.id) || point;
  const kind = result?.buildKind || model?.kind || els.dynamicsBuildKind.value;
  const screen = dynamicsToScreen(point);
  const sizeA = Math.max(16, Math.min(120, (result?.sizeA || model?.sizeA || 1) * state.dynamics.scale));
  const rawSizeB = (result?.sizeB || model?.sizeB || 0.2) * state.dynamics.scale;
  const sizeB = Math.max(kind === "particle" ? 4 : 10, Math.min(kind === "particle" ? 40 : 90, rawSizeB));
  const objectIndex = Math.max(0, state.dynamics.objects.findIndex((object) => object.id === model?.id));
  const color = dynamicsObjectColor(objectIndex);
  dynamicsCtx.save();
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.fillStyle = `${color}${document.body.classList.contains("dark-theme") ? "3d" : "26"}`;
  dynamicsCtx.lineWidth = model?.id === state.dynamics.selectedObjectId ? 3 : 2;
  if (kind === "custom" && model?.path?.length > 1) {
    const dx = point.x - model.x;
    const dy = point.y - model.y;
    dynamicsCtx.beginPath();
    model.path.forEach((pathPoint, index) => {
      const pathScreen = dynamicsToScreen({ x: pathPoint.x + dx, y: pathPoint.y + dy });
      if (index === 0) dynamicsCtx.moveTo(pathScreen.x, pathScreen.y);
      else dynamicsCtx.lineTo(pathScreen.x, pathScreen.y);
    });
    dynamicsCtx.closePath();
    dynamicsCtx.fill();
    dynamicsCtx.stroke();
  } else if (kind === "rod") {
    lineDynamics({ x: screen.x - sizeA / 2, y: screen.y }, { x: screen.x + sizeA / 2, y: screen.y });
  } else if (kind === "rectangle") {
    dynamicsCtx.strokeRect(screen.x - sizeA / 2, screen.y - sizeB / 2, sizeA, sizeB);
    dynamicsCtx.fillRect(screen.x - sizeA / 2, screen.y - sizeB / 2, sizeA, sizeB);
  } else {
    dynamicsCtx.beginPath();
    dynamicsCtx.arc(screen.x, screen.y, sizeB, 0, Math.PI * 2);
    if (kind !== "ring") dynamicsCtx.fill();
    dynamicsCtx.stroke();
    if (kind === "ring") {
      dynamicsCtx.beginPath();
      dynamicsCtx.arc(screen.x, screen.y, Math.max(4, sizeB * 0.62), 0, Math.PI * 2);
      dynamicsCtx.stroke();
    }
  }
  dynamicsCtx.fillStyle = cssColor("--ink");
  dynamicsCtx.font = "12px Segoe UI, Arial, sans-serif";
  const label = result ? `${model?.name || result.name} · t=${formatNumber(point.t || 0)} s` : model?.name || dynamicsKindLabel(kind);
  dynamicsCtx.fillText(label, screen.x + 12, screen.y - 12);
  dynamicsCtx.restore();
}

function drawDynamicsAppliedForces() {
  for (const force of state.dynamics.forces) {
    const object = dynamicsObjectById(force.targetId);
    if (!object) continue;
    const point = dynamicsToScreen(object);
    const magnitude = Math.hypot(force.x, force.y);
    if (magnitude < 1e-12) continue;
    const unit = { x: force.x / magnitude, y: -force.y / magnitude };
    const length = force.type === "impulse" ? 34 : 46;
    const start = { x: point.x - unit.x * length, y: point.y - unit.y * length };
    dynamicsCtx.save();
    dynamicsCtx.strokeStyle = force.type === "impulse" ? "#8b5fc7" : "#e06c3b";
    dynamicsCtx.fillStyle = dynamicsCtx.strokeStyle;
    dynamicsCtx.lineWidth = 2;
    drawDynamicsArrow(start, point, 8);
    dynamicsCtx.font = "11px Segoe UI, Arial, sans-serif";
    dynamicsCtx.fillText(force.type === "impulse" ? "J" : "F", start.x + 4, start.y - 4);
    dynamicsCtx.restore();
  }
}

function drawDynamicsRangeDraft() {
  const path = state.dynamics.fieldRangeDraft?.path || state.dynamics.paintPath;
  if (!path || path.length < 2) return;
  dynamicsCtx.save();
  dynamicsCtx.strokeStyle = cssColor("--select");
  dynamicsCtx.setLineDash([6, 4]);
  dynamicsCtx.lineWidth = 2;
  dynamicsCtx.beginPath();
  path.forEach((point, index) => {
    const screen = dynamicsToScreen(point);
    if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
    else dynamicsCtx.lineTo(screen.x, screen.y);
  });
  dynamicsCtx.stroke();
  dynamicsCtx.restore();
}

function startDynamicsAnimation() {
  if (!state.dynamics.result) return;
  cancelDynamicsAnimation();
  state.dynamics.animationStart = performance.now();
  const duration = state.dynamics.result.duration;
  const animate = (now) => {
    if (!state.dynamics.result || state.activeModule !== "dynamics") return;
    const elapsed = ((now - state.dynamics.animationStart) / 1000) % Math.max(duration, 0.01);
    const sampleMap = Object.fromEntries(
      state.dynamics.result.objectResults.map((result) => [
        result.objectId,
        DynamicsCore.sampleAtTime(result.samples, elapsed, result.timeStep),
      ])
    );
    drawDynamicsScene(sampleMap);
    state.dynamics.animationId = requestAnimationFrame(animate);
  };
  state.dynamics.animationId = requestAnimationFrame(animate);
}

function cancelDynamicsAnimation() {
  if (state.dynamics.animationId) cancelAnimationFrame(state.dynamics.animationId);
  state.dynamics.animationId = null;
}

function lineDynamics(a, b) {
  dynamicsCtx.beginPath();
  dynamicsCtx.moveTo(a.x, a.y);
  dynamicsCtx.lineTo(b.x, b.y);
  dynamicsCtx.stroke();
}

function drawDynamicsArrow(start, end, headSize = 9) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  lineDynamics(start, end);
  dynamicsCtx.beginPath();
  dynamicsCtx.moveTo(end.x, end.y);
  dynamicsCtx.lineTo(end.x - headSize * Math.cos(angle - Math.PI / 7), end.y - headSize * Math.sin(angle - Math.PI / 7));
  dynamicsCtx.lineTo(end.x - headSize * Math.cos(angle + Math.PI / 7), end.y - headSize * Math.sin(angle + Math.PI / 7));
  dynamicsCtx.closePath();
  dynamicsCtx.fill();
}

function showDynamicsToast(message, duration = 2400) {
  if (!dynamicsToast) return;
  dynamicsToast.textContent = message;
  dynamicsToast.classList.add("visible");
  clearTimeout(showDynamicsToast.timer);
  showDynamicsToast.timer = setTimeout(() => dynamicsToast.classList.remove("visible"), duration);
}

function isDynamicsPaintMode() {
  return (
    state.activeModule === "dynamics" &&
    els.dynamicsBuildKind.value === "custom" &&
    els.dynamicsCustomMode.value === "paint"
  );
}

function dynamicsCanvasPoint(event) {
  const rect = dynamicsCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function syncDynamicsCanvasCursor() {
  if (!dynamicsCanvas) return;
  const drawingObject = state.dynamics.placementMode && isDynamicsPaintMode();
  dynamicsCanvas.classList.toggle("placing", state.dynamics.placementMode && !drawingObject);
  dynamicsCanvas.classList.toggle("drawing-object", drawingObject);
  dynamicsCanvas.classList.toggle("drawing-range", state.dynamics.fieldRangeDrawing);
  els.dynamicsPlaceButton.classList.toggle("active", state.dynamics.placementMode);
}

function beginDynamicsObjectPlacement() {
  cancelDynamicsAnimation();
  state.dynamics.placementMode = true;
  state.dynamics.fieldRangeDrawing = false;
  state.dynamics.result = null;
  syncDynamicsCanvasCursor();
  const message = isDynamicsPaintMode()
    ? "在建模区按住鼠标左键绘制任意形状。"
    : "在建模区单击确定对象位置。";
  showDynamicsToast(message, 3000);
  drawDynamicsScene();
}

function placeDynamicsObject(world) {
  const kind = els.dynamicsBuildKind.value;
  const object = dynamicsObjectFromControls(kind, world);
  recordDynamicsHistory();
  state.dynamics.objects.push(object);
  state.dynamics.object = object;
  state.dynamics.selectedObjectId = object.id;
  state.dynamics.placementMode = false;
  state.dynamics.result = null;
  els.dynamicsX0.value = `${formatNumber(world.x)} m`;
  els.dynamicsY0.value = `${formatNumber(world.y)} m`;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  syncDynamicsObjectControls(object);
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast(`${dynamicsKindLabel(kind)}已放置。`, 1800);
}

function finishDynamicsPaintedObject(path) {
  if (path.length < 3) {
    state.dynamics.paintPath = [];
    showDynamicsToast("绘制路径过短，请重新绘制。", 2200);
    drawDynamicsScene();
    return;
  }
  const center = path.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  center.x /= path.length;
  center.y /= path.length;
  const object = dynamicsObjectFromControls("custom", center, [...path]);
  recordDynamicsHistory();
  state.dynamics.objects.push(object);
  state.dynamics.object = object;
  state.dynamics.selectedObjectId = object.id;
  state.dynamics.paintPath = [];
  state.dynamics.placementMode = false;
  state.dynamics.result = null;
  els.dynamicsX0.value = `${formatNumber(center.x)} m`;
  els.dynamicsY0.value = `${formatNumber(center.y)} m`;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  syncDynamicsObjectControls(object);
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast("任意形状对象已建立。", 1800);
}

function finishDynamicsFieldRange(path) {
  if (!state.dynamics.field || path.length < 3) {
    state.dynamics.fieldRangeDraft = null;
    showDynamicsToast("范围路径过短，请重新绘制。", 2200);
    drawDynamicsScene();
    return;
  }
  recordDynamicsHistory();
  state.dynamics.field.path = [...path];
  state.dynamics.fieldRangePath = [];
  state.dynamics.fieldRangeDraft = null;
  state.dynamics.fieldRangeDrawing = false;
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast(`${dynamicsFieldKindLabel(state.dynamics.field.kind)}任意范围已建立。`, 2200);
}

function clearDynamicsModel() {
  if (!state.dynamics.objects.length && !state.dynamics.fields.length && !state.dynamics.forces.length) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.objects = [];
  state.dynamics.fields = [];
  state.dynamics.forces = [];
  state.dynamics.objectSeq = 1;
  state.dynamics.fieldSeq = 1;
  state.dynamics.forceSeq = 1;
  state.dynamics.selectedObjectId = null;
  state.dynamics.editingFieldId = null;
  state.dynamics.object = null;
  state.dynamics.field = null;
  state.dynamics.result = null;
  state.dynamics.paintPath = [];
  state.dynamics.placementMode = false;
  state.dynamics.fieldRangeDrawing = false;
  state.dynamics.fieldRangePath = [];
  state.dynamics.fieldRangeDraft = null;
  els.dynamicsResultText.textContent = "暂无结果";
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  syncDynamicsObjectControls(null);
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast("动力学建模区已清空。", 1800);
}

function drawGrid() {
  ctx.save();
  ctx.fillStyle = cssColor("--canvas");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!els.gridToggle.checked) {
    drawAxes();
    ctx.restore();
    return;
  }
  const step = state.gridSize * state.pxPerMeter;
  const startX = state.origin.x % step;
  const startY = state.origin.y % step;
  ctx.strokeStyle = cssColor("--grid");
  ctx.lineWidth = 1;
  for (let x = startX; x < canvas.width; x += step) line({ x, y: 0 }, { x, y: canvas.height });
  for (let y = startY; y < canvas.height; y += step) line({ x: 0, y }, { x: canvas.width, y });
  drawAxes();
  ctx.restore();
}

function drawAxes() {
  ctx.strokeStyle = cssColor("--grid-major");
  ctx.lineWidth = 1.4;
  line({ x: 0, y: state.origin.y }, { x: canvas.width, y: state.origin.y });
  line({ x: state.origin.x, y: 0 }, { x: state.origin.x, y: canvas.height });
}

function drawElements() {
  ctx.save();
  ctx.lineCap = "round";
  for (const element of state.elements) {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    const selected = isElementSelected(element.id);
    ctx.strokeStyle = selected ? cssColor("--select") : cssColor("--ink");
    ctx.lineWidth = selected ? 4 : 3;
    drawElementShape(element, a, b);
    const geometry = elementGeometryOf(element);
    if (element.type === "rigid") {
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 1.5;
      line(offsetPoint(a, b, 5), offsetPoint(b, a, -5));
      ctx.setLineDash([]);
    } else if (geometry === "tee") {
      drawTeeElementGlyph(a, b, selected);
    }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    drawText(element.id, mid.x + 6, mid.y - 8, cssColor("--ink"));
  }
  ctx.restore();
}

function drawElementShape(element, a, b) {
  const geometry = elementGeometryOf(element);
  if (geometry === "freeform" && Array.isArray(element.path) && element.path.length > 1) {
    const points = element.path.map((point) => worldToScreen(point));
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    return;
  }
  if (geometry === "right_angle") {
    const elbow = { x: b.x, y: a.y };
    line(a, elbow);
    line(elbow, b);
    return;
  }
  if (geometry !== "arc") {
    line(a, b);
    return;
  }
  const control = arcControlPoint(element, a, b);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
  ctx.stroke();
}

function arcControlPoint(element, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const curvature = Number(element.curvature || element.sectionParams?.curvature || 0.25);
  return {
    x: (a.x + b.x) / 2 + normal.x * curvature * length,
    y: (a.y + b.y) / 2 + normal.y * curvature * length,
  };
}

function drawTeeElementGlyph(a, b, selected) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const tangent = { x: dx / length, y: dy / length };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const depth = selected ? 17 : 14;
  const cap = selected ? 18 : 14;
  ctx.save();
  ctx.strokeStyle = selected ? cssColor("--select") : cssColor("--ink");
  ctx.lineWidth = 1.8;
  const stem = { x: mid.x + normal.x * depth, y: mid.y + normal.y * depth };
  line(mid, stem);
  line({ x: stem.x - tangent.x * cap, y: stem.y - tangent.y * cap }, { x: stem.x + tangent.x * cap, y: stem.y + tangent.y * cap });
  ctx.restore();
}

function drawNodes() {
  ctx.save();
  for (const node of state.nodes) {
    if (node.fused) continue;
    const point = worldToScreen(node);
    const selected = isNodeSelected(node.id);
    ctx.beginPath();
    ctx.arc(point.x, point.y, selected ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = selected ? cssColor("--select") : cssColor("--surface");
    ctx.strokeStyle = selected ? cssColor("--select") : cssColor("--ink");
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    drawText(node.id, point.x + 8, point.y - 10, cssColor("--muted"));
  }
  ctx.restore();
}

function offsetPoint(point, toward, offset) {
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  return { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
}

function drawSupports() {
  for (const node of state.nodes) {
    const restraints = restraintsToList(node.restraints);
    if (!restraints.length) continue;
    const point = worldToScreen(node);
    const support = node.support || supportFromRestraints(node.restraints);
    const direction = supportDirection(node);
    if (support.type === "ground") {
      drawGroundFoundation(point, direction);
    } else if (support.type === "fixed" || (node.restraints.ux && node.restraints.uy && node.restraints.rz)) {
      drawFixedSupport(point, direction);
    } else if (support.type === "pin" || (node.restraints.ux && node.restraints.uy)) {
      drawPinSupport(point, direction);
    } else {
      drawRollerSupport(point, direction);
    }
  }
}

function supportFromRestraints(restraints) {
  if (restraints.ux && restraints.uy && restraints.rz) return { type: "fixed", mode: "fixed", angle: 0 };
  if (restraints.ux && restraints.uy) return { type: "pin", mode: "fixed-ground", angle: 0 };
  if (restraints.uy) return { type: "roller", mode: "rolling-ground", angle: 0 };
  return { type: "free", mode: "free", angle: 0 };
}

function supportDirection(node) {
  const support = node.support || {};
  if ((support.mode === "rotating" || support.orientationExplicit) && Number.isFinite(Number(support.angle)) && support.type !== "free") {
    const radians = Number(support.angle) * (Math.PI / 180);
    return { x: Math.cos(radians), y: -Math.sin(radians) };
  }
  return connectedDirection(node);
}

function connectedDirection(node) {
  for (const element of state.elements) {
    if (element.node_i === node.id || element.node_j === node.id) {
      const other = getNode(element.node_i === node.id ? element.node_j : element.node_i);
      if (!other) continue;
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const length = Math.hypot(dx, dy) || 1;
      return { x: dx / length, y: -dy / length };
    }
  }
  return { x: 0, y: -1 };
}

function drawFixedSupport(point, dir) {
  ctx.save();
  ctx.strokeStyle = cssColor("--ink");
  ctx.lineWidth = 2.2;
  const normal = { x: -dir.y, y: dir.x };
  const halfWidth = supportSymbolSize() * 0.62;
  const a = groundStart(point, normal, halfWidth);
  const b = groundEnd(point, normal, halfWidth);
  line(a, b);
  for (let i = -halfWidth + 5; i <= halfWidth - 5; i += 8) {
    const base = { x: point.x + normal.x * i, y: point.y + normal.y * i };
    line(base, { x: base.x - dir.x * 12 + normal.x * 4, y: base.y - dir.y * 12 + normal.y * 4 });
  }
  ctx.restore();
}

function drawGroundFoundation(point, dir) {
  ctx.save();
  const normal = { x: -dir.y, y: dir.x };
  drawSupportGround(point, dir, normal, supportSymbolSize() * 0.68, cssColor("--ink"), 2.4);
  ctx.restore();
}

function drawPinSupport(point, dir) {
  ctx.save();
  ctx.strokeStyle = cssColor("--ink");
  ctx.fillStyle = document.body.classList.contains("dark-theme") ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.05)";
  ctx.lineWidth = 2.1;
  const normal = { x: -dir.y, y: dir.x };
  const size = supportSymbolSize();
  const height = size * 0.55;
  const halfBase = size * 0.38;
  const base = { x: point.x - dir.x * height, y: point.y - dir.y * height };
  const p1 = { x: base.x + normal.x * halfBase, y: base.y + normal.y * halfBase };
  const p2 = { x: base.x - normal.x * halfBase, y: base.y - normal.y * halfBase };
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawSupportGround(base, dir, normal, halfBase + 9, cssColor("--ink"), 1.9);
  ctx.restore();
}

function drawRollerSupport(point, dir) {
  ctx.save();
  ctx.strokeStyle = cssColor("--ink");
  ctx.fillStyle = document.body.classList.contains("dark-theme") ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.05)";
  ctx.lineWidth = 2.1;
  const normal = { x: -dir.y, y: dir.x };
  const size = supportSymbolSize();
  const height = size * 0.58;
  const halfBase = size * 0.36;
  const radius = Math.max(4, size * 0.085);
  const base = { x: point.x - dir.x * height, y: point.y - dir.y * height };
  const p1 = { x: base.x + normal.x * halfBase, y: base.y + normal.y * halfBase };
  const p2 = { x: base.x - normal.x * halfBase, y: base.y - normal.y * halfBase };
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const rollerCenter = { x: base.x - dir.x * (radius + 3), y: base.y - dir.y * (radius + 3) };
  for (const offset of [-radius * 1.8, radius * 1.8]) {
    ctx.beginPath();
    ctx.arc(rollerCenter.x + normal.x * offset, rollerCenter.y + normal.y * offset, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  const groundCenter = { x: base.x - dir.x * (radius * 3 + 8), y: base.y - dir.y * (radius * 3 + 8) };
  drawSupportGround(groundCenter, dir, normal, halfBase + 12, cssColor("--ink"), 1.9);
  ctx.restore();
}

function drawSupportGround(center, dir, normal, halfWidth, color = cssColor("--ink"), lineWidth = 1.8) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  line(groundStart(center, normal, halfWidth), groundEnd(center, normal, halfWidth));
  ctx.lineWidth = Math.max(1.2, lineWidth - 0.4);
  for (let offset = -halfWidth + 4; offset <= halfWidth - 4; offset += 8) {
    const start = { x: center.x + normal.x * offset, y: center.y + normal.y * offset };
    const end = {
      x: start.x - dir.x * 11 + normal.x * 4,
      y: start.y - dir.y * 11 + normal.y * 4,
    };
    line(start, end);
  }
  ctx.restore();
}

function drawLoads() {
  for (const load of state.loads) {
    if (load.kind === "element_point" && load.element) {
      drawElementPointLoad(load);
      continue;
    }
    const node = getNode(load.node);
    if (!node) continue;
    const point = worldToScreen(node);
    const fx = quantityToNumber(load.fx, "N");
    const fy = quantityToNumber(load.fy, "N");
    const magnitude = Math.hypot(fx, fy);
    if (magnitude > 0) {
      const length = Math.min(70, Math.max(30, magnitude / 250));
      const vector = { x: (fx / magnitude) * length, y: (-fy / magnitude) * length };
      drawArrow({ x: point.x - vector.x, y: point.y - vector.y }, point, cssColor("--danger"));
      drawText(compactForce(magnitude), point.x - vector.x + 6, point.y - vector.y, cssColor("--danger"));
    }
    const mz = quantityToNumber(load.mz, "N*m");
    if (Math.abs(mz) > 0) drawMomentGlyph(point, mz);
  }
}

function drawElementPointLoad(load) {
  const element = getElement(load.element);
  if (!element) return;
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return;
  const a = worldToScreen(nodeI);
  const b = worldToScreen(nodeJ);
  const ratio = Math.max(0, Math.min(1, Number(load.ratio ?? 0.5)));
  const point = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
  const fx = quantityToNumber(load.fx, "N");
  const fy = quantityToNumber(load.fy, "N");
  const magnitude = Math.hypot(fx, fy);
  if (magnitude > 0) {
    const length = Math.min(70, Math.max(30, magnitude / 250));
    const vector = { x: (fx / magnitude) * length, y: (-fy / magnitude) * length };
    drawArrow({ x: point.x - vector.x, y: point.y - vector.y }, point, cssColor("--danger"));
    drawText(`${compactForce(magnitude)} @${Math.round(ratio * 100)}%`, point.x - vector.x + 6, point.y - vector.y, cssColor("--danger"));
  }
  const mz = quantityToNumber(load.mz, "N*m");
  if (Math.abs(mz) > 0) drawMomentGlyph(point, mz);
}

function drawElementLoads() {
  ctx.save();
  for (const load of state.elementLoads) {
    const element = getElement(load.element);
    if (!element) continue;
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };
    if (load.kind === "uniform_moment_local") {
      drawUniformMomentLoad(load, a, b, normal);
      continue;
    }
    const qi = quantityToNumber(load.qy_i || load.qy, "N/m");
    const qj = quantityToNumber(load.qy_j || load.qy, "N/m");
    const maxQ = Math.max(Math.abs(qi), Math.abs(qj), 1);
    const side = Math.abs(qi) >= Math.abs(qj) ? (qi < 0 ? 1 : -1) : qj < 0 ? 1 : -1;
    const count = 9;
    const starts = [];
    ctx.save();
    ctx.strokeStyle = cssColor("--danger");
    ctx.fillStyle = cssColor("--danger");
    ctx.lineWidth = 1.8;
    for (let index = 0; index < count; index++) {
      const r = count === 1 ? 0 : index / (count - 1);
      const q = qi + (qj - qi) * r;
      const base = { x: a.x + dx * r, y: a.y + dy * r };
      const arrowLength = Math.max(3, (Math.abs(q) / maxQ) * 38);
      const start = {
        x: base.x + normal.x * arrowLength * side,
        y: base.y + normal.y * arrowLength * side,
      };
      starts.push(start);
      if (Math.abs(q) > maxQ * 0.03) drawArrow(start, base, cssColor("--danger"));
    }
    ctx.beginPath();
    starts.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    line(starts[0], a);
    line(starts[starts.length - 1], b);
    const mid = starts[Math.floor(starts.length / 2)];
    drawText(distributedLoadLabel(load), mid.x + normal.x * 8 * side, mid.y + normal.y * 8 * side, cssColor("--danger"));
    ctx.restore();
  }
  ctx.restore();
}

function drawUniformMomentLoad(load, a, b, normal) {
  const intensity = quantityToNumber(load.mz || "0 N*m/m", "N*m/m");
  const sign = intensity >= 0 ? 1 : -1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  ctx.save();
  ctx.strokeStyle = cssColor("--danger");
  ctx.fillStyle = cssColor("--danger");
  ctx.lineWidth = 1.8;
  for (let index = 1; index <= 5; index++) {
    const r = index / 6;
    const center = { x: a.x + dx * r + normal.x * 24, y: a.y + dy * r + normal.y * 24 };
    drawMomentGlyph(center, sign);
  }
  const mid = { x: (a.x + b.x) / 2 + normal.x * 48, y: (a.y + b.y) / 2 + normal.y * 48 };
  drawText(load.mz || "0 N*m/m", mid.x, mid.y, cssColor("--danger"));
  ctx.restore();
}

function distributedLoadLabel(load) {
  if (load.kind === "uniform_local") return load.qy || load.qx || "0 N/m";
  if (load.kind === "linear_local") return `${load.qy_i || "0 N/m"} → ${load.qy_j || "0 N/m"}`;
  return "q(x)";
}

function compactForce(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} kN`;
  return `${value.toFixed(0)} N`;
}

function drawMomentGlyph(point, moment) {
  ctx.save();
  ctx.strokeStyle = cssColor("--danger");
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 22, moment > 0 ? -0.3 : 0.3, moment > 0 ? 4.7 : -4.7, moment < 0);
  ctx.stroke();
  ctx.restore();
}

function drawDeformedShape() {
  const factor = Number(els.deformScale.value || 1);
  ctx.save();
  ctx.strokeStyle = cssColor("--accent");
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  for (const element of state.elements) {
    const a = deformedScreenPoint(getNode(element.node_i), factor);
    const b = deformedScreenPoint(getNode(element.node_j), factor);
    line(a, b);
  }
  ctx.restore();
}

function deformedScreenPoint(node, factor) {
  const displacement = (state.result.displacements && state.result.displacements[node.id]) || {};
  return worldToScreen({
    x: node.x + Number(displacement.ux || 0) * factor,
    y: node.y + Number(displacement.uy || 0) * factor,
  });
}

function drawDiagrams() {
  if (!dctx) return;
  dctx.clearRect(0, 0, diagramCanvas.width, diagramCanvas.height);
  dctx.fillStyle = cssColor("--surface");
  dctx.fillRect(0, 0, diagramCanvas.width, diagramCanvas.height);

  if (!state.result) {
    dctx.fillStyle = cssColor("--muted");
    dctx.font = "14px Segoe UI, Arial, sans-serif";
    dctx.fillText("求解后在此分开展示剪力图 V、弯矩图 M、轴力图 N、应力和应变图。", 24, 38);
    return;
  }

  const specs = selectedDiagramSpecs();
  if (specs.length === 0) {
    dctx.fillStyle = cssColor("--muted");
    dctx.font = "14px Segoe UI, Arial, sans-serif";
    dctx.fillText("当前未选择要显示的图形。", 24, 38);
    return;
  }

  const stressStrain = els.stressStrainToggle.checked || state.solveOptions.includes("stress_strain");
  const chartCount = specs.length + (stressStrain ? 1 : 0);
  const gap = chartCount > 4 ? 10 : 16;
  const topMargin = chartCount > 4 ? 12 : 18;
  const chartHeight = Math.max(28, (diagramCanvas.height - topMargin * 2 - gap * (chartCount - 1)) / chartCount);
  let top = topMargin;
  for (const spec of specs) {
    drawSingleDiagram(spec, top, chartHeight);
    top += chartHeight + gap;
  }
  if (stressStrain) drawStressStrainDiagram(top, chartHeight);
}

function selectedDiagramSpecs() {
  const specs = [];
  if (els.shearToggle.checked) {
    specs.push({ component: "v", symbol: "V", unit: "kN", scale: 1 / 1000, color: cssColor("--danger") });
  }
  if (els.momentToggle.checked) {
    specs.push({ component: "m", symbol: "M", unit: "kN·m", scale: 1 / 1000, color: cssColor("--warn") });
  }
  if (els.axialToggle.checked) {
    specs.push({ component: "n", symbol: "N", unit: "kN", scale: 1 / 1000, color: cssColor("--blue") });
  }
  return specs;
}

function drawSingleDiagram(spec, top, height) {
  const data = chartData(spec.component);
  const left = 70;
  const right = diagramCanvas.width - 28;
  const topPad = Math.min(18, Math.max(10, height * 0.2));
  const bottomPad = Math.min(24, Math.max(12, height * 0.24));
  const bottom = top + height - bottomPad;
  const yAxisTop = top + topPad;
  const y0 = top + height * 0.54;
  const plotHeight = Math.max(6, Math.min(height * 0.34, Math.max(6, (bottom - yAxisTop) * 0.44)));
  const maxAbs = Math.max(...data.map((point) => Math.abs(point.value)), 1e-9);
  const totalLength = Math.max(data[data.length - 1]?.x || 1, 1e-9);
  const toX = (x) => left + (x / totalLength) * (right - left);
  const toY = (value) => y0 - (value / maxAbs) * plotHeight;

  dctx.save();
  dctx.strokeStyle = cssColor("--line");
  dctx.lineWidth = 1;
  dctx.strokeRect(8, top, diagramCanvas.width - 16, height);

  dctx.strokeStyle = cssColor("--ink");
  dctx.lineWidth = 1.3;
  lineD({ x: left, y: y0 }, { x: right, y: y0 });
  lineD({ x: left, y: bottom }, { x: left, y: yAxisTop });
  drawAxisArrowD({ x: right, y: y0 }, "x");
  drawAxisArrowD({ x: left, y: yAxisTop }, "y");

  dctx.fillStyle = cssColor("--ink");
  dctx.font = "13px Segoe UI, Arial, sans-serif";
  dctx.fillText(`${spec.symbol} (${spec.unit})`, 16, top + 18);
  dctx.fillText("x (m)", right - 34, y0 - 8);
  dctx.fillText("0", left - 18, y0 + 4);
  dctx.fillText(`${totalLength.toFixed(2)} m`, right - 50, y0 + 18);

  dctx.strokeStyle = hexToAlpha(spec.color, 0.5);
  dctx.lineWidth = 1;
  for (let index = 0; index < data.length; index += Math.max(1, Math.floor(data.length / 28))) {
    const point = data[index];
    const x = toX(point.x);
    lineD({ x, y: y0 }, { x, y: toY(point.value) });
  }

  dctx.beginPath();
  data.forEach((point, index) => {
    const x = toX(point.x);
    const y = toY(point.value);
    if (index === 0) dctx.moveTo(x, y);
    else dctx.lineTo(x, y);
  });
  dctx.strokeStyle = spec.color;
  dctx.lineWidth = 2.2;
  dctx.stroke();

  annotateExtrema(data, spec, toX, toY, y0);
  dctx.restore();
}

function annotateExtrema(data, spec, toX, toY, y0) {
  const extrema = [];
  const maxPoint = data.reduce((best, point) => (point.value > best.value ? point : best), data[0]);
  const minPoint = data.reduce((best, point) => (point.value < best.value ? point : best), data[0]);
  if (Math.abs(maxPoint.value) > 1e-9) extrema.push(maxPoint);
  if (Math.abs(minPoint.value - maxPoint.value) > 1e-9) extrema.push(minPoint);
  dctx.save();
  dctx.setLineDash([5, 4]);
  dctx.strokeStyle = cssColor("--muted");
  dctx.fillStyle = cssColor("--ink");
  dctx.font = "12px Segoe UI, Arial, sans-serif";
  for (const point of extrema) {
    const x = toX(point.x);
    const y = toY(point.value);
    lineD({ x, y }, { x, y: y0 });
    lineD({ x, y }, { x: 70, y });
    dctx.setLineDash([]);
    dctx.beginPath();
    dctx.arc(x, y, 3.5, 0, Math.PI * 2);
    dctx.fillStyle = spec.color;
    dctx.fill();
    dctx.fillStyle = cssColor("--ink");
    dctx.fillText(`${formatNumber(point.value)} ${spec.unit}`, x + 6, y - 6);
    dctx.setLineDash([5, 4]);
  }
  dctx.restore();
}

function chartData(component) {
  const diagrams = state.result.element_diagrams || {};
  const data = [];
  let offset = 0;
  for (const element of state.elements) {
    const rows = diagrams[element.id] || [];
    if (!rows.length) continue;
    const elementLength = rows[rows.length - 1].x || elementLengthFromModel(element);
    for (const row of rows) {
      data.push({ x: offset + row.x, value: diagramValue(component, row) });
    }
    offset += elementLength;
  }
  return data.length ? data : [{ x: 0, value: 0 }, { x: 1, value: 0 }];
}

function diagramValue(component, row) {
  if (component === "stress") return stressAtRow(row) / 1e6;
  if (component === "strain") return (stressAtRow(row) / elasticModulusPa()) * 1e6;
  return (row[component] || 0) / 1000;
}

function stressAtRow(row) {
  const area = Math.max(quantityToNumber(els.sectionA.value, "m^2"), 1e-12);
  const inertia = Math.max(quantityToNumber(els.sectionI.value, "m^4"), 1e-18);
  const equivalentDepth = Math.sqrt(area);
  const c = equivalentDepth / 2;
  return (row.n || 0) / area + ((row.m || 0) * c) / inertia;
}

function elasticModulusPa() {
  return Math.max(quantityToNumber(els.materialE.value, "Pa"), 1);
}

function elementLengthFromModel(element) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return 1;
  return Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y) || 1;
}

function drawStressStrainDiagram(top, height) {
  const stressData = chartData("stress");
  const maxStress = Math.max(...stressData.map((point) => Math.abs(point.value)), 1e-9);
  const maxStrain = Math.max(...stressData.map((point) => Math.abs(((point.value * 1e6) / elasticModulusPa()) * 1e6)), 1e-9);
  const left = 70;
  const right = diagramCanvas.width - 28;
  const bottom = top + height - Math.min(28, Math.max(12, height * 0.25));
  const topY = top + Math.min(18, Math.max(10, height * 0.2));
  dctx.save();
  dctx.strokeStyle = cssColor("--line");
  dctx.strokeRect(8, top, diagramCanvas.width - 16, height);
  dctx.strokeStyle = cssColor("--ink");
  lineD({ x: left, y: bottom }, { x: right, y: bottom });
  lineD({ x: left, y: bottom }, { x: left, y: topY });
  drawAxisArrowD({ x: right, y: bottom }, "x");
  drawAxisArrowD({ x: left, y: topY }, "y");
  dctx.fillStyle = cssColor("--ink");
  dctx.font = "13px Segoe UI, Arial, sans-serif";
  dctx.fillText("σ-ε 图", 16, top + 18);
  dctx.fillText("ε (με)", right - 46, bottom - 8);
  dctx.fillText("σ (MPa)", 16, top + 36);
  dctx.strokeStyle = "#8e24aa";
  dctx.lineWidth = 2.2;
  dctx.beginPath();
  dctx.moveTo(left, bottom);
  dctx.lineTo(right, topY);
  dctx.stroke();
  dctx.fillText(`${formatNumber(maxStrain)} με`, right - 82, bottom + 18);
  dctx.fillText(`${formatNumber(maxStress)} MPa`, left + 10, topY + 12);
  dctx.restore();
}

function drawAxisArrowD(point, axis) {
  dctx.save();
  dctx.fillStyle = cssColor("--ink");
  dctx.beginPath();
  if (axis === "x") {
    dctx.moveTo(point.x, point.y);
    dctx.lineTo(point.x - 8, point.y - 4);
    dctx.lineTo(point.x - 8, point.y + 4);
  } else {
    dctx.moveTo(point.x, point.y);
    dctx.lineTo(point.x - 4, point.y + 8);
    dctx.lineTo(point.x + 4, point.y + 8);
  }
  dctx.closePath();
  dctx.fill();
  dctx.restore();
}

function lineD(a, b) {
  dctx.beginPath();
  dctx.moveTo(a.x, a.y);
  dctx.lineTo(b.x, b.y);
  dctx.stroke();
}

function hexToAlpha(color, alpha) {
  if (!color.startsWith("#")) return `rgba(0,0,0,${alpha})`;
  const value = color.slice(1);
  const int = parseInt(value.length === 3 ? value.replace(/(.)/g, "$1$1") : value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawPreview() {
  if (state.tool === "element" && state.elementGeometry === "freeform" && state.freeformDraw && state.freeformDraw.path.length > 1) {
    ctx.save();
    ctx.strokeStyle = cssColor("--accent");
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.freeformDraw.path[0].x, state.freeformDraw.path[0].y);
    for (const point of state.freeformDraw.path.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (state.tool !== "element" || !state.pendingNode || !state.pointer) return;
  const first = getNode(state.pendingNode);
  if (!first) return;
  let world = screenToWorld(state.pointer);
  world = applyOrthogonalLock(world);
  ctx.save();
  ctx.strokeStyle = cssColor("--accent");
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  const a = worldToScreen(first);
  const b = worldToScreen(world);
  if (state.elementGeometry === "right_angle") {
    line(a, { x: b.x, y: a.y });
    line({ x: b.x, y: a.y }, b);
  } else if (state.elementGeometry === "arc") {
    const control = arcControlPoint({ curvature: state.elementDefaults.curvature }, a, b);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
    ctx.stroke();
  } else {
    line(a, b);
  }
  ctx.restore();
}

function drawSelectionGesture() {
  if (!state.drag || state.tool !== "select") return;
  ctx.save();
  ctx.strokeStyle = cssColor("--select");
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 1.6;
  if (els.selectionMode.value === "box") {
    const start = state.drag.start;
    const current = state.drag.current;
    ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
  }
  if (els.selectionMode.value === "lasso" && state.drag.path.length > 1) {
    ctx.beginPath();
    ctx.moveTo(state.drag.path[0].x, state.drag.path[0].y);
    for (const point of state.drag.path.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}

function line(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawArrow(start, end, color) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  line(start, end);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - 10 * Math.cos(angle - Math.PI / 7), end.y - 10 * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(end.x - 10 * Math.cos(angle + Math.PI / 7), end.y - 10 * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawText(text, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function isRotatableSupport(node) {
  return node && node.support && ["pin", "roller"].includes(node.support.type) && node.support.mode === "rotating";
}

function isSupportNode(node) {
  return node && restraintsToList(node.restraints || {}).length > 0;
}

function angleFromSupportDrag(node, point) {
  const center = worldToScreen(node);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (Math.hypot(dx, dy) < 1) return Number(node.support?.angle || 0);
  return Number((Math.atan2(-dy, dx) * 180 / Math.PI).toFixed(1));
}

function pushUndoForInteraction(interaction) {
  if (interaction.undoPushed) return;
  state.undoStack.push(snapshot());
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
  interaction.undoPushed = true;
}

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  const point = canvasPoint(event);
  state.pointer = point;
  if (state.tool === "element" && state.elementGeometry === "freeform") {
    state.freeformDraw = { path: [point] };
    state.drag = null;
    return;
  }
  const hitNode = nodeOrSupportAtScreen(point.x, point.y);
  const hitElement = elementAtScreen(point.x, point.y);
  if (state.tool === "select" && isRotatableSupport(hitNode)) {
    state.rotateSupport = {
      nodeId: hitNode.id,
      start: point,
      moved: false,
      undoPushed: false,
    };
    state.drag = null;
    return;
  }
  if (state.tool === "select" && els.selectionMode.value === "point" && !hitNode && !hitElement && !event.shiftKey) {
    state.pan = {
      start: point,
      originStart: { ...state.origin },
      moved: false,
    };
    state.drag = null;
    return;
  }
  state.drag = { start: point, current: point, path: [point], moved: false };
});

canvas.addEventListener("mousemove", (event) => {
  const point = canvasPoint(event);
  state.pointer = point;
  if (state.freeformDraw) {
    const last = state.freeformDraw.path[state.freeformDraw.path.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 3) state.freeformDraw.path.push(point);
    draw();
    return;
  }
  if (state.rotateSupport) {
    const node = getNode(state.rotateSupport.nodeId);
    if (!node) return;
    state.rotateSupport.moved =
      state.rotateSupport.moved || Math.hypot(point.x - state.rotateSupport.start.x, point.y - state.rotateSupport.start.y) > 3;
    if (state.rotateSupport.moved) {
      pushUndoForInteraction(state.rotateSupport);
      node.support.angle = angleFromSupportDrag(node, point);
      state.result = null;
      syncUi();
    }
    draw();
    return;
  }
  if (state.pan) {
    const dx = point.x - state.pan.start.x;
    const dy = point.y - state.pan.start.y;
    state.pan.moved = state.pan.moved || Math.hypot(dx, dy) > 3;
    state.origin = {
      x: state.pan.originStart.x + dx,
      y: state.pan.originStart.y + dy,
    };
    draw();
    return;
  }
  if (state.drag) {
    state.drag.current = point;
    state.drag.moved = state.drag.moved || Math.hypot(point.x - state.drag.start.x, point.y - state.drag.start.y) > 4;
    if (els.selectionMode.value === "lasso") state.drag.path.push(point);
  }
  if ((state.tool === "select" && state.drag) || (state.tool === "element" && state.pendingNode)) draw();
});

canvas.addEventListener("mouseup", (event) => {
  const point = canvasPoint(event);
  if (state.freeformDraw) {
    const path = [...state.freeformDraw.path, point];
    state.freeformDraw = null;
    if (path.length > 2) {
      mutate(() => addFreeformElement(path));
    } else {
      draw();
    }
    return;
  }
  if (state.rotateSupport) {
    const interaction = state.rotateSupport;
    state.rotateSupport = null;
    const node = getNode(interaction.nodeId);
    if (node && !interaction.moved) setSelection("node", node.id, event.shiftKey);
    syncUi();
    draw();
    return;
  }
  if (state.pan) {
    const wasClick = !state.pan.moved;
    state.pan = null;
    if (wasClick) handlePointAction(point, event);
    draw();
    return;
  }
  if (state.tool === "select" && state.drag && state.drag.moved && els.selectionMode.value !== "point") {
    if (els.selectionMode.value === "box") selectByBox(state.drag.start, point);
    if (els.selectionMode.value === "lasso") selectByLasso(state.drag.path);
    state.drag = null;
    return;
  }
  handlePointAction(point, event);
  state.drag = null;
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const before = {
      x: (point.x - state.origin.x) / state.pxPerMeter,
      y: (state.origin.y - point.y) / state.pxPerMeter,
    };
    const factor = Math.exp(-event.deltaY * 0.001);
    const nextScale = Math.min(state.maxPxPerMeter, Math.max(state.minPxPerMeter, state.pxPerMeter * factor));
    if (Math.abs(nextScale - state.pxPerMeter) < 1e-6) return;
    state.pxPerMeter = nextScale;
    state.origin = {
      x: point.x - before.x * nextScale,
      y: point.y + before.y * nextScale,
    };
    draw();
  },
  { passive: false }
);

canvas.addEventListener("mouseleave", () => {
  state.pointer = null;
  state.drag = null;
  state.pan = null;
  state.rotateSupport = null;
  state.freeformDraw = null;
  draw();
});

canvas.addEventListener("dblclick", (event) => {
  const point = canvasPoint(event);
  const hitNode = nodeOrSupportAtScreen(point.x, point.y);
  if (!hitNode) return;
  event.preventDefault();
  if (isSupportNode(hitNode)) openSupportDialog(hitNode);
  else openNodeDialog(hitNode);
});

els.showLoginButton.addEventListener("click", () => showAuthMode("login"));
els.showRegisterButton.addEventListener("click", () => showAuthMode("register"));
els.loginSubmit.addEventListener("click", loginUser);
els.registerSubmit.addEventListener("click", registerUser);
els.startAppButton.addEventListener("click", startApplication);
if (els.staticModuleButton) els.staticModuleButton.addEventListener("click", launchStaticApplication);
if (els.dynamicsModuleButton) els.dynamicsModuleButton.addEventListener("click", launchDynamicsApplication);
els.welcomeLogoutButton.addEventListener("click", logoutUser);
els.settingsButton.addEventListener("click", openSettingsDialog);
if (els.dynamicsSettingsButton) els.dynamicsSettingsButton.addEventListener("click", openSettingsDialog);
if (els.dynamicsToStaticButton) els.dynamicsToStaticButton.addEventListener("click", launchStaticApplication);
if (els.staticToDynamicsButton) els.staticToDynamicsButton.addEventListener("click", launchDynamicsApplication);
els.fontSizeSelect.addEventListener("change", () => applyFontSize(els.fontSizeSelect.value));
els.saveNicknameButton.addEventListener("click", saveNickname);
els.saveAvatarButton.addEventListener("click", saveSettingsAvatar);
els.logoutButton.addEventListener("click", logoutUser);
els.registerAvatar.addEventListener("change", () => {
  const file = els.registerAvatar.files && els.registerAvatar.files[0];
  previewRegisterAvatar(file);
});
els.settingsAvatar.addEventListener("change", () => {
  const file = els.settingsAvatar.files && els.settingsAvatar.files[0];
  previewSettingsAvatar(file);
});
for (const input of [els.loginUsername]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loginUser();
  });
}
for (const input of [els.registerUsername, els.registerNickname]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") registerUser();
  });
}

els.toolButtons.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
els.undoButton.addEventListener("click", undo);
els.redoButton.addEventListener("click", redo);
els.deleteButton.addEventListener("click", deleteSelection);
els.saveButton.addEventListener("click", saveProject);
els.reportButton.addEventListener("click", downloadReport);
els.openButton.addEventListener("click", () => els.fileInput.click());
els.solveButton.addEventListener("click", openSolveDialog);
els.runSolveButton.addEventListener("click", (event) => {
  event.preventDefault();
  solveFromDialog();
});
els.applyElementSettingsButton.addEventListener("click", (event) => {
  event.preventDefault();
  applyElementSettings();
  els.elementDialog.close();
});
els.applySupportSettingsButton.addEventListener("click", (event) => {
  event.preventDefault();
  applySupportSettings();
  els.supportDialog.close();
});
els.solidifySupportNodeButton.addEventListener("click", (event) => {
  event.preventDefault();
  solidifyDialogNode();
  els.supportDialog.close();
});
els.solidifyNodeButton.addEventListener("click", (event) => {
  event.preventDefault();
  solidifyDialogNode();
  els.nodeDialog.close();
});
els.elementType.addEventListener("change", setSelectedElementType);
els.momentReleaseI.addEventListener("change", () => setSelectedElementReleases("i"));
els.momentReleaseJ.addEventListener("change", () => setSelectedElementReleases("j"));
els.setElementLengthButton.addEventListener("click", setSelectedElementLength);
els.themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  els.themeButton.textContent = document.body.classList.contains("dark-theme") ? "白底" : "黑底";
  draw();
});
els.loadModeRadios.forEach((radio) => radio.addEventListener("change", syncLoadPanels));
els.loadDirectionButtons.forEach((button) => button.addEventListener("click", () => setLoadDirection(button.dataset.loadDirection)));
els.applyLoadToSelectionButton.addEventListener("click", () => {
  mutate(() => applyCurrentLoad());
  els.loadDialog.close();
});
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files && els.fileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    mutate(() => importProject(JSON.parse(text)));
    state.undoStack = [];
    state.redoStack = [];
    syncUi();
    showToast("工程已打开。");
  } catch (error) {
    showToast(String(error.message || error));
  } finally {
    els.fileInput.value = "";
  }
});

if (els.dynamicsSolveButton) els.dynamicsSolveButton.addEventListener("click", openDynamicsSolveDialog);
if (els.runDynamicsSolveButton) {
  els.runDynamicsSolveButton.addEventListener("click", () => {
    els.dynamicsSolveDialog.close();
    solveDynamics();
  });
}
if (els.dynamicsUndoButton) els.dynamicsUndoButton.addEventListener("click", undoDynamics);
if (els.dynamicsRedoButton) els.dynamicsRedoButton.addEventListener("click", redoDynamics);
if (els.dynamicsDeleteButton) els.dynamicsDeleteButton.addEventListener("click", deleteSelectedDynamicsObject);
if (els.dynamicsSaveButton) els.dynamicsSaveButton.addEventListener("click", saveDynamicsProject);
if (els.dynamicsOpenButton) els.dynamicsOpenButton.addEventListener("click", () => els.dynamicsFileInput.click());
if (els.dynamicsReportButton) els.dynamicsReportButton.addEventListener("click", downloadDynamicsReport);
if (els.dynamicsFileInput) {
  els.dynamicsFileInput.addEventListener("change", async () => {
    const file = els.dynamicsFileInput.files && els.dynamicsFileInput.files[0];
    if (!file) return;
    try {
      importDynamicsProject(JSON.parse(await file.text()));
      showDynamicsToast("动力学工程已打开。", 2200);
    } catch (error) {
      showDynamicsToast(String(error.message || error), 3600);
    } finally {
      els.dynamicsFileInput.value = "";
    }
  });
}
if (els.dynamicsPlaceButton) els.dynamicsPlaceButton.addEventListener("click", beginDynamicsObjectPlacement);
if (els.dynamicsFieldButton) els.dynamicsFieldButton.addEventListener("click", () => openDynamicsFieldDialog());
if (els.dynamicsForceButton) els.dynamicsForceButton.addEventListener("click", openDynamicsForceDialog);
if (els.dynamicsClearButton) els.dynamicsClearButton.addEventListener("click", clearDynamicsModel);
if (els.dynamicsFieldApplyButton) els.dynamicsFieldApplyButton.addEventListener("click", applyDynamicsField);
if (els.dynamicsForceApplyButton) els.dynamicsForceApplyButton.addEventListener("click", applyDynamicsForce);
if (els.dynamicsForceType) els.dynamicsForceType.addEventListener("change", () => {
  els.dynamicsForceMagnitude.value = els.dynamicsForceType.value === "continuous" ? "1 N" : "1 N*s";
  syncDynamicsForceDialog();
});
if (els.dynamicsForceDirectionPreset) els.dynamicsForceDirectionPreset.addEventListener("change", syncDynamicsForceDialog);

if (els.dynamicsEnvironment) {
  els.dynamicsEnvironment.addEventListener("change", () => {
    setDynamicsFieldDefaults(els.dynamicsEnvironment.value);
    syncDynamicsFieldDialog();
  });
}
for (const control of [els.dynamicsFieldDirectionPreset, els.dynamicsFieldRange]) {
  if (control) control.addEventListener("change", syncDynamicsFieldDialog);
}

for (const control of [els.dynamicsBuildKind, els.dynamicsCustomMode]) {
  if (!control) continue;
  control.addEventListener("change", () => {
    state.dynamics.placementMode = false;
    if (control === els.dynamicsBuildKind && selectedDynamicsObject()?.kind !== els.dynamicsBuildKind.value) {
      state.dynamics.selectedObjectId = null;
      state.dynamics.object = null;
      els.dynamicsObjectPanelTitle.textContent = "新对象参数";
      renderDynamicsSceneLists();
    }
    syncDynamicsControls();
    drawDynamicsScene();
  });
}

for (const control of [
  els.dynamicsRigidToggle,
  els.dynamicsMass,
  els.dynamicsDensity,
  els.dynamicsCharge,
  els.dynamicsSizeA,
  els.dynamicsSizeB,
  els.dynamicsSizeC,
  els.dynamicsMaterialE,
  els.dynamicsShapeEquation,
  els.dynamicsVx0,
  els.dynamicsVy0,
]) {
  if (!control) continue;
  control.addEventListener("change", () => {
    updateSelectedDynamicsObjectFromControls();
    syncDynamicsControls();
  });
}

for (const control of [els.dynamicsX0, els.dynamicsY0, els.dynamicsDuration, els.dynamicsTimeStep]) {
  if (!control) continue;
  control.addEventListener("change", () => {
    if (control === els.dynamicsX0 || control === els.dynamicsY0) updateSelectedDynamicsObjectFromControls();
    cancelDynamicsAnimation();
    state.dynamics.result = null;
    renderDynamicsResult();
    drawDynamicsScene();
  });
}

for (const list of [els.dynamicsObjectList, els.dynamicsFieldList, els.dynamicsForceList]) {
  if (!list) continue;
  list.addEventListener("click", (event) => {
    const row = event.target.closest(".dynamics-scene-row");
    if (!row) return;
    const { kind, id } = row.dataset;
    if (event.target.closest("button[data-delete]")) {
      if (kind === "object") deleteDynamicsObject(id);
      if (kind === "field") deleteDynamicsField(id);
      if (kind === "force") deleteDynamicsForce(id);
      return;
    }
    if (kind === "object") selectDynamicsObject(id);
    if (kind === "field") openDynamicsFieldDialog(id);
  });
}

for (const control of els.dynamicsOptionInputs) {
  control.addEventListener("change", () => {
    renderDynamicsResult();
    cancelDynamicsAnimation();
    drawDynamicsScene();
    if (state.dynamics.result && selectedDynamicsOptions().has("trajectory")) startDynamicsAnimation();
  });
}

if (dynamicsCanvas) {
  dynamicsCanvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const screen = dynamicsCanvasPoint(event);
    const world = dynamicsToWorld(screen);
    if (state.dynamics.fieldRangeDrawing) {
      state.dynamics.fieldRangeDraft = { path: [world] };
      return;
    }
    if (state.dynamics.placementMode && isDynamicsPaintMode()) {
      state.dynamics.painting = true;
      state.dynamics.paintPath = [world];
      return;
    }
    if (state.dynamics.placementMode) {
      placeDynamicsObject(world);
      return;
    }
    state.dynamics.pan = {
      start: screen,
      originStart: { ...state.dynamics.origin },
    };
  });

  dynamicsCanvas.addEventListener("mousemove", (event) => {
    const screen = dynamicsCanvasPoint(event);
    const world = dynamicsToWorld(screen);
    if (state.dynamics.fieldRangeDraft) {
      const path = state.dynamics.fieldRangeDraft.path;
      const last = path[path.length - 1];
      if (!last || Math.hypot(world.x - last.x, world.y - last.y) * state.dynamics.scale > 3) path.push(world);
      drawDynamicsScene();
      return;
    }
    if (state.dynamics.painting && isDynamicsPaintMode()) {
      const last = state.dynamics.paintPath[state.dynamics.paintPath.length - 1];
      if (!last || Math.hypot(world.x - last.x, world.y - last.y) * state.dynamics.scale > 3) state.dynamics.paintPath.push(world);
      drawDynamicsScene();
      return;
    }
    if (!state.dynamics.pan) return;
    state.dynamics.origin = {
      x: state.dynamics.pan.originStart.x + screen.x - state.dynamics.pan.start.x,
      y: state.dynamics.pan.originStart.y + screen.y - state.dynamics.pan.start.y,
    };
    drawDynamicsScene();
  });

  dynamicsCanvas.addEventListener("mouseup", () => {
    if (state.dynamics.fieldRangeDraft) {
      const path = state.dynamics.fieldRangeDraft.path;
      finishDynamicsFieldRange(path);
      return;
    }
    if (state.dynamics.painting) {
      state.dynamics.painting = false;
      finishDynamicsPaintedObject(state.dynamics.paintPath);
      return;
    }
    state.dynamics.pan = null;
  });

  dynamicsCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const screen = dynamicsCanvasPoint(event);
      const before = dynamicsToWorld(screen);
      const factor = Math.exp(-event.deltaY * 0.001);
      const nextScale = Math.min(320, Math.max(12, state.dynamics.scale * factor));
      if (Math.abs(nextScale - state.dynamics.scale) < 1e-6) return;
      state.dynamics.scale = nextScale;
      state.dynamics.origin = {
        x: screen.x - before.x * nextScale,
        y: screen.y + before.y * nextScale,
      };
      drawDynamicsScene();
    },
    { passive: false }
  );

  dynamicsCanvas.addEventListener("mouseleave", () => {
    state.dynamics.pan = null;
    if (state.dynamics.painting) {
      state.dynamics.painting = false;
      state.dynamics.paintPath = [];
    }
    if (state.dynamics.fieldRangeDraft) state.dynamics.fieldRangeDraft = null;
    drawDynamicsScene();
  });
}

for (const control of [
  els.gridToggle,
  els.snapToggle,
  els.orthogonalToggle,
  els.deformedToggle,
  els.momentToggle,
  els.shearToggle,
  els.axialToggle,
  els.stressStrainToggle,
  els.deformScale,
]) {
  control.addEventListener("input", draw);
}

document.addEventListener("keydown", (event) => {
  if (isTextEditingEvent(event)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (state.activeModule === "dynamics") undoDynamics();
    else undo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    if (state.activeModule === "dynamics") redoDynamics();
    else redo();
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (state.activeModule === "dynamics") deleteSelectedDynamicsObject();
    else deleteSelection();
  }
});

function isTextEditingEvent(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  resizeDynamicsCanvas();
});
applyFontSize(localStorage.getItem(AUTH_FONT_SIZE_KEY), false);
syncLoadPanels();
initAuth();
resizeCanvas();
resizeDynamicsCanvas();
syncDynamicsControls();
renderDynamicsSceneLists();
syncUi();

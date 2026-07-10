"use strict";

(function exposeUnits(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Units = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createUnits() {
  const UNIT_FACTORS = Object.freeze({
    "": 1,
    m: 1,
    cm: 1e-2,
    mm: 1e-3,
    "m^2": 1,
    "cm^2": 1e-4,
    "mm^2": 1e-6,
    "m^3": 1,
    "cm^3": 1e-6,
    "mm^3": 1e-9,
    "m^4": 1,
    "cm^4": 1e-8,
    "mm^4": 1e-12,
    N: 1,
    kN: 1e3,
    MN: 1e6,
    "N/m": 1,
    "kN/m": 1e3,
    "MN/m": 1e6,
    "N/mm": 1e3,
    "N/mm^2": 1e6,
    "N*m": 1,
    "kN*m": 1e3,
    "MN*m": 1e6,
    "N*m/m": 1,
    "kN*m/m": 1e3,
    "N*s": 1,
    "kN*s": 1e3,
    Pa: 1,
    kPa: 1e3,
    MPa: 1e6,
    GPa: 1e9,
    kg: 1,
    g: 1e-3,
    "kg/m^3": 1,
    "g/cm^3": 1e3,
    s: 1,
    ms: 1e-3,
    "m/s": 1,
    "km/h": 1 / 3.6,
    "m/s^2": 1,
    "rad/s": 1,
    "rad/s^2": 1,
    C: 1,
    T: 1,
    "N/C": 1,
  });

  const UNIT_ALIASES = Object.freeze({
    m2: "m^2",
    cm2: "cm^2",
    mm2: "mm^2",
    m3: "m^3",
    cm3: "cm^3",
    mm3: "mm^3",
    m4: "m^4",
    cm4: "cm^4",
    mm4: "mm^4",
    "m/s2": "m/s^2",
    "rad/s2": "rad/s^2",
    "kg/m3": "kg/m^3",
    "g/cm3": "g/cm^3",
  });

  function normalizeUnit(unit) {
    const normalized = String(unit || "")
      .trim()
      .replaceAll("²", "^2")
      .replaceAll("³", "^3")
      .replaceAll("⁴", "^4")
      .replaceAll("·", "*")
      .replaceAll("⋅", "*")
      .replace(/\s+/g, "");
    return UNIT_ALIASES[normalized] || normalized;
  }

  function unitFactor(unit) {
    const normalized = normalizeUnit(unit);
    if (!Object.prototype.hasOwnProperty.call(UNIT_FACTORS, normalized)) {
      throw new Error(`不支持的单位：${unit || "(空)"}`);
    }
    return UNIT_FACTORS[normalized];
  }

  function parseQuantity(value, defaultUnit = "") {
    if (typeof value === "number") return value * unitFactor(defaultUnit);
    if (value && typeof value === "object" && "value" in value) {
      const numeric = Number(value.value);
      if (!Number.isFinite(numeric)) throw new Error(`无效物理量：${value.value}`);
      return numeric * unitFactor(value.unit || defaultUnit);
    }
    const text = String(value ?? "0").trim();
    const match = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(.*?)\s*$/i);
    if (!match) throw new Error(`无效物理量：${text}`);
    const numeric = Number(match[1]);
    if (!Number.isFinite(numeric)) throw new Error(`无效物理量：${text}`);
    return numeric * unitFactor(match[2] || defaultUnit);
  }

  function quantityToText(value, defaultUnit) {
    if (value == null) return `0 ${defaultUnit}`;
    if (typeof value === "number") return `${value} ${defaultUnit}`;
    if (typeof value === "object" && "value" in value) return `${value.value} ${value.unit || defaultUnit}`;
    return String(value);
  }

  return { UNIT_FACTORS, normalizeUnit, unitFactor, parseQuantity, quantityToText };
});

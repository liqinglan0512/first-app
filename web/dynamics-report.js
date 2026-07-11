"use strict";

(function exposeDynamicsReport(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DynamicsReport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDynamicsReport() {
  const DEFAULT_OPTIONS = Object.freeze([
    "kinetic",
    "potential",
    "total_energy",
    "momentum",
    "angular_momentum",
    "lorentz_force",
    "velocity",
    "acceleration",
    "inertia",
    "displacement",
    "trajectory_equation",
    "trajectory",
  ]);

  const OBJECT_KIND_LABELS = Object.freeze({
    particle: "质点",
    rod: "杆",
    circle: "圆",
    ring: "圆环",
    rectangle: "矩形",
    custom: "任意形状",
  });

  const FIELD_KIND_LABELS = Object.freeze({
    zero: "零场",
    gravity: "重力场",
    electric: "电场",
    magnetic: "磁场",
  });

  const FIELD_RANGE_LABELS = Object.freeze({
    global: "全局范围",
    rectangle: "矩形范围",
    circle: "圆形范围",
    custom: "任意多边形范围",
  });

  function finiteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function formatNumber(value) {
    const numeric = finiteNumber(value);
    if (Math.abs(numeric) < 1e-12) return "0";
    const magnitude = Math.abs(numeric);
    if (magnitude >= 1e6 || magnitude < 1e-5) return numeric.toExponential(4);
    return numeric.toFixed(6).replace(/\.?0+$/, "");
  }

  function selectedOptions(options) {
    if (options instanceof Set) return options;
    if (Array.isArray(options)) return new Set(options);
    return new Set(DEFAULT_OPTIONS);
  }

  function trajectoryEquation(model) {
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

  function buildResultLines({ result, fields = [], forces = [], options } = {}) {
    if (!result || !Array.isArray(result.objectResults)) return ["暂无结果"];
    const enabled = selectedOptions(options);
    const lines = [
      "求解模块：二维多对象独立质点动力学",
      `场景：${result.objectResults.length} 个对象，${fields.length} 个场，${forces.length} 个外加作用力`,
      `仿真总时长：${formatNumber(result.duration)} s`,
      `用户请求步长：${formatNumber(result.requestedTimeStep)} s`,
      `实际采用步长：${formatNumber(result.timeStep)} s`,
      `单对象积分步数：${result.stepCount}，总样本数：${result.totalSampleCount}`,
    ];
    if (enabled.has("kinetic")) lines.push(`系统总动能：${formatNumber(result.totals?.kineticEnergy)} J`);
    if (enabled.has("potential")) {
      lines.push(`系统总势能：${formatNumber(result.totals?.potentialEnergy)} J（坐标原点为零势能参考）`);
    }
    if (enabled.has("total_energy")) {
      lines.push(`系统机械能：${formatNumber(result.totals?.mechanicalEnergy)} J`);
    }
    if (enabled.has("momentum")) {
      lines.push(
        `系统总动量：px=${formatNumber(result.totals?.momentumX)} kg·m/s, ` +
          `py=${formatNumber(result.totals?.momentumY)} kg·m/s`
      );
    }
    if (enabled.has("angular_momentum")) {
      lines.push(
        `系统关于全局原点的轨道角动量：Lz=${formatNumber(result.totals?.orbitalAngularMomentum)} kg·m^2/s`
      );
    }
    for (const diagnostic of result.diagnostics || []) {
      lines.push(`[${diagnostic.level === "warning" ? "警告" : "提示"}] ${diagnostic.message}`);
    }
    for (const item of result.objectResults) {
      lines.push("", `${item.name || item.objectId}：`);
      if (enabled.has("kinetic")) lines.push(`  动能：${formatNumber(item.kineticEnergy)} J`);
      if (enabled.has("potential")) lines.push(`  势能：${formatNumber(item.potentialEnergy)} J`);
      if (enabled.has("total_energy")) lines.push(`  机械能：${formatNumber(item.mechanicalEnergy)} J`);
      if (enabled.has("momentum")) {
        lines.push(`  动量：(${formatNumber(item.momentum?.x)}, ${formatNumber(item.momentum?.y)}) kg·m/s`);
      }
      if (enabled.has("angular_momentum")) {
        lines.push(`  关于全局原点的轨道角动量 Lz：${formatNumber(item.orbitalAngularMomentum)} kg·m^2/s`);
      }
      if (enabled.has("lorentz_force")) {
        lines.push(
          `  洛伦兹力：Fx=${formatNumber(item.lorentzForce?.x)} N, Fy=${formatNumber(item.lorentzForce?.y)} N`
        );
      }
      if (enabled.has("velocity")) {
        lines.push(`  速度：vx=${formatNumber(item.final?.vx)} m/s, vy=${formatNumber(item.final?.vy)} m/s`);
      }
      if (enabled.has("acceleration")) {
        lines.push(`  加速度：ax=${formatNumber(item.ax)} m/s^2, ay=${formatNumber(item.ay)} m/s^2`);
      }
      if (enabled.has("inertia")) {
        lines.push(`  几何质心转动惯量估算：I=${formatNumber(item.inertia)} kg·m^2（不参与当前平动积分）`);
      }
      if (enabled.has("displacement")) {
        lines.push(
          `  位移：Δx=${formatNumber(finiteNumber(item.final?.x) - finiteNumber(item.x0))} m, ` +
            `Δy=${formatNumber(finiteNumber(item.final?.y) - finiteNumber(item.y0))} m`
        );
      }
      if (enabled.has("trajectory_equation")) {
        const equation = trajectoryEquation(item.trajectoryModel);
        lines.push(`  ${equation.x}`);
        lines.push(`  ${equation.y}`);
      }
    }
    if (enabled.has("trajectory")) lines.push("", "位移轨迹：已在建模区生成多对象动态演示。");
    return lines;
  }

  function buildResultText(context) {
    return `${buildResultLines(context).join("\n")}\n`;
  }

  function objectLines(objects) {
    const lines = ["对象定义"];
    if (!objects.length) return lines.concat("- 暂无对象。", "");
    for (const object of objects) {
      const kind = object.geometry?.kind || object.kind || "particle";
      const mass = object.massProperties?.mass ?? object.mass;
      const density = object.massProperties?.density ?? object.density;
      const charge = object.massProperties?.charge ?? object.charge;
      const state = object.initialState || object;
      const sizeA = object.geometry?.sizeA ?? object.sizeA;
      const sizeB = object.geometry?.sizeB ?? object.sizeB;
      const sizeC = object.geometry?.sizeC ?? object.sizeC;
      lines.push(`- ${object.name || object.id}（${object.id}）：几何=${OBJECT_KIND_LABELS[kind] || kind}，动力学模型=${object.dynamicsModel || "particle2d"}`);
      lines.push(
        `-   质量=${formatNumber(mass)} kg，密度=${formatNumber(density)} kg/m^3，电荷量=${formatNumber(charge)} C`
      );
      lines.push(
        `-   尺寸 A=${formatNumber(sizeA)} m，尺寸 B/半径=${formatNumber(sizeB)} m，尺寸 C=${formatNumber(sizeC)} m`
      );
      lines.push(
        `-   初始位置 x0=${formatNumber(state.x)} m，y0=${formatNumber(state.y)} m；` +
          `初始速度 vx0=${formatNumber(state.vx ?? state.vx0)} m/s，vy0=${formatNumber(state.vy ?? state.vy0)} m/s`
      );
    }
    lines.push("");
    return lines;
  }

  function fieldRangeDescription(field) {
    const rangeType = field.rangeType || "global";
    if (rangeType === "rectangle") {
      return `中心=(${formatNumber(field.centerX)}, ${formatNumber(field.centerY)}) m，宽=${formatNumber(field.width)} m，高=${formatNumber(field.height)} m`;
    }
    if (rangeType === "circle") {
      return `圆心=(${formatNumber(field.centerX)}, ${formatNumber(field.centerY)}) m，半径=${formatNumber(field.radius)} m`;
    }
    if (rangeType === "custom") {
      return `多边形顶点数=${Array.isArray(field.path) ? field.path.length : 0}`;
    }
    return "作用于整个二维建模空间";
  }

  function fieldLines(fields) {
    const lines = ["场定义"];
    if (!fields.length) return lines.concat("- 无外场。", "");
    for (const field of fields) {
      const unit = field.kind === "electric" ? "N/C" : field.kind === "magnetic" ? "T" : "m/s^2";
      const direction = field.kind === "magnetic"
        ? `方向=${field.magneticDirection === "in" ? "垂直纸面向内" : "垂直纸面向外"}`
        : `方向角=${formatNumber(field.angle)}°`;
      lines.push(
        `- ${field.id || "未编号场"}: ${FIELD_KIND_LABELS[field.kind] || field.kind}，` +
          `大小=${formatNumber(field.magnitude)} ${unit}，${direction}`
      );
      lines.push(
        `-   范围=${FIELD_RANGE_LABELS[field.rangeType || "global"] || field.rangeType}；${fieldRangeDescription(field)}`
      );
    }
    lines.push("");
    return lines;
  }

  function forceLines(forces) {
    const lines = ["外力定义"];
    if (!forces.length) return lines.concat("- 无外加作用力。", "");
    for (const force of forces) {
      if (force.type === "impulse") {
        lines.push(
          `- ${force.id || "未编号作用"}: 目标=${force.targetId}，瞬时冲量 J=${formatNumber(force.magnitude)} N·s，` +
            `分量=(${formatNumber(force.x)}, ${formatNumber(force.y)}) N·s，方向角=${formatNumber(force.angle)}°`
        );
      } else {
        const duration = finiteNumber(force.duration) > 0 ? `${formatNumber(force.duration)} s` : "持续至求解结束";
        lines.push(
          `- ${force.id || "未编号作用"}: 目标=${force.targetId}，持续力 F=${formatNumber(force.magnitude)} N，` +
            `分量=(${formatNumber(force.x)}, ${formatNumber(force.y)}) N，开始=${formatNumber(force.start)} s，持续=${duration}`
        );
      }
    }
    lines.push("");
    return lines;
  }

  function conclusionLines(result) {
    const lines = ["计算结论"];
    lines.push(
      `- 本次对 ${result.objectResults.length} 个对象分别积分到 t=${formatNumber(result.duration)} s，共生成 ${result.totalSampleCount} 个状态样本。`
    );
    for (const item of result.objectResults) {
      const displacement = Math.hypot(
        finiteNumber(item.final?.x) - finiteNumber(item.x0),
        finiteNumber(item.final?.y) - finiteNumber(item.y0)
      );
      const speed = Math.hypot(finiteNumber(item.final?.vx), finiteNumber(item.final?.vy));
      lines.push(
        `- ${item.name || item.objectId}: 末速度大小=${formatNumber(speed)} m/s，` +
          `合位移=${formatNumber(displacement)} m，末动能=${formatNumber(item.kineticEnergy)} J。`
      );
    }
    lines.push("- 当前结论基于二维独立质点平动模型；对象之间不发生碰撞、接触、约束或相互作用。");
    lines.push("- 数值结果应结合减小时间步长后的收敛性检查及解析解/成熟软件进行独立复核。");
    lines.push("");
    return lines;
  }

  function buildReportText({ objects = [], fields = [], forces = [], result, options, generatedAt } = {}) {
    if (!result) throw new Error("缺少动力学求解结果，无法生成计算书。");
    const timestamp = generatedAt || new Date().toISOString();
    const lines = [
      "动力学计算书",
      `生成时间：${timestamp}`,
      "求解模块：二维多对象独立质点动力学",
      "单位制：SI（m、s、kg、N、C、T、J）",
      "",
      ...objectLines(objects),
      ...fieldLines(fields),
      ...forceLines(forces),
      "控制方程与符号",
      "- 平动方程：m·a=ΣF",
      "- 瞬时冲量：Δv=J/m",
      "- 重力场：F_g=m·g",
      "- 电场力：F_E=qE",
      "- 洛伦兹力：F_B=q(v×B)；二维分量 Fx=q·vy·Bz，Fy=-q·vx·Bz",
      "- 动能：E_k=1/2·m(vx^2+vy^2)",
      "- 动量：p=m·v；关于全局原点的轨道角动量 Lz=m(x·vy-y·vx)",
      "",
      "数值积分过程",
      "1. 将对象、场、冲量和持续力全部换算到 SI 单位。",
      "2. 对每个对象先叠加初始冲量，按 Δv=J/m 修正初速度。",
      "3. 在每个采样时刻判断对象是否位于各个场的空间范围，并叠加重力、电场力、磁场力和持续力。",
      "4. 以状态 Y=[x,y,vx,vy] 建立一阶方程 dY/dt=[vx,vy,ax,ay]。",
      "5. 四阶 Runge-Kutta：k1=f(Yn,tn)，k2=f(Yn+h·k1/2,tn+h/2)，k3=f(Yn+h·k2/2,tn+h/2)，k4=f(Yn+h·k3,tn+h)。",
      "6. 状态更新：Yn+1=Yn+h(k1+2k2+2k3+k4)/6，最后一步自动缩短以准确落在总时长。",
      "7. 由末状态计算速度、加速度、位移、动能、势能、动量、轨道角动量和洛伦兹力。",
      "",
      "求解结果",
      ...buildResultLines({ result, fields, forces, options }),
      "",
      ...conclusionLines(result),
      "适用范围与限制",
      "- 当前动力学核心按对象逐个独立求解，不包含对象间引力、电力、碰撞、接触和运动学约束。",
      "- 杆、圆、圆环、矩形和任意形状当前使用其质心作为质点参与平动积分；转动惯量只作几何估算，不参与角运动积分。",
      "- 有限区域重力场或电场的势能参考在边界处不连续，相关机械能仅作局部估算。",
      "- RK4 是数值积分方法；过大的时间步长会降低轨迹和能量精度，过小步长会触发浏览器样本上限。",
      "- 本计算书用于学习、演示、科研探索和原型验证，不应未经独立复核直接用于工程安全决策。",
      "",
    ];
    return lines.join("\n");
  }

  return {
    DEFAULT_OPTIONS,
    formatNumber,
    trajectoryEquation,
    buildResultLines,
    buildResultText,
    buildReportText,
  };
});

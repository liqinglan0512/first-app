# Computational Mechanics Solver v1.3.2 功能边界矩阵

## 审计口径

- 源码审计基线：`87b683d11bf028ca2db419ca607e5f915f15288f`。
- 报告修复审计对象：当前本地分支 `work/v1.3.2-manual-homepage` 的未部署改动。
- “已实现”必须同时有真实计算/数据代码证据，以及测试或可复核运行证据。
- 仅存在按钮、字段、图标或显示几何，不视为力学实现。
- 用户附件只有一个静力学案例截图和一个动力学案例截图；截图可证明界面行为，不能替代解析解验证。

# 已实现

## 静力学

| 功能 | 状态 | 后端证据 | 前端证据 | 测试证据 | 案例证据 | 说明 |
|---|---|---|---|---|---|---|
| 二维梁柱单元 | 已实现 | `solver.py: _local_frame_stiffness`；DOF 顺序为 `[ux_i,uy_i,rz_i,ux_j,uy_j,rz_j]` | `app.js: buildProject` 输出 `frame` | `test_solver.py` 悬臂端力、简支均布荷载 | `examples/cantilever_beam.json`、`simply_supported_uniform_beam.json` | Euler-Bernoulli 二维线弹性、小变形梁柱单元。 |
| 平面桁架单元 | 已实现 | `solver.py: _local_truss_stiffness` 仅提供轴向 `EA/L`；`preprocess.py` 限制杆中荷载 | `project-schema.js` 和 `project-adapter.js` 支持 `truss` | `test_truss_element.py` 验证 `u=PL/EA` 和轴力 | 标准单杆解析算例 | 每节点仍占 3 个全局 DOF，但无刚度且无荷载的自由 DOF 会被过滤。 |
| 单端弯矩释放 | 已实现 | `solver.py: _apply_moment_releases_to_stiffness/_load` 使用静力凝聚 | i/j 端铰接复选框写入 release flag | `test_moment_release.py` 固端-铰端均布荷载解析反力 | 标准固铰梁算例 | 仅普通 `frame` 单端释放；双端释放明确拒绝。 |
| 杆件中间集中力 | 已实现 | `point_global` 经 Hermite/线性形函数形成一致节点荷载 | `projectElementLoads` 将杆上作用转换为 `point_global` | `test_point_element_load.py`、`test_point_global_webapp.py` | 简支梁跨中力闭式解 | 支持全局 `Fx/Fy` 和位置比例 `ratio∈[0,1]`。 |
| 杆件中间集中力偶 | 已实现 | `solver.py: _consistent_point_load` 以形函数导数形成 `mz` 等效荷载 | 与杆中集中作用共用荷载编辑数据 | `test_midspan_point_moment_satisfies_global_equilibrium` | 集中力偶整体平衡算例 | 单点集中力偶，不等同于沿杆均布力偶。 |
| 均布荷载 | 已实现 | `uniform_local`；8 点 Gauss 一致荷载积分 | 矩形分布荷载映射到 `uniform_local` | `test_simply_supported_uniform_load_reactions_are_symmetric` | 简支梁均布荷载 | 局部 x/y 方向均可输入。 |
| 三角/梯形线性分布荷载 | 已实现 | `linear_local` 在 i/j 端线性插值 | 三角/线性分布映射到端值 | `test_linear_element_load_reactions_match_static_equilibrium` | 线性荷载整体平衡算例 | 三角荷载是某一端值为 0 的线性分布特例。 |
| 多项式任意分布荷载 | 已实现 | `polynomial_local` 与 `_evaluate_axis_load` | 任意函数入口保存多项式系数 | `test_polynomial_element_load_supports_curve_input` | 多项式荷载自动测试 | 当前是归一化杆长坐标上的多项式，不是通用符号函数解释器。 |
| 同一杆件多个集中作用叠加 | 已实现 | 求解器逐项累加 `loads`、`element_fixed_loads` 和积分事件 | 前端数组允许多条 element point load | `test_multiple_point_forces_on_one_element_are_all_assembled`、HTTP 累加测试 | 多点荷载回归算例 | 不会覆盖前一条荷载。 |
| 位移、转角、支座反力和杆端内力 | 已实现 | `Frame2DSolver.solve`、`_map_node_vectors/_map_reactions/_map_element_forces` | 结果栏格式化为工程量 | 多个 `test_solver.py`、`test_webapp.py` | 标准梁算例 | 内部统一使用 SI，界面/报告转换为 mm、kN、kN·m。 |
| 弯矩图、剪力图、轴力图 | 已实现 | `_map_element_diagrams` 沿杆生成 N/V/M 数据并处理点事件跳变 | 分离坐标图和画布结果渲染 | 跨中集中力最大弯矩、线性荷载平衡测试 | 用户 `static-triangle-frame-case.png` 仅证明绘图界面 | 采样/插值图用于可视化，不替代连续解析表达式证明。 |
| 模型诊断 | 已实现 | `diagnostics.py: diagnose_project`；`engine.py` 在求解前阻止 error | 结果区域展示节点、单元、DOF、静定指数和问题 | `test_diagnostics.py`、`test_engine_diagnostics.py` | 零长度、孤立节点和正常模型测试 | 静定指数是拓扑筛查，不是刚度秩证明。 |
| 单位换算 | 已实现 | `units.py: to_si/from_si`；`project_io.py` 在边界转换 | `web/units.js` 与项目 Schema 解析显示单位 | `test_units.py`、`units_frontend.test.js` | 工程 JSON 示例 | 求解器内部只保存 SI 数值。 |
| 中文 PDF 计算书 | 已实现（本地未部署修复） | `report.py` 使用 ReportLab、中文字体回退、结构化文本和独立图片页 | `app.js` 的报告按钮调用 `/api/report` | `test_report.py`、`test_solver.py`；真实 HTTP 文本提取 | 本地生成的静力学 3 页视觉预览 | 包含输入、公式、推导、结果、结论和限制；不再输出原始 JSON。 |

## 动力学

| 功能 | 状态 | 核心代码证据 | 前端证据 | 测试证据 | 案例证据 | 说明 |
|---|---|---|---|---|---|---|
| 二维独立质点动力学 | 已实现 | `dynamics-core.js: simulateObject/simulateScene`，状态为 `(x,y,vx,vy)` | 动力学工作区和求解对话框 | `dynamics_core.test.js` 匀速、重力、电场、磁场 | 用户 `dynamics-magnetic-case.png` | 这是独立质点平动，不是完整刚体/多体动力学。 |
| 多对象场景 | 已实现（对象彼此独立） | `simulateScene` 对 `objects.map(simulateObject)` 并汇总结果 | 场景管理可添加多个对象 | 多对象诊断分支和 Schema/适配器测试 | 用户截图只展示 1 个对象 | 数量可多于 1，但没有对象间相互作用。 |
| 重力场 | 已实现 | `accelerationAt` 直接叠加 `g`；`potentialEnergyAt` 计算 `-m g·r` | 环境场对话框支持大小、角度和范围 | 重力抛体数值检查 | 内部标准算例 | 有限区域场跨边界时势能参考不连续。 |
| 电场 | 已实现 | `F=qE`、`a=qE/m`、势能 `-qE·r` | 电场大小、方向、范围 | 电场匀加速数值检查 | 内部标准算例 | 只作用于具有电荷量的对象。 |
| 磁场 | 已实现 | `Fx=q vy Bz`、`Fy=-q vx Bz` | 点/叉方向与范围绘制 | 磁场周期和 RK4 收敛阶检查 | 用户 `dynamics-magnetic-case.png` | 二维均匀 `Bz`，不计算磁偶极或空间梯度。 |
| 全局、矩形、圆形、任意多边形场 | 已实现 | `pointInField/pointInPolygon` | 事务式场放置、预览、取消、撤销 | `dynamics_field_placement.test.js`、`project_schema.test.js` | 用户磁场截图为全局场 | 任意范围是折线闭合多边形，不是解析曲线边界。 |
| 多场叠加 | 已实现 | `accelerationAt` 和 `potentialEnergyAt` 遍历全部 fields 累加 | 场景列表显示“复合场 N” | 核心与 Schema 测试覆盖字段数组 | 未提供多场用户案例 | 各场范围可不同。 |
| 瞬时力/冲量 | 已实现 | `impulseForObject`、`applyImpulse: Δv=J/m` | 外加作用力对话框的“瞬时力” | 冲量数值检查 | 用户磁场案例显示一个 J 作用 | 仅在初始时刻施加，不支持任意时刻冲量事件。 |
| 持续力 | 已实现 | `continuousForceAt` 按 start/duration 参与每步合力 | 可设置开始时间和持续时间 | 分段持续力数值检查 | 未提供用户案例 | `duration=0` 表示作用到求解结束；事件时间尚未强制切分积分步。 |
| RK4 时间积分 | 已实现 | `rk4Step` 明确计算 k1/k2/k3/k4 | 步长和总时长输入 | 磁场误差比验证四阶收敛特征 | 用户磁场案例步长 0.02 s | 最后一步会缩短到总时长；尚无自适应误差控制。 |
| 轨迹记录和动画 | 已实现 | 每步保存 `samples`；`sampleAtTime` | `startDynamicsAnimation/drawDynamicsTrajectory` | 核心采样检查 | 用户磁场圆轨迹截图 | 动画是保存样本的回放，不重新求解。 |
| 动能、势能、机械能、动量、轨道角动量、洛伦兹力 | 已实现 | `simulateObject/simulateScene` 直接计算并汇总 | 求解选项和结果文本 | `dynamics_core.test.js`、`dynamics_report.test.js` | 用户磁场结果显示 50 J 和总动量 | 角动量是关于全局原点的轨道角动量，不是刚体自转角动量。 |
| 中文动力学报告 | 已实现（本地未部署修复） | `dynamics-report.js` 生成输入、公式、RK4、结果、结论；`report.py` 输出 PDF | 界面结果和 PDF 共用 `buildResultText` | `dynamics_report.test.js`、`test_report.py`；真实 HTTP 提取 | 用户示例结果已纳入格式测试 | 图片置于文字报告之后的独立页面，文字可搜索、复制。 |

# 部分实现或仅预留

| 功能 | 当前状态 | 已实现部分 | 缺失部分 | 证据 |
|---|---|---|---|---|
| 高刚度近似杆 | 部分实现 | `rigid` 将 `EA/EI` 乘 `1,000,000` | 不是真正的刚性约束；可能恶化条件数 | `solver.py: RIGID_STIFFNESS_FACTOR`、`test_rigid_element_is_much_stiffer_than_frame_element` |
| 弧形、T 形、直角、任意形状杆 | 仅显示/项目数据 | Canvas 可画曲线、T 形符号、折线路径并保存几何 | 求解时只用两端节点的直线梁柱刚度，忽略路径、曲率和 T 形拓扑 | `app.js: drawElementShape`；`project-adapter.js: solverElementType` |
| 旋转支座 | 仅显示角度 | 支座图标和项目数据保存 angle | 后端约束仍是全局 `ux/uy/rz` 布尔值，没有斜向约束方程 | `models.Node.restraints`、`buildProject`、`Frame2DSolver.solve` |
| 应力-应变结果 | 估算 | 报告按 `σ=N/A+M c/I`、`ε=σ/E` 给出组合正应力估算 | `c` 采用 `sqrt(A)/2`；无真实截面纤维、剪应力、屈服/本构积分 | `report.py: _append_stress_strain` |
| 隔离体求解 | 部分实现 | 可按当前选择筛选节点、杆件和荷载后求解 | 不自动施加切口内力，不等同于完整自由体图平衡提取 | `app.js: scopedModel` |
| 动力学杆、圆、圆环、矩形、任意形状 | 显示几何 + 质点平动 | 尺寸、路径、质量和转动惯量估算可保存/显示 | 全部按质心质点积分；形状不参与碰撞、转动或受力分布 | `normalizeObject`、`inertiaEstimate`、`simulateObject` |
| 动力学刚体和材料属性 | 仅界面预留 | 可输入 `rigid`、密度、`materialE` | `dynamics-core.js` 未使用刚体标志、密度和弹性模量建立变形/转动方程 | `app.js` 对象参数；`normalizeObject`/`simulateObject` |
| 转动惯量 | 估算输出 | 按简单几何公式计算 I | 不参与角速度/角加速度积分 | `dynamics-core.js: inertiaEstimate` |
| 轨迹方程 | 条件实现 | 全程恒加速度时输出二次解析式，否则明确数值积分 | 磁场、分区场和分段外力没有符号解析方程 | `trajectoryModel`、`dynamics-report.js: trajectoryEquation` |
| 动力学报告图片 | 已实现基础 | 报告可附当前画布图 | 尚无逐对象图表、能量-时间曲线或关键帧表格 | `downloadDynamicsReport`、`build_text_report_pdf` |

# 未实现

| 功能 | 证据 | 对用户的正确表述 |
|---|---|---|
| 普通梁柱双端弯矩释放 | `preprocess.py` 与 `project-schema.js` 明确拒绝 | v1.3.2 仅支持单端弯矩释放；双端释放请拆分模型或使用适当桁架理想化。 |
| 均布力偶 | `project-schema.js` 和 `app.js: projectElementLoads` 明确报错 | 可以施加集中力偶，不能施加沿杆连续分布的均布力偶。 |
| PINN 求解 | `engine.py: PinnSolverPlaceholder.solve` 必然抛出 `SolverError` | PINN 只是接口预留，不是可用求解器。 |
| 对象间碰撞、接触、摩擦、约束 | `simulateScene` 逐对象独立积分，无接触检测 | 当前对象彼此穿透且互不影响。 |
| 对象间引力或电力 | 合力只来自 fields 和指定 targetId 的 forces | 当前没有两体/多体相互作用。 |
| 真正刚体转动、角速度、角加速度和力矩积分 | 状态只有 `x,y,vx,vy` | 当前只计算质心平动和轨道角动量；刚体自转功能未开放。 |
| 云端账户、云项目和跨设备同步 | 账户数据只在 `localStorage`，后端无用户 API/数据库 | “登录/注册”是本地配置选择，不是云端认证。 |
| 工程安全认证 | 无规范校核、荷载组合、材料非线性或认证流程 | 软件用于学习、演示、科研探索和原型验证，结果必须独立复核。 |

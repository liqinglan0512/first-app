# v1.3.2 公开说明书构建说明

## 产物

- 可编辑 DOCX：`Computational-Mechanics-Solver-v1.3.2-用户与技术说明书.docx`
- 公开 PDF：`../../../web/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`
- 可审查源稿：`manual-source.md`
- 封面资产：`assets/cover-v1.3.2.png`

`manual-source.md` 是公开内容的源文件。DOCX 与 PDF 是生成产物，不应直接手工修改后再覆盖源稿。

## 构建

安装文档依赖：

```powershell
python -m pip install -r requirements-docs.txt
```

生成 DOCX：

```powershell
python tools/build_public_manual.py
```

使用 Microsoft Word 更新目录、交叉引用和公式，并导出 PDF：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export_public_manual.ps1
```

运行结构与公开内容边界测试：

```powershell
python -m unittest tests.test_public_manual -v
```

## 当前版式基线

- A4，26 页。
- 封面使用 `web/welcome-bg.jpg`，按比例裁切后铺满整页。
- 目录 80 个一、二级条目，共 2 页。
- 20 个 Word 公式对象、10 个表格、3 张正文案例图。
- 正文从第一章开始，使用真实 Word 多级编号。

## 案例证据门禁

公开手册不得把仓库示例冒充为用户案例。当前用户案例证据为：

| 案例 | 等级 | 状态 |
|---|---|---|
| 静力学案例一 | B | 已有三角形平面刚架截图；无工程文件，无法完全复算 |
| 动力学案例一 | B | 圆周轨迹原图已嵌入；无工程文件，无法完全复算 |
| 动力学案例二 | B | 螺旋状轨迹原图和结果文本已嵌入；无工程文件，无法完全复算 |

用户于 2026-07-12 明确取消第二个静力学用户案例，并确认两张动力学截图中的头像和账号均为虚拟信息，可以直接写入公开 DOCX。说明书因此收录 1 个用户静力学案例和 2 个用户动力学案例。

完整核验记录见 `../../../release/v1.3.2/case-verification.md`。

页面、结构、哈希、自动测试和剩余门禁记录见 `QA-REPORT.md`。

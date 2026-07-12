# v1.3.2 公开说明书构建说明

## 保留资产

- 公开 PDF：`../../../web/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`
- 唯一维护源稿：`manual-source.md`
- 封面资产：`assets/cover-v1.3.2.png`
- 用户案例图片：`assets/static-triangle-frame-case.png`、`assets/dynamics-magnetic-case.png`、`assets/dynamics-spiral-case.png`

`manual-source.md` 是公开内容的唯一维护源。DOCX 只允许作为本地生成和 Word 导出的中间文件，不提交仓库；网站 PDF 是唯一公开发布副本。

该说明书适用于 v1.3.2，是 v1.5.0 页面保留的历史版本说明书。它不完整覆盖 v1.5.0 新增的云账户、Plus/Pro、内测通道、碰撞、刚体转动、约束轨道和变化场；这些功能以主页更新公告和 `RELEASE_NOTES_v1.5.0.md` 为准。

## 构建

安装文档依赖：

```powershell
python -m pip install -r requirements-docs.txt
```

在本地生成临时 DOCX：

```powershell
python tools/build_public_manual.py
```

使用 Microsoft Word 更新目录、交叉引用和公式，并导出 PDF：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export_public_manual.ps1
```

导出完成后，删除或保留在 Git 忽略范围内，不要提交 DOCX。运行维护源、PDF 和公开内容边界测试：

```powershell
python -m unittest tests.test_public_manual -v
```

## PDF 版式基线

- A4，26 页。
- 封面使用 `web/welcome-bg.jpg`，按比例裁切后铺满整页。
- 目录 80 个一、二级条目，共 2 页。
- 20 个 Word 公式对象、10 个表格、3 张正文案例图。
- 正文从第一章开始，使用真实 Word 多级编号。

## 案例证据边界

公开手册不得把仓库示例冒充为用户案例。当前用户案例证据为：

| 案例 | 等级 | 状态 |
|---|---|---|
| 静力学案例一 | B | 已有三角形平面刚架截图；无工程文件，无法完全复算 |
| 动力学案例一 | B | 圆周轨迹原图已嵌入；无工程文件，无法完全复算 |
| 动力学案例二 | B | 螺旋状轨迹原图和结果文本已嵌入；无工程文件，无法完全复算 |

用户于 2026-07-12 明确取消第二个静力学用户案例，并确认两张动力学截图中的头像和账号均为虚拟信息，可以直接写入公开 DOCX。说明书因此收录 1 个用户静力学案例和 2 个用户动力学案例。

公开说明书不得把仓库示例冒充为用户案例。当前自动测试直接验证唯一 PDF、维护源、必要图片、页面数量、关键公开内容和内部信息边界，不依赖已清理的旧 release QA 文件。

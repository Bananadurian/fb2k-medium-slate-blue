# SMP / JSplitter API Reference

本项目的权威 API 文档由 **foo_uie_jsplitter** 组件提供，以 JSDoc 注解源码和生成的 HTML 文档形式存在。

## 权威 API 来源

### JSDoc HTML（推荐，浏览器打开）
```
user-components-x64/foo_uie_jsplitter/docs/html/index.html
```
从当前 `docs/` 目录访问：[`../../../user-components-x64/foo_uie_jsplitter/docs/html/index.html`](../../../user-components-x64/foo_uie_jsplitter/docs/html/index.html)

~70+ 页面，覆盖所有 SMP 命名空间、类、方法和回调。

### JSDoc 源文件（IDE 查找 / 全文搜索）

| 文件 | 覆盖范围 |
|:---|:---|
| `foo_uie_jsplitter.js` | **核心 SMP API** — `fb`、`gdi`、`plman`、`utils`、`window`、`console`、`FbMetadbHandle`、`FbMetadbHandleList`、`FbTitleFormat`、`GdiGraphics`、`GdiBitmap`、`MenuObject`、`ContextMenuManager`、`FbTooltip`、`FbProfiler`、`FbPlaybackQueueItem`、`FbFileInfo` 等 |
| `jsplitter.js` | **JSplitter 扩展** — `PanelObject`、`ButtonObject`、`window.GetPanel`、`window.CreateButton`、`window.IsTransparent` 等 |
| `d2d.js` | **Direct2D API** — `D2DBitmap`、`D2DFont`、`D2DGraphics`、`D2DEffect`、几何、画刷、HLSL 编译 |
| `Callbacks.js` | **~50+ 回调签名** — `on_paint`、`on_size`、`on_mouse_*`、`on_playback_*`、`on_playlist_*`、`on_key_*`、拖放事件等 |
| `Flags.js` | **所有常量/枚举** — 文本格式标志、插值模式、平滑模式、文本渲染提示、颜色类型、字体样式、虚拟键码等 |
| `Effects.js` | **30+ D2D 效果** — GaussianBlur、Shadow、ColorMatrix、Composite、Transform 等，含 CLSID 和属性索引 |
| `Matrix.js` | **矩阵变换** — `Matrix3x2`（2D）和 `Matrix4x4`（3D）的创建、旋转、缩放、平移、斜切 |
| `performance.js` | **性能 API** — `performance.now()`、`mark()`、`measure()`、`PerformanceObserver` |
| `Helpers.js` | **颜色工具** — `RGBA()`、`RGB()`、`toRGB()`、148 种预定义颜色常量 |
| `Codepages.js` | **编码表** — `CharsetMapping`（450+ 字符集名 → 代码页号） |
| `foo_ui_hacks.js` | **UI Hacks 接口** — `IUIHacks`、`IMasterVolume`、`IAero`、`IConstraints` |
| `Notes & Hints.txt` | **实用提示** — 常见陷阱（`on_size` 中禁止 `Repaint`、不得重赋值 `gr`、`on_paint` 外创建对象等） |

所有源文件位于：`user-components-x64/foo_uie_jsplitter/docs/js/`

### 官方 SMP 文档
- https://theqwertiest.github.io/foo_spider_monkey_panel/assets/generated_files/docs/html/index.html

## 快速搜索技巧

1. **查找 API 签名**：打开 `foo_uie_jsplitter.js`，搜索方法名（如 `NotifyOthers`、`GetAlbumArtAsyncV2`）
2. **查看回调列表**：打开 `Callbacks.js`，按类别浏览
3. **查找常量值**：打开 `Flags.js`，搜索枚举名
4. **查看 D2D 效果参数**：打开 `Effects.js`，搜索效果名

## 项目专属文档

以下文档不在 JSDoc 覆盖范围内，是项目特有的：

- `smp-copilot.md` — 不可协商的编码规则、必需模式、资源生命周期管理
- `patterns-recipes.md` — 项目专属代码模式（SECTIONS 布局、悬停状态机、文本预设、背景控制器、透明模式）
- `project-map.md` — 脚本清单、库依赖链、文件命名约定

**不要**将 JSDoc 中已有的 API 参考内容复制到项目文档中。JSDoc 是 API 签名的唯一权威来源。

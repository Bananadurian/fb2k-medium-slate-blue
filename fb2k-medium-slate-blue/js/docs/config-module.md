# Theme 配置模块（THEME_CONFIG）

## 1. 概述

`js/lib/config.js` 是主题的运行时配置层，采用 schema 驱动。当前注册的配置项只有 `render.drawMode`（`0` = GDI+，`1` = Direct2D）。

配置来源分两层：

- **全局配置**：`fb.ProfilePath + "\\js_data\\theme_config.json"`，所有面板共享，用户可手动编辑，随 portable profile 迁移，不进 Git。
- **面板覆盖**：JSplitter 面板属性 `window.GetProperty("theme.config.override." + key)`，按面板实例持久化。

有效值优先级从高到低：

1. 面板实例属性覆盖。
2. 全局配置文件。
3. 面板代码默认值（`THEME_CONFIG.create(panelId, panelDefaults)`）。
4. Schema 默认值。

无配置文件、无覆盖时，11 个面板保持 D2D（`1`），3 个面板保持 GDI（`0`）：`track_info`、`title_playlist`、`title_library`。

`THEME_CONFIG` 是运行时用户配置；`THEME.CFG` 与各面板的 `PANEL_CFG` 仍是编译期常量，两者职责不同。

## 2. 模块结构

- 模块实现位于 IIFE 中，只暴露 `THEME_CONFIG`，内部 helper 不泄漏到面板 realm。
- 模块在 `include("lib/utils.js")` / `lib/theme.js` 之前加载。
- 模块自身不创建任何 GDI/D2D 对象；只使用 JSplitter 内置 `fb` / `utils` / `window` API，不依赖 `lib/utils.js`。
- `THEME_CONFIG.PANEL_ID` 保存 14 个入口脚本的稳定 ID，用于日志、诊断与未来 UI。

## 3. Schema

以下为模块暴露的 schema 与常量（实现中均已冻结）：

```javascript
THEME_CONFIG.schema = Object.freeze({
    "render.drawMode": Object.freeze({
        type: "int",
        values: [0, 1],
        default: 0,
        reloadRequired: true,
        description: "0 = GDI+, 1 = Direct2D. Requires panel reload.",
    }),
});

THEME_CONFIG.KEY = Object.freeze({
    DRAW_MODE: "render.drawMode",
});

THEME_CONFIG.DRAW_MODE = Object.freeze({
    GDI: 0,
    D2D: 1,
});

THEME_CONFIG.SOURCE = Object.freeze({
    OVERRIDE: "override",
    GLOBAL: "global",
    PANEL_DEFAULT: "panel-default",
    SCHEMA_DEFAULT: "schema-default",
});

THEME_CONFIG.PANEL_ID = Object.freeze({
    TRACK_INFO: "track_info",
    ALBUM_INFO: "album_info",
    BIOGRAPHY_V2: "biography_v2",
    PLAYBACK_BUTTONS: "playback_buttons",
    CONTROL_BUTTONS: "control_buttons",
    TITLE_PLAYLIST: "title_playlist",
    TITLE_LIBRARY: "title_library",
    COVER_PANEL: "cover_panel",
    TAB_CONTAINER: "_tab_container",
    TAB_CONTAINER_DETAIL: "tab_container_detail",
    TAB_CONTAINER_PLAYLIST: "tab_container_playlist",
    BG_PANEL: "bg_panel",
    BG_PANEL_CONTAINER_PLAYLISTVIEW: "bg_panel_container_playlistview",
    BG_PANEL_CONTAINER_CONTROL: "bg_panel_container_control",
});
```

## 4. API

### 4.1 面板实例

每个入口脚本通过 `THEME_CONFIG.create(panelId, panelDefaults)` 创建一个 `PANEL_CONFIG`：

```javascript
const PANEL_CONFIG = THEME_CONFIG.create(THEME_CONFIG.PANEL_ID.ALBUM_INFO, {
    [THEME_CONFIG.KEY.DRAW_MODE]: THEME_CONFIG.DRAW_MODE.D2D,
});

PANEL_CONFIG.get(key);              // 有效值（按需解析，不缓存有效值）
PANEL_CONFIG.getSource(key);        // "override" | "global" | "panel-default" | "schema-default"
PANEL_CONFIG.getOverride(key);      // 面板实例属性值或 undefined
PANEL_CONFIG.getGlobal(key);        // 全局文件值或 undefined
PANEL_CONFIG.getPanelDefault(key);  // 面板代码默认值或 undefined
PANEL_CONFIG.getSchemaDefault(key); // schema 默认值
PANEL_CONFIG.hasOverride(key);      // 是否存在面板实例覆盖
PANEL_CONFIG.set(key, value, opts); // 写面板实例覆盖；opts.reload=true 时调用 window.Reload()
PANEL_CONFIG.clear(key, opts);      // 删除面板实例覆盖
PANEL_CONFIG.reload();              // 丢弃全局文件缓存，下次 get 重新读取
PANEL_CONFIG.dump();                // 各层 raw 值 + 有效值/source
```

`reloadRequired` 的键在未重载时会输出警告。`panelId` 用于日志/诊断；面板覆盖由面板实例属性完成。

### 4.2 全局配置

```javascript
THEME_CONFIG.getGlobal(key);          // 读取全局文件值
THEME_CONFIG.setGlobal(key, value);   // read-modify-write + 原子替换
THEME_CONFIG.removeGlobal(key);       // 删除全局键
THEME_CONFIG.reloadGlobal();          // 丢弃全局文件缓存
```

### 4.3 命名空间

```javascript
THEME_CONFIG.VERSION;     // 当前配置版本（1）
THEME_CONFIG.filePath;    // 配置文件路径
THEME_CONFIG.schema;      // schema
THEME_CONFIG.KEY;         // 键名常量
THEME_CONFIG.DRAW_MODE;   // 0/1 常量
THEME_CONFIG.SOURCE;      // source 常量
THEME_CONFIG.PANEL_ID;    // 入口脚本 ID
THEME_CONFIG.create(panelId, panelDefaults);
```

## 5. 持久化

### 5.1 全局配置文件

路径：`fb.ProfilePath + "\\js_data\\theme_config.json"`

```json
{
  "version": 1,
  "render": {
    "drawMode": 1
  }
}
```

当前行为：

- 懒加载：首次 `get` 时读取；`ReadTextFile` / `JSON.parse` 均有 try/catch。
- 文件不存在、空、非法 JSON、根不是对象、嵌套类型错误都回退到面板默认值。
- 读取路径不创建 `js_data` 或配置文件。
- 写入只发生在显式 `THEME_CONFIG.setGlobal()` / `removeGlobal()` 调用时。
- 写入前按需 `CreateFolder`；read-modify-write 保留未知键。
- 写入临时文件后通过 `RenamePath` 替换；替换失败时尝试覆盖复制。
- 已存在非法 JSON 时，先 `CopyFile` 备份为 `theme_config.json.bad`，再写新文件。
- `version` 当前为 `1`；更高版本只读并警告，拒绝降级写入。
- 并发写入为 last-writer-wins；配置 UI 应作为唯一写者。

### 5.2 面板实例覆盖

- 键：`theme.config.override.render.drawMode`。
- 读取：单参数 `window.GetProperty(key)`，不传默认值，因此不会创建属性。
- `0` 是合法值，不能用 truthiness 判断缺失。
- 写入：`window.SetProperty(key, value)`。
- 清除：`window.SetProperty(key, null)`。
- 按面板实例持久化；重复面板实例互不影响。

## 6. 面板接入

14 个入口脚本都在 `"use strict";` 之后、其他 include 之前加载配置模块：

```javascript
include("lib/config.js");

const PANEL_CONFIG = THEME_CONFIG.create(THEME_CONFIG.PANEL_ID.ALBUM_INFO, {
    [THEME_CONFIG.KEY.DRAW_MODE]: THEME_CONFIG.DRAW_MODE.D2D,
});
window.DrawMode = PANEL_CONFIG.get(THEME_CONFIG.KEY.DRAW_MODE);

include("lib/utils.js");
// ...其余 include
```

当前面板默认值：

- D2D=1（11 个）：`_tab_container.js`、`tab_container_detail.js`、`tab_container_playlist.js`、`playback_buttons.js`、`control_buttons.js`、`cover_panel.js`、`album_info.js`、`biography_v2.js`、`bg_panel.js`、`bg_panel_container_playlistview.js`、`bg_panel_container_control.js`。
- GDI=0（3 个）：`track_info.js`、`title_playlist.js`、`title_library.js`。

`_tab_container.js` 自身是入口脚本（带 `DefineScript`），同样接入。纯共享库（`title_bar_shared.js`、`background.js`、`interaction.js`、`utils.js`、`data.js`、`theme.js`、`icons.js`、`i18n.js`、`json_schema_adapter.js`、`flag.js`）不创建 `PANEL_CONFIG`。`test1.js` 为空，不接入。

## 7. D2D 行为

- `window.DrawMode` 在创建任何绘制对象之前设置。`lib/theme.js` 在 include 时创建 `GdiFont`，因此配置模块先加载并完成 DrawMode 赋值。
- DrawMode 变更需要重载面板才能重建绘制资源；`PANEL_CONFIG.set(..., { reload: true })` 会调用 `window.Reload()`。未重载时输出警告。
- 全局配置设为 `1` 会让当前 3 个 GDI 面板也切到 D2D。JSplitter v4.1.0+ 的 GDI+ 方法均有对应实现，但这是视觉/布局层面的实验，切换前需单独验证 `track_info`、`title_library`、`title_playlist`。
- 默认全局文件不存在，因此 D2D 保持 opt-in 实验属性。

## 8. 扩展配置项

当前架构新增配置项的步骤：

1. 在 `THEME_CONFIG.schema` 增加条目（`type`、`values`、`default`、`reloadRequired`、`description`）。
2. 如需键名常量，在 `THEME_CONFIG.KEY` 增加对应项。
3. 在需要的面板通过 `PANEL_CONFIG.get(THEME_CONFIG.KEY.XXX)` 读取。
4. 全局值通过 `THEME_CONFIG.setGlobal` 写入；面板覆盖通过 `PANEL_CONFIG.set` 写入。

优先级、校验、懒加载与持久化自动复用。`ui.language`、`biography.*` 等现有字段仍由各自面板的 `window.GetProperty` 读取，尚未迁移到本模块。

透明模式是宿主/CUI 级设置（`window.IsTransparent` 只读），不由本模块控制；如需控制容器子面板的伪透明支持，应使用 `PanelObject.SupportPseudoTransparency`。

## 9. 验证状态

已完成：

- 所有 JS 文件通过 `node --check`。
- 32 项 stub 测试通过：无配置回退、全局覆盖、实例覆盖、清除覆盖、数字字符串归一化、非法值回退、懒加载不创建目录、`setGlobal` / `removeGlobal`、未知键保留、`.bad` 备份、版本保护、reload 语义、`dump`。
- DrawMode 顺序测试通过：`window.DrawMode` 在 `gdi.Font` 之前赋值。

待 foobar2000 内手动验证：

1. 无配置文件/覆盖时，14 个面板的 DrawMode 与接入前一致（11 × 1，3 × 0）。
2. 全局 `render.drawMode` 切换后，重载面板生效。
3. 面板 Properties 中的 `theme.config.override.render.drawMode` 覆盖全局；删除属性后回退。
4. 同一脚本的重复实例只覆盖其中一个，另一个不受影响。
5. 非法 JSON / 非法值回退并输出警告；损坏文件写入前生成 `.bad`。
6. 重启 foobar2000 后，实例属性与全局文件均保留。
7. CUI 与 DUI 下面板属性均可读写。
8. 3 个 GDI 面板切到 D2D 后的显示与性能。

## 10. 相关文件

配置模块文件：

- `js/lib/config.js`
- `js/docs/config-module.md`（本文档）

使用配置模块的入口脚本：

- `_tab_container.js`、`album_info.js`、`bg_panel.js`、`bg_panel_container_control.js`、`bg_panel_container_playlistview.js`、`biography_v2.js`、`control_buttons.js`、`cover_panel.js`、`playback_buttons.js`、`tab_container_detail.js`、`tab_container_playlist.js`、`title_library.js`、`title_playlist.js`、`track_info.js`

相关文档：

- `js/docs/project-map.md`：依赖链与 canonical reuse 条目。
- `js/docs/patterns-recipes.md`：§9.1.1 Runtime Config Module。
- `FEATURES.md`：D2D / GDI 切换说明。
- `TODO.md`：配置模块任务状态与 D2D 优化任务。

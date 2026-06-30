# TODO

## biography_v2.js

- [x] 添加更多图标适配更多链接（spotify, apple music, tidal, genius 等）
- [x] 链接区域根据链接数量动态适配行数，最多 2 行（当前只显示 1 行，多余被截断）
- [x] Discography 数据源改为可配置：全局变量控制来源（`fb.GetQueryItems` 库查询 / JSON 数据），JSON 需按日期降序排列
- [ ] 国家信息优化：使用 `country.name_zh` 拼接 `region_zh`（可能为空）+ `city_zh`（可能为空）显示详细出生地
  - **当前实现**: `origin.country.name_zh` 或 `origin.country.name_en`（仅国家名）
  - **目标格式**: "美国纽约"、"中国台湾台北" 等完整地址（region/city 为空时仅显示国家）
  - **涉及文件**: `lib/json_schema_adapter.js:115` normalizeArtistData() country 字段映射
- [x] 性能检查：V2 图片 LRU 缓存是否正常工作
- [ ] 选中的 TAB 使用白色而非主题色？视觉效果评估
- [ ] 无艺人数据时显示按钮，点击调用 music-meta 自动获取
  - **依赖工具**: music-meta CLI (`D:\11_MusicLib\_Tools\music-meta\`)
  - **文档**: `D:\11_MusicLib\_Tools\music-meta\README.md`
  - **SMP API**: `utils.RunCmdAsync()` / `utils.Run()` (见 `user-components-x64/foo_uie_jsplitter/docs/js/foo_uie_jsplitter.js:2361-2358`)
  - **路径配置方案**:
    - 推荐：`window.GetProperty("music_meta.cli_path", "music-meta")` + `window.GetProperty("music_meta.data_dir", "")`
    - 备选：环境变量 `%MUSIC_META_DATA_DIR%`（通过 WScript.Shell.ExpandEnvironmentStrings）
    - 避免：写死绝对路径（影响可移植性）
  - **实现模式**: 异步调用 → `on_run_cmd_async_done()` 回调 → JSON.parse(result.Stdout) → 更新面板数据
  - **输出格式**: `--json` 标志，返回 `{status: "ok|ambiguous|error", data: {...}, candidates: [...]}`
  - **待补充文档**: CLAUDE.md "External Tools" 章节 + patterns-recipes.md 调用示例
- [ ] 添加右键菜单：资料面板右键打开本地 JSON 文件，调用系统默认软件手动编辑
  - **触发条件**: 当 `artistData` 已加载且有对应的 `jsonPath` 时
  - **实现方案**: `on_mouse_rbtn_up` → 构建菜单 → `ActiveXObject("WScript.Shell").Run(jsonPath)` 用默认关联程序打开
  - **路径来源**: `reloadArtistData()` → `tryFindArtistFiles()` → `fileInfo.jsonPath`，需将 `jsonPath` 存入全局状态供右键使用
  - **菜单位置**: 右键点击面板任意位置（非封面/Tab/链接区域）
  - [ ] 添加右键菜单：调用 music-meta 更新数据、下载封面等
  - **相关命令**: `get artist`, `covers --download`, `export tag`
  - **需处理**: status="ambiguous" 消歧菜单、超时处理（默认 30s）、错误提示
- [ ] 封面查找后缀优化：当前 `_X_` 写死，考虑更通用的匹配方案
- [ ] 点击查看大图（从 biography.js 迁移）
- [ ] 伪透明模式：选中非当前播放歌曲并停止播放时，背景渲染异常（从 biography.js 迁移）**[可能是 JSplitter/CUI 插件问题，需调试确认]**
- [x] `var` → `let`/`const` 重构（33 处），规范已沉淀至 smp-copilot.md §5

## biography.js — 已废弃，由 biography_v2.js 取代，任务迁移至下方

## album_info.js

- [x] 添加链接显示区域（对齐 biography_v2.js 的 external_urls 展示）
- [ ] 点击查看大图
- [ ] 伪透明模式：选中非当前播放歌曲并停止播放时，背景渲染异常 **[可能是 JSplitter/CUI 插件问题，需调试确认]**

## cover_panel.js

- [ ] 点击查看大图

## bg_panel_container_control.js

- [ ] 播放控制栏使用封面颜色（当前通知同步方案卡顿）

## lib/background.js

- [ ] 支持定制图片

## 通用

- [x] 移除头部 `@file`/`@author`/`@created`/`@updated`/`@version`，统一由 git 管理（22 文件）
- [ ] 代码进一步规范化（命名、结构一致性）
- [x] UI 文案国际化：新增 `lib/i18n.js`，统一管理 tooltip/hover 文案的中英文版本
  - **方案**: `lib/i18n.js` 纯数据模块，`I18N.t(path, vars)` 取值 API，零性能开销
  - **切换入口**: `window.GetProperty("ui.language", "en")`，各面板通过 `I18N.t("script.key")` 取值
  - **已迁移面板**: `playback_buttons.js`、`control_buttons.js`、`title_library.js`、`title_playlist.js`
  - **键名规范**: 复用脚本内部 `key` 字段，`{ en, zh }` 对象，支持 `{key}` 占位替换
- [ ] UI 语言切换入口：右键主菜单按钮添加 Language 菜单项
  - **实现位置**: `control_buttons.js` → `on_mouse_rbtn_up` 检测 `menu` 按钮 → 弹出 Language 子菜单
  - **默认值**: `THEME.CFG.LANGUAGE = "en"` → `GetProperty("ui.language", THEME.CFG.LANGUAGE)` 链式 fallback
  - **菜单项**: `English` / `中文`，点击后 `window.SetProperty("ui.language", "zh"/"en")`，提示重载面板
- [x] 版本号规范统一（头部仅保留 `@description` + `@requires`）
- [x] 删除冗余内容（未引用的代码、空文件、废弃注释）
  - [x] 删除 JSON_SCHEMA_MAP 未使用常量（24 行）
  - [x] 为 ALBUM_ART_ID 添加 @reserved 标记（后续会用）
  - ✓ test1.js 空文件保留（用户表示不用管）
  - ✓ "废弃"注释均为功能描述，无需删除
- [x] 优化 CLAUDE.md / 文档重构（精简内容、消除重复，详见 docs/ 重构）
- [x] 文档路径优化（`docs/` 目录结构梳理，已完成重构）
- [ ] 引入配置模块（全局透明模式开关、D2D 渲染模式开关）
- [ ] 脚本 README.md 文档
- [ ] 面板底部阴影遮罩（让显示更自然，避免生硬切割）
- [ ] 添加 panel/container 布局对象
- [ ] 检查控制器内存泄露（createTitleBarController、createPanelBackgroundController）
- [x] PNG 图标迁移 SVG（播放控制、国旗、链接等）
  - 目录重构：`imgs/icons/{flags, brands, player, ui}/` 按用途分层，PNG/SVG 同目录用扩展名区分
    - [x] flags: 国旗已迁移（`icons/flags/{1x1,4x3}/`，`loadFlagImage(code, ratio)`）
    - [x] brands: 品牌图标（原 Links/）
    - [x] player: 播放控制图标（原 Lucide/ 播放相关）
    - [x] ui: 通用 UI 图标（原 Lucide/ 其他）
  - [x] `_loadImage` 优化：按扩展名 `.svg`→`gdi.LoadSVG`，其他→`gdi.Image`
  - [x] `SourceIconCache.get()` 适配 SVG：`lib/data.js:191` `gdi.Image(path)` → `_loadImage(path)`
  - [x] 统一图标资源管理：集中加载+缓存，替代散落在各面板的 `_loadImage` 调用和 `LINK_ICONS` 字典
    - [x] `IconManager` 模块（`lib/icons.js`）：按类别/名称获取图标，自动处理 SVG/PNG + DPI，内置缓存
    - [x] `lib/theme.js` 集中维护路径常量（当前 `IMGS_LINKS_DIR`/`IMGS_LUCIDE_DIR` 已存在）
    - [x] 各面板脚本从 `LINK_ICONS` 字典 → `iconManager.get('brands', 'apple_music')` 调用
    - [x] `IconManager.BRANDS` 去重：snake_case（`tidal`）和大写来源名（`TIDAL`）指向同一图标，统一键名并归化调用点大小写
      - [x] `IconManager.get()` 引入键名规范化（小写 + 空格转下划线），消除大小写冗余映射
      - [x] BRANDS 注册表统一小写：删除 v1 别名（`official`, `rateyourmusic`, `aoty`）+ 删除冗余大写键（`TIDAL`, `QOBUZ` 等 9 个）+ 物理介质键小写化（`CD` → `cd`, `WEB` → `web` 等）
      - [x] FLAGS 注册表统一小写：所有 ISO 3166-1 代码改为小写（`CN` → `cn`, `US` → `us` 等 47 个键）
      - [x] 调用方清理：移除 5 处 `.toUpperCase()` 预处理（album_info.js 2 处、track_info.js、biography.js、biography_v2.js 各 1 处）
      - [x] 文档更新：patterns-recipes.md、project-map.md 补充规范化说明
- [x] SVG 图标存在模糊/锯齿，考虑切换回 PNG（修改注册表文件名即可，无需改代码）
  - [x] 排查旧文件引用：清理 `Links/`/`Lucide/` 中 `-1`, `-xx`, `(1)` 等历史变体 → `_legacy/`
  - [x] `covers/radio/` / `screenshots/` 独立于图标目录
  - [x] 批量转换 SVG → PNG（96×96px，`imgs/svg_to_png.py` 脚本）
  - [x] 切换注册表到 PNG（`lib/icons.js` 四个注册表全部切换）
  - [x] `_loadImage` 默认值优化：`maxWidth` 默认 96px（对齐图标库标准）
- [ ] window.DrawMode 优化卡顿面板 **[可能是 JSplitter 渲染机制问题，需排查]**
- [x] 设备切换动态化：去掉硬编码设备名，改用 `fb.GetOutputDevices()` 动态识别
  - **涉及文件**: `control_buttons.js` → `syncDeviceState()` + `classifyDevice()`
  - **优先级循环**: WASAPI shared → WASAPI exclusive → ASIO → shared
  - **识别规则**: 关键词 `ASIO` / `exclusive` / 其他；同类多设备选列表第一个
  - **Fallback**: 从 nextType 开始按优先级轮询所有类型，不可用时 `deviceArr[0]` 兜底
  - **隐私修复**: 移除硬编码的 `aune USB Audio Device` ✅
- [ ] 调研 `utils.GetCountryFlag` 替代 `lib/flag.js` 的方案（JSplitter v4.1.10+）
  - **API**: `utils.GetCountryFlag(country_or_code)` → 返回 ISO 代码（小写），内置 249 国 `countries.json`
  - **`resolveCountryCode`（biography_v2 使用）**：可部分替代
    - ✅ 已有 `artistData.countryCode`（ISO 码）时，可直接传 `GetCountryFlag`，覆盖面从 49 → 249 国
    - ❌ fallback 为中文名（如"美国纽约"）时，`GetCountryFlag` 不支持中文，需保留正则层或确保上游总是输出 ISO 码
    - 返回值小写 → 需 `.toUpperCase()` 适配当前注册表键名
  - **`resolveLanguageCode`（album_info 使用）**：无法替代 — 语言码→国家码映射与 `GetCountryFlag` 是不同领域
  - **建议**: 低优先级，当前实现工作正常。若迁移，在 `json_schema_adapter.js` 保证 `countryCode` 优先输出 ISO 码，`resolveCountryCode` 降级为中文兜底

---

## 历史归档

以下为已完成的 ROADMAP 任务，保留作为历史记录。

### playback_button.js
- [x] 重构元素布局计算方案，支持 padding 模式，icon 尺寸支持定义

### control_buttons.js
- [x] 重构元素布局计算方案，支持 padding 模式，icon 尺寸支持定义
- [x] 搜索添加右键功能菜单（搜索歌曲/专辑/歌手、新增智能列表）

### biography.js
- [x] 硬编码本地路径改为可定义 GetProperty()
- [x] 艺人中文名 icon
- [x] 艺人中文名独立一行布局
- [x] 图标和文字对齐修复
- [x] 艺人国旗（维护映射表，规范国家名 → 国旗）
- [x] 封面支持定义四周 padding
- [x] 伪透明离屏渲染 ClearType 异常：恢复位图方案（需 DrawMode=1 + SetSmoothingMode）
- [x] 重新设计布局（原有太复杂）
- [x] LINE_H、MARGIN 遗留修复
- [x] 移除 json 解析异常代码
- [x] UTF-8 BOM 编码 / 英文输出解决中文乱码

### album_info.js
- [x] badgeElement 放到 elements 中管理
- [x] 优化音质徽章计算逻辑，支持四周 padding
- [x] 语言支持解析 mp3tag 标准 // 分割数组
- [x] album 根据专辑语言添加国旗
- [x] 图标和文字对齐修复
- [x] 音质来源和标签合并，tooltip 合并
- [x] 版本类型缺失时不隐藏前置徽标
- [x] 离屏渲染 ClearType 修复（位图方案 + DrawMode=1 + SetSmoothingMode）
- [x] 封面支持定义四周 padding
- [x] 重新设计布局
- [x] LINE_H、MARGIN 遗留修复

### info+rating
- [x] 优化音质徽章计算逻辑，支持四周 padding
- [x] 星星右键取消评分（点击相同评分即取消）
- [x] 面板宽度计算修复（来源图标右偏问题）
- [x] 点击艺人/专辑发送通知给 tab 面板切换资料
- [x] 重构优化布局，接入新主题设置
- [x] 音质来源和标签合并，tooltip 合并
- [x] 布局细节优化
- [x] JSPlitter 编码处理：UTF-8 with BOM
- [x] 注释移除点击打开面板功能

### tab_container*
- [x] 动态 mask 颜色支持 on_colours_changed()
- [x] tab 切换面板闪烁解决（CUI 窗口标题名隐藏）
- [x] 自定义按钮替代 JSPlitter 按钮（解决 tooltip 问题）
- [x] tab 样式优化 + 文字样式 + 下划线样式
- [x] tab 区域 padding 定制四周
- [x] tab 子 panel 定制四周

### bg_panel*
- [x] 动态 mask 颜色支持 on_colours_changed()
- [x] 接入所有 panel，无需伪透明模式穿透

### lib/background.js
- [x] 支持定制子 panel 四周 padding
- [x] 默认主题背景
- [x] 渐变色背景（封面取色 + 透明图层遮罩）
- [x] 封面背景模糊（GdiBitmap.StackBlur）
- [x] 通用背景 panel
- [x] 背景颜色自定义模式 + 透明度设置

### cover_panel.js
- [x] 动态 mask 颜色支持 on_colours_changed()
- [x] 停止播放时显示封面
- [x] 默认艺人图片 → 专辑封面优先级
- [x] 圆角封面（专辑 + 艺人）
- [x] 封面索引指示颜色跟随主题
- [x] 添加缓存和去除异步加载逻辑

### 全局
- [x] 统一版本号推送
- [x] panelW/panelH 替代 window.Width/Height（control/rating/playback 面板）
- [x] 通知标准检查
- [x] 全局常量：DT_LEFT 等标记位优化
- [x] 全局常量：字体颜色统一管理（THEME.TEXT.* 覆盖所有面板）
- [x] 全局常量：移除重复定义，集中在 THEME.CFG / PANEL_CFG
- [x] tooltip 及默认文案改为英文（album/biography）
- [x] 文件命名优化
- [x] 全局主题切换：on_font_changed() / on_colours_changed()
- [x] 移除 SMP 改为 JSPlitter
- [x] panel_title.js 分拆为 title_playlist.js / title_library.js
- [x] Pseudo Transparent: window.IsTransparent 伪透明模式（艺人/专辑面板）
- [x] 统一歌曲数据源：resolveMetadbByMode()
- [x] background padding 计算函数抽取到 lib/utils.js

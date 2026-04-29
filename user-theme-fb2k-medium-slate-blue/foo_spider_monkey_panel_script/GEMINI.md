## 1. Spider Monkey Panel (SMP) API 核心参考手册

该文档汇总了 [Spider Monkey Panel API](https://theqwertiest.github.io/foo_spider_monkey_panel/assets/generated_files/docs/html/index.html) 的所有关键模块、类库和开发规范。

### 1.1. 核心运行环境与基本原则

#### 1.1.1. ECMAScript 支持
Spider Monkey Panel 基于 Mozilla SpiderMonkey 引擎（ESR68），全面支持 ECMAScript 2019 (ES10) 语法特性。支持 `let/const`、箭头函数、`Promise`、`async/await` 等现代语法。没有内置浏览器特定的对象（如 `XMLHttpRequest` 或 `DOM API`）。

#### 1.1.2. 内存管理与废弃用法
现代 SMP 引擎全权接管垃圾回收。
* **禁止手动销毁**：绝对禁止对 GDI 对象或 `TitleFormat` 对象调用旧版的 `.Dispose()` 方法。
* **兼容性说明**：若脚本需兼容旧版 js-panel3 组件，GDI 对象可沿用带保护的 Dispose 模式：`if (obj && typeof obj.Dispose === "function") obj.Dispose();`。纯现代 SMP 环境下垃圾回收全权接管，无需手动调用。
* **集合对象访问**：列表对象（如 `FbMetadbHandleList`）原生支持索引访问和 `for...of` 迭代，**严禁调用 `.toArray()`**（调用会导致脚本崩溃）。
* **严格模式**：建议所有脚本顶部声明 `"use strict";`。

### 1.2. 全局环境与系统函数

#### 1.2.1. 全局定时器与基础函数
* `setTimeout(func, delay)` / `clearTimeout(timerID)`: 一次性定时器。
* `setInterval(func, delay)` / `clearInterval(timerID)`: 循环定时器。
* `include(path)`: 引入外部 JS 脚本。

#### 1.2.2. ActiveXObject 支持
支持在 Windows 环境下调用 COM 组件。
* `let fso = new ActiveXObject("Scripting.FileSystemObject");` 用于高级文件系统操作。
* `let xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");` 用于网络请求（替代浏览器环境的 `XMLHttpRequest`）。

### 1.3. 全局命名空间 (Namespaces)

#### 1.3.1. fb (foobar2000 核心)
处理播放控制、音轨句柄和全局状态。
* **核心属性**：`fb.IsPlaying`, `fb.IsPaused`, `fb.Volume`, `fb.PlaybackLength`, `fb.PlaybackTime`, `fb.AlwaysOnTop`。
* **核心方法**：
  * `fb.GetNowPlaying()`: 获取当前播放音轨的 `FbMetadbHandle`。
  * `fb.Play()`, `fb.Pause()`, `fb.Stop()`, `fb.Next()`, `fb.Prev()`, `fb.Random()`: 控制播放。
  * `fb.TitleFormat(expression)`: 创建标题格式化对象 (`FbTitleFormat`)。
  * `fb.RunMainMenuCommand(command)`: 执行 foobar2000 顶部主菜单项。
  * `fb.ShowPopupMessage(msg, title)`: 弹出系统消息框。
  * `fb.CreateProfiler(name)`: 创建性能分析器 (`FbProfiler`) 以测试执行耗时。

#### 1.3.2. gdi (绘图对象接口)
处理图像和字体的创建。
* **核心方法**：
  * `gdi.CreateImage(w, h)`: 创建空白图像 (`GdiBitmap`)。
  * `gdi.Font(name, size, style)`: 创建字体对象 (`GdiFont`)。
  * `gdi.Image(path)`: 同步加载本地图像。
  * `gdi.LoadImageAsyncV2(window_id, path)`: 异步加载图像，返回 `Promise`。

#### 1.3.3. plman (播放列表管理)
处理播放列表及其内容的交互。
* **核心属性**：`plman.ActivePlaylist`, `plman.PlayingPlaylist`, `plman.PlaylistCount`。
* **核心方法**：
  * `plman.GetPlaylistItems(playlistIndex)`: 获取指定播放列表的所有歌曲 (`FbMetadbHandleList`)。
  * `plman.ExecutePlaylistDefaultAction(playlistIndex, itemIndex)`: 双击执行曲目默认动作。
  * `plman.RemovePlaylist(playlistIndex)`: 移除播放列表。

#### 1.3.4. utils (辅助工具)
处理操作系统功能、IO 和异步资源。
* **核心方法**：
  * `utils.GetAlbumArtAsyncV2(window_id, metadb, art_id)`: **异步提取封面**，返回 `Promise` (解析结果为 `ArtPromiseResult`，包含 `.image`)。
  * `utils.GetSysColour(index)`: 获取 Windows 系统配色。
  * `utils.ReadTextFile(path, codepage)` / `utils.WriteTextFile(path, content)`: 文本读写。
  * `utils.FormatDuration(seconds)`: 格式化时间戳为 `MM:SS` 格式。

#### 1.3.5. window (当前面板属性与方法)
* **核心属性**：`window.ID` (面板唯一标识), `window.Width`, `window.Height`, `window.InstanceType` (区别 DUI/CUI)。
* **核心方法**：
  * `window.Repaint()`: 全屏重绘。
  * `window.RepaintRect(x, y, w, h)`: 局部重绘。
  * `window.GetColourCUI(type)` / `window.GetColourDUI(type)`: 获取 UI 框架主题色。
  * `window.CreatePopupMenu()`: 创建右键菜单对象 (`MenuObject`)。
  * `window.CreateTooltip(fontName, fontSize, fontStyle)`: 创建提示框 (`FbTooltip`)。

#### 1.3.6. console (控制台)
* **核心方法**：`console.log(message)` 输出调试信息至 foobar2000 Console。

### 1.4. 核心类与对象 (Classes & Objects)

#### 1.4.1. FbMetadbHandle 与 FbMetadbHandleList
* **FbMetadbHandle**：单首音轨的句柄。
  * 属性：`Path`, `FileSize`, `Length`, `SubSong`。
  * 方法：`Compare(handle)`, `GetFileInfo()`。
* **FbMetadbHandleList**：音轨列表（原生支持索引/迭代）。
  * 属性：`Count`。
  * 方法：`Add(handle)`, `RemoveAll()`, `Sort()`, `UpdateFileInfoFromJSON(json)`。

#### 1.4.2. FbTitleFormat
用于解析 foobar2000 标签语法（如 `%artist%`）。
* **核心方法**：
  * `Eval()`: 解析当前相关音轨。
  * `EvalWithMetadb(handle)`: 对指定句柄解析。
  * `EvalWithMetadbs(handleList)`: 批量解析列表，**直接返回标准 JS 字符串数组**。

#### 1.4.3. GdiGraphics
绘图上下文对象（仅在 `on_paint(gr)` 中可用，或通过图像的 `GetGraphics()` 获取）。
* **核心方法**：
  * 绘制/填充：`FillSolidRect()`, `FillGradRect()`, `DrawRect()`, `DrawRoundRect()`, `FillRoundRect()`, `FillEllipse()`。
  * 图像与文本：`DrawImage()`, `GdiDrawText()`, `MeasureString()`。
  * 渲染控制：`SetInterpolationMode(mode)` (高质量传 7), `SetSmoothingMode(mode)` (抗锯齿传 2)。

#### 1.4.4. GdiBitmap
位图图像对象。
* **核心属性**：`Width`, `Height`。
* **核心方法**：
  * `ApplyMask(maskImage)`: 应用 Alpha 透明遮罩（白色区域被裁切为透明，黑色区域保留为不透明）。
  * `GetColourSchemeJSON(max_count)`: 提取主色调，返回 JSON 字符串。
  * `GetGraphics()` / `ReleaseGraphics(gr)`: 获取并释放绘图上下文。
  * `StackBlur(radius)`: 应用高斯模糊效果。

#### 1.4.5. 菜单相关类
* **MenuObject**：自定义菜单。
  * 方法：`AppendMenuItem()`, `AppendMenuSeparator()`, `AppendTo()`, `TrackPopupMenu(x, y, flags)`。
* **ContextMenuManager**：系统原生右键菜单管理器。
  * 方法：`InitContext()`, `BuildMenu()`, `ExecuteByID()`。

#### 1.4.6. FbTooltip
提示框对象。
* **方法**：`Activate()`, `Deactivate()`, `TrackPosition(x, y)`。属性：`Text`。

### 1.5. 系统回调与事件钩子 (System Callbacks)

#### 1.5.1. 渲染与尺寸事件
* `on_paint(gr)`: 面板需要重绘时调用。**严禁在此函数内创建 GDI 图像或字体对象，会造成极其严重的性能崩溃。**
* `on_size()`: 面板大小改变时触发，用于重新计算全局尺寸（`window.Width`, `window.Height`）。
* `on_colours_changed()`: foobar2000 主题颜色发生变更时触发。

#### 1.5.2. 鼠标与键盘事件
* **鼠标移动**：`on_mouse_move(x, y, mask)`, `on_mouse_leave()`。
* **鼠标点击**：`on_mouse_lbtn_down()`, `on_mouse_lbtn_up()`, `on_mouse_rbtn_up()`（右键松开，常用于弹出菜单）。
* **鼠标双击与滚轮**：`on_mouse_lbtn_dblclk()`, `on_mouse_wheel(step)`。
* **键盘**：`on_key_down(vkey)`, `on_key_up(vkey)`。

#### 1.5.3. 播放状态监控
* `on_playback_new_track(metadb)`: 歌曲切换时触发。
* `on_playback_stop(reason)`: 停止时触发（`reason == 2` 为切换到下一首，常被忽略以防 UI 闪烁）。
* `on_playback_time(time)`: 播放进度每秒更新。
* `on_playback_pause(state)`: 暂停状态改变。

#### 1.5.4. 播放列表状态监控
* `on_playlist_switch()`: 用户切换了不同播放列表。
* `on_playlist_items_added(playlistIndex)` / `on_playlist_items_removed()`: 列表增删。
* `on_item_focus_change(playlistIndex, from, to)`: 用户光标焦点变更。

#### 1.5.5. 拖拽交互 (Drag & Drop)
* 钩子函数：`on_drag_enter()`, `on_drag_over()`, `on_drag_leave()`, `on_drag_drop()`。
* 参数包含 `action` 对象，需修改 `action.Effect` 控制允许的拖放类型。

### 1.6. 必须遵守的开发禁令与最佳实践

#### 1.6.1. 异步规范
* 凡是 `xxxAsyncV2` 后缀的方法，必须当做 `Promise` 处理（`.then().catch()`）。不要使用过时的全局回调函数。

#### 1.6.2. 图形计算规范
* 所有传入 `GdiGraphics` 方法的宽高和坐标尺寸，务必使用 `Math.round()` 或 `Math.floor()` 转为整数。带有小数点的坐标在 GDI+ 底层极易引发渲染错位或图像无法显示。
* 生成颜色时，必须包括正确的透明通道。例如 `0xff000000 | (r << 16) | (g << 8) | b`，其中最高位的 `ff` 保证了颜色不透明。

#### 1.6.3. 性能优化规范
* 在 `on_paint(gr)` 内应只包含最纯粹的绘制指令。逻辑判断、图像裁剪、字体实例化必须转移到外部、数据加载完毕的回调、或者 `on_size()` 事件中。
* 对于简单的 hover 特效，使用 `window.RepaintRect(x, y, w, h)` 刷新目标按钮区域远比 `window.Repaint()` 刷新全屏更高效。
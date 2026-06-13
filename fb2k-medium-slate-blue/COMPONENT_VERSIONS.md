# 依赖组件版本

| 组件 | 版本 | 说明 |
|:---|:---|:---|
| JSplitter | `v4.1.8` | JavaScript 面板宿主，JSDoc 随 DLL 附带 |

## 发布地址

- [JSplitter - Плагины - foobar2000](https://foobar2000.club/forum/viewtopic.php?t=6378)（俄文主站）
- [JSplitter (splitter + SMP x64 alternative)](https://hydrogenaudio.org/index.php/topic,126743.0.html)（英文 HydrogenAudio）
- [dima-lur/jsplitter](https://github.com/dima-lur/jsplitter)（GitHub 仓库）

## 版本更新记录

> 来源：俄文主站，翻译整理。仅收录 4.0.0+ 版本。

### v4.1.8 [2026-06-09]

- [修复] `utils.MovePlaylistSelectionV2`：整个 track 包现在被精确插入到指定位置
- [新增] `utils.Run`：`args` 参数支持数组和原始字符串两种形式
- [新增] `utils.RunCmdAsync`
- [更新] 代码编辑器引擎升级至 Scintilla 5.6.3

### v4.1.7 [2026-06-04]

- [修复] `window.GetProperties` 曾返回内部属性集合而非已保存配置中的集合
- [新增] **破坏性变更** — `window.ImportProperties`：新增可选参数 `reloadPanel`，默认 `false`
- [新增] `window.SetProperties`
- [新增] `utils.Run`
- [新增] `utils.ParseHtml`
- [新增] `plman` 命名空间新增方法：`GetPlaylistSelectedIndexes`、`InvertSelection`、`MovePlaylistSelectionV2`（实验性）、`ReplacePlaylistItem`、`SelectQueryItems`、`ShowPlaylistLockUI`

### v4.1.6 [2026-05-31]

- [新增] `window.ClearProperties`
- [新增] `fb.GetActiveDSPs`
- [新增] `fb.EnableAdvancedLogging`（当前为空实现，为未来及 JSP3 兼容预留）
- [新增] `fb.EnumerateMainMenuCommands`
- [新增] `fb.IsLibraryInitialised`
- [新增] `gdi.LoadSVG` / `d2d.LoadSVG`
- [新增] `FbMetadbHandleList.AttachImage` 现返回布尔值
- [新增] `FbMetadbHandleList.AttachImage2`：嵌入已有 GdiBitmap/D2DBitmap，支持 JPEG/WEBP/PNG
- [新增] `FbMetadbHandleList.GetOtherInfo`

### v4.1.5 [2026-05-28]

- [新增] `fb.ShowPlaylistSearchUI`
- [新增] `window.ExportProperties` / `window.ImportProperties`
- [新增] `window.GetProperties`
- [新增] `window.Reload` 新增可选参数 `clearProperties`

### v4.1.4 [2026-05-25]

- [修复] 关闭播放器时偶发崩溃：队列中的事件可能在面板关闭期间被接收
- [修复] regor 示例文件修复

### v4.1.3 [2026-05-22]

- [修复] SMP 包描述、代码编辑器菜单及滚动条的深色主题适配
- [修复] `fb.DoDragDrop`：`custom_image` 现作为封面未找到或 `use_album_art=false` 时的回退
- [修复] `fb.DoDragDrop`：`custom_image` 为 `null` 时不再崩溃
- [新增] `utils.MessageBox`：支持深色主题的系统消息对话框
- [新增] `utils.TextBox` 新增可选参数 `help_text`，显示帮助按钮
- [新增] `on_console_refresh` 回调 / `console.GetLines` / `console.ClearBacklog` 选项
- [新增] `fb.ShowConsole` 新增可选参数 `show`（`false` 关闭控制台）
- [新增] `gdi.Brush` / `d2d.Brush` 新增第 4 个参数支持 `WrapMode`
- [更新] JS 引擎升级至 SpiderMonkey 140.11.0esr

### v4.1.2 [2026-05-06]

- [新增] `gdi.Brush` / `d2d.Brush`：创建 GdiBrush/D2DBrush 对象
- [新增] 所有 `Draw*`/`Fill*` 方法现支持自定义 Brush（不仅限于颜色）
- [新增] GdiGraphics 新增矩阵变换方法（Translate、Rotate、Scale 等，从 D2DGraphics 移植）

### v4.1.1 [2026-05-01]

- [新增] `utils.FolderPicker` / `utils.FilePicker`

### v4.1.0 beta 15 [2026-04-30]

- [新增] `window.SetShortcutFilter`：条件性抑制面板快捷键
- [修复] 系统快捷键 `Alt+F4` 对获得焦点的 JSplitter 面板从未生效
- [新增] `utils.MD5` / `utils.CRC32` / `utils.SHA1` 字符串哈希
- [新增] `utils.MD5FromFile` / `utils.CRC32FromFile` / `utils.SHA1FromFile` 文件哈希
- [实验] `on_drag_drop` 的 `action` 参数新增 `Handles` 属性：可解释为 `FbMetadbHandleList` 时包含 Handle 列表，否则为 `null`

### v4.1.0 beta 14 [2026-04-29]

- [修复] `D2DFont.Style` 现返回完整样式（粗体、下划线、删除线），与 GdiFont 一致
- [修复] `utils.FontPicker` / `gdi.Font`：字体粗细匹配逻辑修正，移除竖排和位图字体
- [修复] 所有异步图片加载方法在 D2D 设备已销毁时的访问问题
- [修复] `fb.DoDragDrop` 的 `custom_image` 在 D2D 模式下不工作
- [新增] D2D 字体搜索改进
- [更新] 示例 `list.js` 更新（Gabriel Schwartz，含相似艺人和热门曲目）
- [更新] JS 引擎升级至 SpiderMonkey 140.10.1esr
- [更新] 代码编辑器引擎升级至 Scintilla 5.6.2

### v4.1.0 beta 13 [2026-04-25]

- [修复] `utils.FontPicker` 在 D2D 模式下传入的有效 `default_font` 有时找不到
- [修复] `utils.FontPicker` 返回值由 pt 换算导致与 px 输入不一致的舍入问题
- [修复] `utils.FontPicker` 移除无用的颜色选择
- [修复] `window.Repaint` 内部实现：`force=true` 时强制刷新所有 JSplitter 子元素

### v4.1.0 beta 12 [2026-04-23]

- [修复] 首次调用 `d2d.CreateImage` 的问题
- [修复] `D2DGraphics.DrawImage` 现对 `src*` 参数做终值校验
- [修复] 切换绘制模式时偶发崩溃

### v4.1.0 beta 11 [2026-04-22]

- [修复] `D2DBitmap.GetColourSchemeJSON` / `GetColourSchemeJSONV2` 现考虑 alpha 通道
- [修复] `D2DGraphics.DrawText` 在垂直对齐时现正确处理 `DT_SINGLELINE`
- [更新] JS 引擎升级至 SpiderMonkey 140.10.0esr

### v4.1.0 beta 10 [2026-04-19]

- [修复] `D2DGraphics.CalcTextHeight` 换行行为与 GDI 对齐
- [修复] D2D 模式下 `EndDraw` 返回错误时脚本正确报错
- [修复] regor 示例多处修复
- [修复] `FbPlaylistManager.GetGUID` 索引越界时返回空字符串而非崩溃
- [修复] 渲染消息有时卡在消息队列
- [修复] D2D `DrawText` 的 `DT_BOTTOM`/`DT_VCENTER` 添加 `DT_CALCRECT` 依赖，对齐 GDI 脚本行为
- [新增] `utils.FontPicker`
- [新增] `utils.ColourPicker` 对话框现居中于父窗口
- [更新] JS 引擎升级至 SpiderMonkey 140.9.1esr
- [更新] 代码编辑器引擎升级至 Scintilla 5.6.1

### v4.1.0 beta 8 [2026-03-16]

- [修复] D2D 渐变含半透明颜色时渲染对齐 GDI 模式
- [修复] `D2DGraphics.MeasureString` 尾部空格测量对齐 GDI
- [修复] `D2DGraphics.DrawImage`：负数 `dstW`/`dstH` 镜像翻转、`srcW`/`srcH` 超原始尺寸缩放、旋转裁剪对齐 GDI
- [修复] `D2DGraphics.FillSolidRect`
- [新增] Effects 模块效果大幅扩展

### v4.1.0 beta 7 [2026-03-07]

- [修复] `D2DBitmap.RotateFlip` 缓冲区未清理
- [修复] D2D 基本图元绘制精确对齐 GDI+ 渲染行为
- [修复] GDI 名称不被 D2D 识别的字体现可正确创建
- [修复] `D2DGraphics.FillGradRect`
- [新增] `D2DGraphics.FillGradRectV2`：支持任意数量颜色的渐变
- [新增] `GetColourSchemeJSONV2` 新增 `minChroma` 参数，按色度值过滤初始聚类

### v4.1.0 beta 6 [2026-03-03]

- [修复] `D2DBitmap.RotateFlip` 后 Effects 失效
- [修复] `FbMetadbHandle` 统计参数设置（SetLoved、SetPlaycount 等）
- [修复] 配置窗口中的脚本示例未反映实际文件夹结构

### v4.1.0 beta 5 [2026-03-01]

- [修复] `D2DBitmap.RotateFlip`
- [新增] `utils.ReadBinaryFile` / `utils.WriteBinaryFile`（Uint8Array 读写二进制文件）
- [新增] `GdiBitmap.GetPixelData` / `D2DBitmap.GetPixelData`：获取指定格式像素缓冲区
- [新增] `GdiBitmap.CreateImageFromPixelData` / `D2DBitmap.CreateImageFromPixelData`
- [新增] `GetColourSchemeJSONV2`：基于 K-means++ (Oklab) 的新取色算法
- [更新] 代码编辑器引擎升级至 Scintilla 5.6.0

### v4.1.0 beta 4 [2026-02-25]

- [修复] GDI 对象泄漏
- [修复] 尾部空格文本行测量在 D2D 模式下异常
- [更新] JS 引擎升级至 SpiderMonkey 140.8.0esr
- [更新] 代码编辑器引擎升级至 Scintilla 5.5.9

### v4.1.0 beta 3 [2026-02-23]

- [修复] D2D 模式下面板偶发空白
- 脚本属性窗口重写
- [新增] `FbTitleFormat.EvalWithMetadb` / `FbMetadbHandle.GetFileInfo` 新增 `want_full_info` 参数，可访问被 `LargeFieldsConfig-v2` 屏蔽的标签
- 默认不初始化 D2D 资源，仅在首次 `window.DrawMode = 1` 时初始化

### v4.1.0 beta 1 [2026-02-19]

- [新增] **Direct2D 绘制后端**：`window.DrawMode = 1` 启用。所有 GDI+ 方法均有对应实现，现有脚本兼容。新增 `d2d.*` 命名空间及 `D2DGraphics`、`D2DBitmap`、`D2DFont`、`D2DEffect` 对象
- [新增] `window.EraseOnRepaint`：控制 `on_paint` 前是否用背景色清空面板（默认 `true`）
- [新增] Performance API（`performance` 命名空间 + `PerformanceObserver`）
- [新增] 代码编辑器增强：`Ctrl+/` 切换注释、折叠块点击展开
- [更新] JS 引擎升级至 SpiderMonkey 140.7.1esr
- [新增] 所有 JSplitter 对话框支持深色主题
- [修复] `GdiGraphics.EstimateLineWrap` 传入负值 `max_width` 时卡死
- [新增] `utils` 命名空间新增方法：`ConvertToAscii`、`CopyFile`、`CopyFolder`、`CreateFolder`、`GetLastModified`、`ListFonts`、`ReadUTF8`、`RemovePath`、`RenamePath`、`ReplaceIllegalChars`

### v4.0.5.1-alpha [2025-11-21]

- [更新] JS 引擎升级至 SpiderMonkey 128.14.0esr
- [修复] `FbMetadbHandleList.BSearch` 失败时返回 `4294967295`（而非 `-1`）

### v4.0.4.4-beta [2025-07-16]

- [新增] `utils.HTTPRequestAsync`：异步 HTTP 请求（GET/POST），通过 `on_http_request_done` 回调返回结果，替代 ActiveX
- `utils.ReadTextFile`：默认 codepage 改为 65001 (UTF-8)

### v4.0.4.3-beta [2025-07-13]

- [更新] JS 引擎升级至 SpiderMonkey 128.12.0esr
- [更新] 代码编辑器引擎升级至 Scintilla 5.5.7
- [修复] `FbMetadbHandleList.OrderByRelativePath`
- [修复] `plman.AddLocations` / `fb.AddLocationsAsync`

### v4.0.4 [2025-05-30]

- [更新] JS 引擎升级至 SpiderMonkey 128.11.0esr
- [修复] `plman.AddLocations` 执行期间目标播放列表索引变化时元素丢失
- [新增] `fb.GetAudioChunk` / `FbAudioChunk`：获取播放中曲目的音频采样数据用于实时可视化
- [修复] foobar2000 2.25 便携版 `RawPath` 以 `file-relative://` 开头的问题（恢复旧行为）
- [新增] `FbMetadbHandleList.SaveAs`：保存为 `.fpl` 格式
- [新增] `fb.ShowPictureViewer(image_path)`：调用内置图片查看器
- [新增] `fb.AddLocationsAsync(locations)`：后台加载文件，通过 `on_locations_added` 回调
- [新增] `window.IsDark`：当前是否使用深色主题
- [新增] `utils.DownloadFileAsync(url, path)` / `on_download_file_done`：后台下载文件
- [修复] `utils.Glob` 路径含分号时异常
- [新增] `fb.CustomVolume`：UPnP 设备音量支持
- [新增] `window.DPI`：当前系统 DPI（运行期间不变）
- [修复] 脚本源文件路径含非 ASCII 字符时异常

### v4.0.3 [2025-05-22]

- [修复] `Function.prototype.bind()` 绑定的 ActiveX 函数工作异常

### v4.0.2 [2025-05-20]

- [修复] 脚本加载方式问题
- [修复] `fb.IsMainMenuCommandChecked` 在某些情况下返回错误结果

### v4.0.1 [2025-05-18]

- [修复] 旧版播放器添加 JSplitter 面板及关闭时崩溃

### v4.0.0 [2025-05-18]

- [更新] JS 引擎升级至 SpiderMonkey 128.9.0esr
- [更新] 代码编辑器引擎升级至 Scintilla 5.5.6
- [修复] JS 引擎内存设置调整，消除脚本启动和运行时的错误
- [修复] 脚本加载和堆栈追踪输出修正
- [新增] DUI 布局编辑模式下的标准 JSplitter 上下文菜单
- [新增] 面板列表新增"伪透明"列，快速访问该选项

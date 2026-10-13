# 依赖组件版本

| 组件 | 版本 | 说明 |
|:---|:---|:---|
| JSplitter | `v4.1.11` | JavaScript 面板宿主，JSDoc 随 DLL 附带 |

> js脚本是基于`v4.1.11`编写的！！
> 当前安装的JSplitter版本是`v4.3.4`

## 发布地址

- [JSplitter - Плагины - foobar2000](https://foobar2000.club/forum/viewtopic.php?t=6378)（俄文主站）
- [JSplitter (splitter + SMP x64 alternative)](https://hydrogenaudio.org/index.php/topic,126743.0.html)（英文 HydrogenAudio）
- [dima-lur/jsplitter](https://github.com/dima-lur/jsplitter)（GitHub 仓库）

## 版本更新记录

> 来源：俄文主站/GitHub，翻译整理。仅收录 4.0.0+ 版本。

### v4.3.4 [last week]
- **[修复]** 修复了一个 GDI+ 字体失效问题，该问题影响通过 `utils.LoadFont` 加载的字体。访问 `GdiFont.Name` 可能使底层 GDI+ 字体对象失效，并导致后续 GDI+ 绘制操作（例如 `GdiGraphics.DrawString`）使 foobar2000 崩溃。
- **[修复]** 修复了在 JavaScript 对象正在被终结时退出 foobar2000 可能发生的崩溃。COM 对象清理期间的重入窗口消息处理可能在 JavaScript 上下文已经销毁后尝试运行待处理的 JavaScript 作业。关闭生命周期和清理处理也已加固，以防止重入拆卸。
- **[更新]** 扩展 `MenuObject.SetDefault`，除项目 ID 外还可接受另一个 `MenuObject`，允许将子菜单本身设置为默认项。

### v4.3.3 [last week]
- **[修复]** 修复了 `fb.AddLocationsAsync` 和 `plman.AddLocations` 错误地将组件特定位置（例如 `3dydfy://`）解析为文件系统路径的问题。相对文件路径仍继续相对于当前脚本、包含文件或 Worker 文件解析。
- **[修复]** 移除了 `%jsplitter_fb2k%` 和 `%jsplitter_fb2k_profile%` 末尾的路径分隔符，以匹配预期的 Title Formatting 路径语法，并避免组合路径时出现双分隔符。

### v4.3.2 [last week]
- **[错误]** 修复了启动 foobar2000 时无论当前主题如何都会出现的视觉“白色闪光”。JSplitter 现在会在脚本渲染开始前，根据当前 UI 主题自行绘制初始面板背景。
- **[更新]** 移除了 `FbWindow.FrameStyle NoBorder` 模式下不必要的命中测试和光标处理，这些行为在该模式下不适用（例如 `MinWidth == MaxWidth`）。
- **[新功能]** 新增 `FbTitleFormat.EvalActivePlaylistItem` 和 `FbTitleFormat.EvalPlaylistItem`，用于在播放列表上下文中评估 Title Formatting 表达式，包括 `%list_index%` 和 `%list_total%` 等播放列表特定字段。
- **[新功能]** 新增 `MenuObject.SetDefault`，用于将菜单项标记为默认操作，并以粗体显示。可通过再次调用该方法并传入另一个项目 ID 来重新指定默认项。

### v4.3.1 [last week]
- **[新功能]** 新增两个全局 Title Formatting 字段：`%jsplitter_fb2k%` 和 `%jsplitter_fb2k_profile%`，提供 foobar2000 安装目录和配置目录路径。相同值也可作为进程环境变量使用。新增专门的 Title Formatting 文档章节，涵盖所有 JSplitter 字段。
- **[更新]** 扩展 `FbWindow.SetPseudoCaption`，新增可选参数 `maximize_on_dblclk`，用于通过双击伪标题区域最大化或还原主窗口。
- **[更新]** 统一了所有支持文件路径的 API 中的相对文件系统路径解析，包括面板脚本、包含文件和 Workers。相对路径使用调用脚本的位置解析，并回退到既定搜索位置。
- **[新功能]** 新增 `window.ScriptInfo.Path`，提供面板主脚本的完整本机文件系统路径；对于内存脚本则为空字符串。
- **[错误]** 修复了当图像文件无法打开且其路径包含花括号时，`fb.ShowPictureViewer` 可能崩溃的问题。

### v4.3.0 [2 weeks ago]
- **[更新]** 将 JavaScript 引擎更新至 SpiderMonkey 153.4.0esr。
- **[新功能]** 新增对 ES 模块的支持。作为面板 File 脚本选择的 `.mjs` 文件现在会作为 ES 模块加载，支持相对静态导入、嵌套和循环依赖、命名导出和默认导出、模块缓存、`import.meta.url`、Unicode 路径，以及模块加载、解析和求值期间的适当错误传播。
- **[更新]** 将 foobar2000 SDK 更新至 2026-10-01。
- **[新功能]** 扩展 `FbWindow` API，新增用于控制 foobar2000 主窗口的系统命令：`Minimize`、`Maximize`、`Restore` 和 `Close`，以及 `IsMinimized` 和 `IsMaximized` 状态属性。
- **[新功能]** 新增 `window.IsToolbar`，用于检测 JSplitter 面板是否作为 Columns UI 中的工具栏项托管。

### v4.2.2 [2 weeks ago]
- **[新功能]** 新增流式文件 I/O API，用于处理大文件而无需将完整内容加载到 JavaScript 内存中。`utils.OpenTextReader` 和 `utils.OpenTextWriter` 提供可选择字符编码的增量式面向行文本读写，而 `utils.OpenBinaryReader` 和 `utils.OpenBinaryWriter` 通过可复用的 `Uint8Array` 缓冲区读写二进制数据。这些 API 在面板和 Worker 领域中均可用。
- **[更新]** 扩展 `utils.ReadTextFile` 和 `utils.WriteTextFile` 的字符编码支持。文本读取现在一致支持 UTF-8、UTF-16LE/BE、UTF-32LE/BE 以及受支持的 Windows 代码页，包括在请求时自动检测字符集。`WriteTextFile` 现在也接受输出代码页，不再仅限于 UTF-8，并可为 UTF-8、UTF-16 和 UTF-32 生成可选 BOM。现有 UTF-8 默认行为保持不变以兼容旧代码。
- **[新功能]** 新增 `Worker.RunAsync`，用于方便地执行一次性后台工作，而无需手动创建和管理持久 Worker。每次调用都会创建一个临时完整 Worker 领域/线程，将提供的参数结构化克隆到其中，执行用户定义的同步或异步 JavaScript 回调，将结果结构化克隆回面板，并随后自动终止 Worker。它适用于合理粗粒度的隔离任务，例如大文件处理，否则自定义 Worker 消息协议会增加不必要的样板代码。
- **[新功能]** 新增原生 SQLite API，在面板和 Worker 领域中均可用。`utils.OpenDatabase` 可打开基于文件或内存的数据库，并返回 `SQLiteDatabase` 对象，支持直接 SQL 执行、参数化查询、事务以及通过 `SQLiteStatement` 使用可复用预处理语句。JavaScript 值可以安全地绑定为 SQL 参数，查询行以普通 JavaScript 对象返回，SQLite BLOB 值以 `Uint8Array` 暴露。相对数据库路径遵循 JSplitter 的脚本相对路径解析，同时也支持 `:memory:` 数据库。
- **[新功能]** 新增 `utils.LoadFont`，用于直接从脚本包加载自定义 TrueType/OpenType 字体，而无需将其安装到 Windows。加载的字体对 foobar2000 进程私有，可用于 GDI 和 Direct2D 字体 API，并在面板和 Worker 领域之间共享。相对路径使用 JSplitter 的脚本相对路径解析，允许字体与主脚本、包含文件或 Worker 源文件一起打包。重复加载同一文件是安全的，加载的字体在 foobar2000 进程生命周期内保持可用。
- **[新功能]** 新增 `fb.Window` API，用于直接从面板脚本控制 foobar2000 主窗口。该 API 暴露当前窗口位置和外框尺寸，允许移动和调整窗口大小，在默认框架、无标题栏和无边框样式之间切换，进入或离开全屏模式，并配置最小和最大尺寸约束。在 Default User Interface 下，它还可以隐藏或恢复主菜单和状态栏。这些设置会影响实际的 foobar2000 顶层窗口，并可在运行时动态更改。自本版本起，`window.FoobarWindowX`、`window.FoobarWindowY`、`window.FoobarWindowWidth`、`window.FoobarWindowHeight` 和 `window.MoveFoobarWindow` 已弃用，并将在未来版本中移除。新代码应使用 `fb.Window` 几何属性和 `Move`。
- **[更新]** 扩展 `utils.GetWaveformAsync`，新增可选 `on_progress` 回调。已最终确定的波形包络范围现在可以在解码仍在进行时交付，使波形 UI 能够渐进显示，而不必等待完整音轨解码完成。回调会接收每个新的 `Float32Array` 范围及其输出偏移，并可返回 `false` 以取消过时的解码请求。返回的 Promise 仍会在解码正常完成时解析为完整波形。新增了渐进式波形加载示例。
- **[新功能]** 在 JSplitter 的 Advanced preferences 下新增 Playback Statistics Title Format 设置。该设置控制用于识别 JSplitter 内部播放统计索引中曲目的 title-format 表达式，允许在默认 `$lower(%artist% - %title%)` 身份不足以匹配的媒体库中调整匹配方案。更改该设置需要重启 foobar2000。
- **[更新]** 扩展 `fb.ShowPictureViewer`。除了直接从文件路径打开图像外，它现在还可以接受 `FbMetadbHandle` 和可选专辑封面类型。在这种形式下，foobar2000 会自行解析并打开请求的艺术作品，包括嵌入式和外部专辑封面。
- **[新功能]** 新增用于多流媒体文件的音频流选择 API。`fb.GetAudioStreams` 枚举活动输入解码器暴露的所有音频流，并返回其完整 `FbFileInfo` 数据以及流索引、解码器默认值和当前用户选择状态。`fb.SetAudioStream` 存储曲目的选定流偏好，并且在应用于当前播放项时重启播放，使新流立即生效，同时从当前位置继续播放。流选择使用 foobar2000 原生输入流选择器，且 `SetAudioStream` 需要 foobar2000 2.0 或更新版本。
- **[错误]** 修复了处理已保存的 JSplitter 布局时的问题，这些布局引用了由不再安装或当前不可用组件提供的 UI Elements。缺失的子元素现在会被安全处理，并由 UI Element not found 占位符表示，而不是导致不正确的面板恢复或初始化行为。
- **[错误]** 修复了在更新或移除当前正在使用的脚本包后重启 foobar2000 时偶发挂起的问题。现在仅在 Package Manager 和面板配置对话框完全关闭后请求重启，防止关闭过程卡在嵌套模态消息循环中。
- **[更新]** 将源代码编辑器引擎更新至 Scintilla 5.6.7。

### v4.2.1 [3 weeks ago]
- **[新功能]** 新增 BroadcastChannel API，用于 JSplitter 面板和 Workers 之间的异步通信。具有相同通道名称的实例可以交换结构化克隆消息，而无需在领域之间共享实时 JavaScript 值。对于新代码，推荐使用 BroadcastChannel 替代旧的同步 `window.NotifyOthers` 机制；现有 API 仍保留以兼容旧代码。
- **[新功能]** 新增 `utils.IsOS64Bit`，用于检测 Windows 本身是否为 64 位，独立于当前 foobar2000 进程的架构。
- **[新功能]** 新增 `utils.SystemInfo`，返回系统信息快照，包括 Windows 产品名称和内部版本号、操作系统架构、总物理内存和可用物理内存、foobar2000 私有工作集使用量，以及当前 foobar2000 进程使用最多的图形适配器的专用/本地视频内存信息。VRAM 信息包括所选适配器名称、专用内存大小、当前 Windows 为该进程设置的视频内存预算，以及该进程当前本地视频内存使用量。
- **[新功能]** 新增可复用 PCM 缓冲区 API，用于实时音频处理。`FbAudioChunk.CopyDataTo` 将音频样本复制到调用者提供的 `Float32Array`，而 `fb.GetAudioChunkTo` 将可视化音频直接写入可复用的 `Float32Array`，不创建中间 `FbAudioChunk` 或 JavaScript 样本数组。现有 `fb.GetAudioChunk` 和 `FbAudioChunk.Data` 行为保持不变以兼容旧代码。新 API 显著减少了持续运行的可视化器（如频谱分析器）中的临时分配和垃圾回收压力。
- **[新功能]** 新增 `utils.GetWaveformAsync`，用于异步将音轨解码为固定大小的波形振幅包络。它可以分析完整音轨或指定时间范围，返回线性 `0.0..1.0` 振幅值作为 `Float32Array`，并且在面板和 Worker 领域中均可用。波形点根据平均局部样本峰值计算，不会将结果归一化到音轨的最响点。
- **[错误]** 重做了定时器后端，以从定时器线程协调中移除同步等待。这些等待可能不必要地阻塞执行，并在某些情况下导致面板初始化、关闭和其他定时器相关操作出现明显延迟或挂起。定时器调度和关闭现在无需阻塞调用线程即可处理。
- **[错误]** 修复了垃圾回收使用的内存分配统计。恢复了 GC 的分配计数触发，并在堆限制附近添加了安全边界，以降低在垃圾回收有机会运行前突然超过配置最大堆大小的风险。
- **[错误]** 修复了创建 `D2DStrokeStyle` 对象时的默认参数处理。显式构造现在使用与简写描边样式形式相同的默认值。
- **[更新]** 隐藏的 JSplitter 主菜单部分中的 Open component folder 和 Open documentation 命令现在始终可用，即使当前没有 JSplitter 面板拥有键盘焦点。

### v4.2.0 beta 1 [last month]
- **[更新]** 新增 Worker API，用于在后台线程上运行 JavaScript。Workers 支持消息传递、适用的现有 JSplitter API、离屏 GDI/Direct2D 渲染、结构化克隆和可转移对象、外部脚本文件和包含文件。要开始有效使用这个新 API，应仔细研究提供的文档。
- **[更新]** 重大变更！完全重做了 `window.JsMemoryStats`，采用新的内存统计模型和重命名字段，并新增当前面板所属 Workers 的内存使用信息。
- **[更新]** 重做了 Advanced > Performance > GC 下的垃圾回收设置。移除了基于可用系统内存的自动配置；GC 和堆限制现在由显式设置和固定默认值控制：主线程最大堆大小 — 1024 MB，每个 Worker 最大堆大小 — 256 MB，GC 前堆增长 — 64 MB，GC 前外部内存增长 — 256 MB。这使内存限制和 GC 行为可预测，并允许在需要时独立调整。堆和外部内存增长设置适用于主线程和每个 Worker。
- **[新功能]** 在 Advanced > Performance 下新增 Use high-resolution timers 选项，默认禁用。启用后，短 `setTimeout` 和 `setInterval` 延迟可以更接近其请求值进行调度，而不再受标准 Windows 定时器粒度限制。这可以改善高刷新率动画和其他时间敏感代码。现有隐式依赖较粗定时器粒度的脚本在启用此选项时可能表现不同，因为回调可能比之前运行得频繁得多。例如，动画或其他状态如果按每次回调推进，而不是按经过时间推进，可能会进展更快，CPU 使用率也可能增加。在高负载下，这也可能导致渲染（主）线程明显变慢，因此现有代码可能需要适配此定时器后端。仅支持 Windows 10 版本 1803 及更高版本。
- **[新功能]** 新增只读属性 `utils.HighResolutionTimersEnabled`，用于面板和 Worker 领域，允许脚本检测高分辨率定时器后端是否实际处于活动状态，并据此调整调度/让出策略。该值派生自 Advanced Preferences > Performance > Use high-resolution timers，但报告的是有效运行时状态，而不仅仅是复选框状态：仅当选项已启用且当前 Windows 版本实际支持高分辨率可等待定时器时返回 `true`；否则返回 `false`。
- **[新功能]** 扩展 `on_paint`，传入实际更新矩形：`on_paint(gr, x, y, width, height)`。现有 `on_paint(gr)` 处理程序仍完全兼容。这对于包含多个非重叠 UI 区域的单宿主面板特别有用，允许脚本跳过不与当前更新矩形相交的渲染区域。
- **[新功能]** 在主菜单中新增隐藏的 JSplitter 部分，可通过 Shift+Click File 菜单访问。该部分镜像了 JSplitter 上下文菜单中几乎所有可用命令，并作用于当前拥有键盘焦点的 JSplitter 面板。作为常规主菜单命令，它们还可以通过 foobar2000 的设置分配任意键盘快捷键。
- **[新功能]** 新增 `window.ShowPanelList`，用于显示当前面板的子面板列表对话框。
- **[新功能]** 新增 `window.IsFocused`，用于指示当前 JSplitter 面板是否拥有键盘焦点。
- **[新功能]** 新增 `utils.Is64Bit` 属性，用于检测 x86/x64 进程架构。
- **[错误]** 修复了在向 DUI 导入主题期间 JSplitter 缺失视觉徽章的问题。
- **[错误]** v4.1.15 回归：DUI 中的不可见面板没有收到需要更新内容的通知。
- **[错误]** 移除了 UIHacks 插件（`foo_ui_hacks`）API 的文档，因为此 API 不属于 JSplitter API。
- **[更新]** 移除了 D2D 初始化 SUCCESS 控制台消息。
- **[更新]** 改进了 complete/musicbrainz 示例：新增手动刷新、更安全的 MusicBrainz 缓存和异步请求处理、请求节流，以及更健壮的 release/链接解析。
- **[新功能]** 新增可复用的 Direct2D 描边样式支持，用于绘制可配置端点、线条连接、虚线样式、斜接限制、虚线偏移和自定义虚线图案的图元。所有接受线条样式的现有 D2D 绘制方法现在都可以使用共享的 `D2DStrokeStyle` 对象，并更新了文档和新增视觉示例。
- **[更新]** 将 JavaScript 引擎更新至 SpiderMonkey 140.16.0esr。

### v4.1.17 [Sep 4]
- **[错误]** 修复了嵌套 `gdi.PushClip/PopClip` 和 `d2d.PushClip/PopClip`。裁剪状态现在保存在栈上，并在多个裁剪区域嵌套时正确恢复。
- **[新功能]** 新增 `GdiBitmap.GetThemeColourSchemeJSON` 和 `D2DBitmap.GetThemeColourSchemeJSON`。该方法使用 OKLab 中的加权 K-means++ 分析位图颜色，并返回协调的五角色 UI 配色方案，用于背景、文本、播放背景/强调、焦点框和选择背景。可选调色板大小可由调用者调整。新增了一个很好演示该新方法的示例。
- **[更新]** 重做了 performance API，使其更接近 Web Performance / User Timing / Performance Timeline 行为。新增标准 mark 和 measure 形式及选项、重复 mark/measure 条目、有序时间线查询、改进的 PerformanceObserver 行为和静态 `PerformanceObserver.supportedEntryTypes`，同时保留现有 JSplitter 扩展以兼容旧代码。新增 Performance API 示例。
- **[新功能]** 新增原生文件系统助手（含示例）：
  - `utils.GetDrives`
  - `utils.GetDriveInfo`
  - `utils.GetShortPath`
  - `utils.GetFolderSize`
  - `utils.GetFolderSizeAsync`
- **[新功能]** 新增 `fb.GetLibraryRoots`，用于从当前媒体库内容推断唯一媒体库根路径，而无需在 JavaScript 中重建它们。
- **[更新]** 扩展 `utils.ShowHtmlDialog` 示例，演示面板 JavaScript 和 HTML 对话框之间传递数据和回调，包括 `window.external.dialogWindow`，以便正确拥有从 HTML 打开的原生对话框。
- **[更新]** 改进生成的 API 文档，新增持久可折叠导航树用于 API 成员和全局 API 搜索。
- **[更新]** 将 JS 引擎更新至 SpiderMonkey 140.15.0esr。

### v4.1.16 [Aug 31]
- **[错误]** 修复了在并行 title formatting 中评估 JSplitter 统计字段（例如 `%jsplitter_rating%`）时发生的崩溃，该问题由内部 title format 对象惰性初始化期间的竞态条件引起。
- **[新功能]** 为以下函数新增可选 `window_id` 参数，用于指定原生所有者窗口 (HWND)：
  - `plman.ShowPlaylistLockUI(playlistIndex[, window_id])`
  - `utils.FilePicker(title, default_path, filter, mode[, window_id])`
  - `utils.FolderPicker(title, default_path[, window_id])`
  - `utils.MessageBox(msg, title, buttons, icon, default_button, help_text[, window_id])`
- **[新功能]** 新增 `FbMetadbHandleList.Reverse` 和 `FbMetadbHandleList.Shuffle`，用于原地反转和随机打乱句柄列表。

### v4.1.15 [Aug 28]
- **[错误]** 重大变更！！！`plman.MovePlaylistSelection` 和 `plman.MovePlaylistSelectionV2` 不再隐式创建撤销备份。需要撤销支持的脚本必须在移动播放列表项之前显式调用 `plman.UndoBackup`，与其他播放列表内容修改保持一致。
- **[新功能]** 新增 `plman.ReorderPlaylistItems`。
- **[新功能]** 新增 `gdi.PushClip/PopClip` 和 `d2d.PushClip/PopClip`。
- **[新功能]** 扩展 `utils.ColourPicker` 对话框，新增控件：
  - HEX：RRGGBB 颜色值
  - Alpha：alpha 分量
  - Copy ARGB：用于复制当前颜色值（0xAARRGGBB 格式）的按钮
- **[新功能]** 新增 `window.external.dialogWindow`，用于 `utils.ShowHtmlDialog` 创建的 HTML 对话框，暴露对话框的原生窗口句柄，以便用于嵌套模态对话框。
- **[新功能]** 更新 `utils.ColourPicker`、`utils.FontPicker`、`utils.InputBox` 和 `utils.ShowHtmlDialog` 的模态对话框所有权处理。`window_id` 参数现在用作原生所有者窗口句柄 (HWND)，而不是被忽略，从而允许从 `utils.ShowHtmlDialog` 打开的对话框通过 `window.external.dialogWindow` 正确归属于 HTML 对话框。
- **[新功能]** 新增 `utils.RecyclePath`，用于将文件和目录移动到回收站。
- **[新功能]** 用新的文档生成器替换旧文档构建流程，并在 https://dima-lur.github.io/jsplitter 发布生成的 API 文档。

### v4.1.14 [Aug 21]
- **[错误]** 重大变更！！！将旧 `%smp_*%` title formatting 字段重命名为 `%jsplitter_*%`（组件和示例中均如此），以避免与 Spider Monkey Panel 冲突， namely：
  - `smp_playcount` → `jsplitter_playcount`
  - `smp_loved` → `jsplitter_loved`
  - `smp_first_played` → `jsplitter_first_played`
  - `smp_last_played` → `jsplitter_last_played`
  - `smp_rating` → `jsplitter_rating`
- **[错误]** 文档：修复 `Helpers.js` 中的 `vol2pos` 函数。
- **[错误]** 文档：澄清 `fb.GetOutputDevices` 活动设备行为。
- **[更新]** 将 JS 引擎更新至 SpiderMonkey 140.14.0esr。
- **[更新]** 将源代码编辑器更新至 Scintilla 5.6.6。

### v4.1.13 [Aug 8]
- **[新功能]** `utils.Glob`：路径模式通配符现在也适用于中间目录，而不仅仅是文件名。例如 `utils.Glob(fb.ProfilePath + 'image*\\album?\\*.jpg')`。
- **[更新]** 将 JS 引擎更新至 SpiderMonkey 140.13.0esr。
- **[更新]** 将源代码编辑器更新至 Scintilla 5.6.5。

### v4.1.12 [Jul 13]
- **[错误]** 修复了在 CUI 中设置单个 JSplitter 颜色和字体（不常见）时，`on_colours_changed` 和 `on_font_changed` 未触发的问题。
- **[更新]** 将源代码编辑器更新至 Scintilla 5.6.4。

### v4.1.11 [2026-06-27]

- [修复] Direct2D 模式下彩色字形字体文本不显示的 Bug

### v4.1.10 [2026-06-26]

- [修复] 脚本崩溃时调用栈中缺失源文件名
- [新增] `utils.GetCountryFlag`（详见文档）
- [更新] Visual C++ 工具包升级至 v145 (14.51.36231)

### v4.1.9 [2026-06-17]

- [修复] `utils.RunCmdAsync`：不再因等待外部进程阻塞共享异步队列；修复并行命令处理，无关命令可在另一命令等待/超时期间完成；修复可能导致 stdout/stderr 延迟完成的继承管道句柄；启动失败和空应用路径现在通过回调上报
- [修复] `utils.RunCmdAsync`：修正文档，新增 `samples\basic\RunCmdAsync.js` 示例
- [修复] `utils.Run`：修正文档，新增 `samples\basic\Run.js` 示例
- [修复] 文档多处修正（`index.html`）
- [更新] JS 引擎升级至 SpiderMonkey 140.12.0esr

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

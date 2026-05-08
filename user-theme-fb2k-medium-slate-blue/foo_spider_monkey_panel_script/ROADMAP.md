- *添加全局主题切换！on_font_changed()、on_colours_changed() 重新获取字体、颜色，重新绘制面板。*

- 添加一个panel、container对象，用于布局？

- 音质来源和音质标签合并到一个位置，hover提示文字页合并

- 字体进一步优化，全部使用CUI设置？

- 移除重复常量定义。共享开关现集中在 THEME.CFG 中，面板自有开关集中在 PANEL_CFG 中。

- *album面板专辑版本类型没有的时候会不显示前面的徽标。*

- *离屏幕渲染字体ClearType出问题，导致白色背景下字体很模糊。*

- 背景（通用函数？gr 传入图片、背景色、可控制是否遮罩一个颜色 透明度）
    - *默认主题背景*
    - *渐变色背景，提取封面，支持遮罩一个透明图层，控制颜色*
    - *封面背景，支持模糊背景模糊 GdiBitmap.StackBlur(radius)实现*
    - 接入所有panel。

- *圆角封面*
  - *专辑封面*
  - *艺人封面*

- *封面图片索引指示颜色跟随主题。*

- *cover_panel添加缓存和去除异步加载逻辑*

- 自定义tab面板
  - *tab切换面板闪速问题解决（是CUI显示了窗口标题名字导致的，隐藏即可）*
  - *按钮使用 自定义按钮实现而不是JSPlitter图个提供的，解决tooltio问题*
  - *tab样式优化*
  - *tab支持文字样式*
  - *支持下划线tab*

- 编码问题：
  - *biography.js 421行的中文，存在显示乱码的情况，动态数据（safeName）是 Unicode 正常，源码常量（“暂无艺人资料: ”）在当前文件编码下被错误解码。*
    - *改为 UTF-8 BOM 编码接口（使用方案）。*
    - *使用英文输出（使用方案）。*

- 艺人添加国旗。（维护一个映射表？）
  - biography（国家目前使用了中文， 不规范，只能模糊匹配，模糊匹配之后 再映射 到规范，然后通过规范直接映射？）
  - album（规范，直接就可以映射）

- *移除SMP，改为JSPlitter*

- *@panel_title.js 分拆为 @title_playlist.js、@title_library.js，优化函数，提取公共函数。*

- 检查控制器createTitleBarController、createPanelBackgroundController是否会内存泄露！

- 添加window.DrawMode，优化卡丁面板！

- Pseudo Transparent: window.IsTransparent 伪透明模式
  - *艺人面板*
  - 专辑面板：已添加，但是在选中其它曲目的时候背景会出问题，原因未知

- 统一管理播放状态？

- 添加一个通用背景panel

- 播放控制栏使用封面颜色

---

## 重构lib/background.js

- 重构lib/background.js
  - 模式：主题背景（纯色）、封面渐变色、封面图片
  - 主题背景：
    - 支持遮罩、支持圆角
  - 封面渐变色：
    - 支持遮罩、支持圆角（需要通过遮罩图片实现）、支持渐变角度、支持是否启用、支持颜色变化区间设置。
  - 封面图片：
    - 支持遮罩、支持圆角（需要通过遮罩图片实现）、支持blur设置

``````markdown
当前 lib/background.js 在一个模块里叠加了配置归一化、模式分发、封面获取、提色、背景图重建、缓存与绘制，复杂度集中在
 sync 参数语义和 sync/onResize 重复路径。继续在该结构上叠加“渐变圆角/图片圆角”，会进一步放大维护成本。

 本次只重构 lib/background.js，不处理 cover_panel.js / tab_stack.js
 现有接入。重点是：调用方默认尽量少写代码，同时保留高性能路径（可传 rawImg）给高级调用方。

 Recommended approach

 采用“双层调用面 + 内部单管线”方案：
 1. 对外提供“默认简洁调用面”（一参或零参）和“高级性能调用面”（显式提供 rawImg）。
 2. 内部统一收敛到一个 source 解析与更新管线，避免模式分支散落。
 3. 先完成性能链路收敛（取图、resize、blur、缓存），再接入圆角组合能力。

 Caller API simplification (new standard)

 1) 默认简洁调用面（推荐）

 - sync()：自动使用 getPreferredMetadb()，自动按需取图。
 - sync(metadb)：使用指定 metadb，自动按需取图。

 ▎ 这两种覆盖大多数调用方，不需要每次传复杂输入。

 2) 高级性能调用面（可选）

 - syncWithRaw(metadb, rawImg)：调用方已拿到封面图时使用，禁止内部重复取图。
 - syncNoArt(metadb)：调用方已确认无图时使用，禁止内部重复取图。

 3) 兼容别名（过渡期）

 - 保留 sync(metadb?, rawImg?)，内部仅做参数桥接到上述标准接口；
 - 新接入文档只推荐 sync / syncWithRaw / syncNoArt，降低误用成本。

 Internal contract (single pipeline)

 A. Source hint 统一语义

 内部统一为：
 - AUTO_FETCH（默认简洁调用面）
 - PROVIDED_RAW（syncWithRaw）
 - EXPLICIT_NO_ART（syncNoArt）

 由单一 resolveImageSource(metadb, sourceHint, rawImg) 处理，彻底消除 undefined/null/bitmap 三态在调用层暴露。

 B. Mode behavior

 - theme：只维护主题色，不触发取图。
 - cover-color：缓存 miss 时才消耗图像提色。
 - cover-image：仅在输入或尺寸变化时重建背景位图。

 C. Resize behavior

 - onResize() 只处理尺寸变化触发的 image pipeline 更新。
 - 优先复用 lastRawImg；无可复用图时仅在 AUTO_FETCH 场景内部取图。

 Internal refactor design (function-level, same file)

 1) Normalize layer

 - 统一配置归一化：mode/gradient/image/mask/shape/cacheSize。
 - 输出只读 normalizedCfg。

 2) Key builder layer

 - 集中构建 trackKey / colorKey / imageRenderKey。
 - imageRenderKey 至少包含：track、size、scaleMode、blur、shape相关维度。

 3) State/cache layer

 - colorState（theme/c1/c2）
 - imageState（bgImage/lastRawImg/lastSize）
 - colorCache、imageCache（位图释放由 cache 回调托管）

 4) Pipeline layer

 - updateColorPipeline(ctx)：theme/cover-color 路径。
 - updateImagePipeline(ctx)：cover-image 路径。
 - sync* 只做输入解析 + mode 分发，不承载细节计算。

 5) Render layer

 - paint 改为 shape-first 流程：shape -> fill(solid/gradient/image) -> mask。
 - 预留 round-rect 对 gradient/image 的统一裁剪挂点，避免新增模式特判。

 Performance strategy (must-have)

 1. 调用面降复杂同时保性能
   - 默认调用 sync()/sync(metadb) 自动路径。
   - 有图调用方用 syncWithRaw 直通，避免重复 GetAlbumArtV2。
 2. 严格缓存优先
   - 提色先查 colorCache，miss 才 _extractImageColors。
   - 背景图先查 imageCache，miss 才绘制+blur。
 3. resize 降本
   - 尺寸不变直接返回。
   - 尺寸变化命中 imageRenderKey 时直接复用。
 4. blur 控制
   - blur 只在位图重建执行。
   - blur 参数纳入 imageRenderKey，防止缓存污染。
 5. 资源生命周期单一所有权
   - 位图只由 imageCache 淘汰/clear 释放。
   - 其他路径不二次释放同一 bitmap。

 Refactor phases

 Phase 1 — 调用面收敛（先易用）

 目标
 - 建立 sync / syncWithRaw / syncNoArt 三个标准入口。
 - sync(metadb?, rawImg?) 仅保留兼容桥接。

 文件
 - lib/background.js

 验收
 - 默认调用方仅需 0~1 参数即可稳定工作。
 - 高级调用方可零重复取图。

 Phase 2 — 管线拆分与性能收敛

 目标
 - 拆分 source/key/state/pipeline 责任。
 - 合并 sync/onResize 的重复 cover-image 逻辑。

 文件
 - lib/background.js

 验收
 - 快速切歌+连续 resize 下重建次数下降。
 - 无模式行为回退。

 Phase 3 — 渲染抽象（圆角前置）

 目标
 - paint 形成 shape-first 统一流程。
 - 不改变现有可见输出前提下建立扩展挂点。

 文件
 - lib/background.js

 验收
 - rect/当前 round-rect 行为保持稳定。
 - 不引入额外取图/提色开销。

 Phase 4 — 圆角组合能力落地

 目标
 - 支持 gradient + round-rect。
 - 支持 cover-image + round-rect。

 文件
 - lib/background.js

 验收
 - 目标组合视觉正确，且缓存策略仍有效。

 Phase 5 — 新建专用验证面板 bg_panel.js

 目标
 - 新增独立测试面板，仅用于验证新 lib/background.js 的标准调用与性能路径。
 - 与现有业务面板解耦，避免调试期被业务逻辑噪声干扰。

 文件
 - bg_panel.js（新建）

 实现范围（测试面板能力）
 - 覆盖默认简洁调用：sync()、sync(metadb)。
 - 覆盖高级性能调用：syncWithRaw(metadb, rawImg)、syncNoArt(metadb)。
 - 暴露最小可切换配置（mode / gradient / shape / mask / image blur）用于人工验证。
 - 绑定 playback / selection / resize / theme 回调，验证事件链一致性。

 验收
 - 可在单面板中完整走通功能矩阵与性能观察，不依赖 cover_panel.js / tab_stack.js。
 - 作为后续调用方统一接入前的基准样板。

 Critical files

 - lib/background.js（本次核心重构文件）
 - bg_panel.js（新增：专用测试面板）

 Verification plan

 1. 易用性验证（新增重点）
   - 最小调用样例：sync()、sync(metadb) 正常。
   - 高性能样例：syncWithRaw(metadb, rawImg) 无重复取图。
 2. 契约验证
   - syncNoArt(metadb) 不触发内部取图且状态正确回退。
 3. 功能矩阵
   - mode × fill × shape × mask（重点：cover-image + round-rect；cover-color + gradient + round-rect）。
 4. 性能验证
   - 快速切歌/resize 下：取图次数、blur 次数、缓存命中率符合预期。
 5. 资源验证
   - clearCache() / unload 无位图泄漏与重复释放。
 6. 专用测试面板验证（bg_panel.js）
   - 在 bg_panel.js 中分别走通简洁调用与高级调用四条路径。
   - 通过面板内配置切换验证 mode/shape/gradient/image/mask 组合。
   - 以该面板作为后续业务面板接入前的回归基准。
``````


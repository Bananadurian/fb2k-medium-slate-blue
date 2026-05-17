- [ ] 未完成任务
- [x] 已完成任务（x小写）

## playback_button.js 

- [x] 重构元素布局计算方案，需要支持padding模式，icon尺寸需要支持定义。

## control_buttons.js

- [x] 重构元素布局计算方案，需要支持padding模式，icon尺寸需要支持定义。
- [x] 搜索添加右键功能菜单
  - [x] ~~使用占位符temp占位搜索歌曲~~
  - [x] ~~使用占位符temp占位搜索专辑~~
  - [x] ~~使用占位符temp占位搜索歌手~~
  - [x] ~~使用占位符temp新增智能列表~~

## biography.js

- [x] 艺人中文名还有自己的icon
- [x] 考虑艺人中文名字如何布局：独立一行
- [x] 图标和文字对齐问题（日历明显）：重构过对齐标记位置应该没有了，后续确认
- [ ] 伪透明模式，选中非当前播放歌曲，停止播放，背景渲染不对！
- [x] 艺人添加国旗。（维护一个映射表）
  - [x] biography（国家目前使用了中文， 不规范，只能模糊匹配，模糊匹配之后 再映射 到规范，然后通过规范直接映射）
- [x] 封面支持定义四周padding
- [x] 伪透明模式下，离屏渲染中的内容滑动后 切换tab，文案内容会显示到其它区域。
  - 重新恢复旧的初始版本的离屏渲染方案，使用位图模式，需要开启window.DrawMode = 1 才不会出现文案因为clearType渲染异常问题，并且创建位图的时候引入SetSmoothingMode(modeopt)。
- [x] 重新设计布局，重构布局，现在布局太复杂了
- [x] LINE_H、MARGIN遗留。
- [x] 移除json解析异常代码！

## album_info.js

- [x] badgeElement放到elements中管理？
- [x] 优化音质徽章计算逻辑，支持四周padding。
- [x] 语言支持解析 mp3tag 标准 // 分割数组。
- [x] album根据专辑语言添加国旗（规范，直接就可以映射）
- [x] 图标和文字对齐问题（日历明显）：重构过对齐标记位置应该没有了，后续确认
- [ ] 伪透明模式，选中非当前播放歌曲，停止播放，背景渲染不对！
- [x] 音质来源和音质标签合并到一个位置，提示也是
- [x] ~~hover提示文字页合并~~
- [x] ~~album面板专辑版本类型没有的时候会不显示前面的徽标。~~
- [x] ~~离屏幕渲染字体ClearType出问题，导致白色背景下字体很模糊。~~
- [x] 封面支持定义四周padding
- [x] 伪透明模式下，离屏渲染中的内容滑动后 切换tab，文案内容会显示到其它区域。
  - 重新恢复旧的初始版本的离屏渲染方案，使用位图模式，需要开启window.DrawMode = 1 才不会出现文案因为clearType渲染异常问题，并且创建位图的时候引入SetSmoothingMode(modeopt)。
- [x] 重新设计布局，重构布局，现在布局太复杂了
- [x] LINE_H、MARGIN遗留。

## info+rating

- [x] 优化音质徽章计算逻辑，支持四周padding。
- [x] 星星添加右键菜单取消评分？已有点击同样的评分就是取消评分
- [x] 面板宽度计算应该有问题，底部的来源图标区域会出现向右偏移情况
- [x] 点击艺人、专辑、发送通知给 tab面板切换 对应的资料信息
- [x] 重构优化布局，接入新的主题设置，参考专辑面板。
- [x] 音质来源和音质标签合并到一个位置，提示也是
- [x] ~~hover提示文字页合并~~
- [x] ~~JSPlitter编码问题处理，文件保存为：UTF8 with BOM~~
- [x] 布局细节优化
- [x] 注释移除点击打开面板的功能

## tab_container\*js

自定义tab面板

- [x] ~~tab切换面板闪速问题解决（是CUI显示了窗口标题名字导致的，隐藏即可）~~
- [x] ~~按钮使用 自定义按钮实现而不是JSPlitter图个提供的，解决tooltio问题~~
- [x] ~~tab样式优化~~
- [x] ~~tab支持文字样式~~
- [x] ~~支持下划线tab~~
- [x] ~~tab区域padding支持定制四周~~
- [x] ~~tab的子panel需要支持定制四周~~

### tab_container_playlist.js

~~支持双击tab创建播放列表、搜索媒体库。~~

## bg_panel\*

- [x] 接入所有panel, 没有必要使用伪透明模式穿透即可！

### lib/background.js

- [x] ~~支持定制子panel四周padding~~
- [x] ~~默认主题背景~~
- [x] ~~渐变色背景，提取封面，支持遮罩一个透明图层，控制颜色~~
- [x] ~~封面背景，支持模糊背景模糊 GdiBitmap.StackBlur(radius)实现~~
- [x] ~~添加一个通用背景panel~~
- [ ] 背景颜色新增自定义颜色模式。（当前直接遮罩一个颜色就可以了，但是透明度不支持）
- [ ] 背景颜色支持透明度设置。
- [ ] 支持定制图片

### bg_panel_container_playlistview.js

### bg_panel_container_control.js

- [ ] 播放控制栏使用封面颜色（支持）
  - [ ] 当前版本使用通知同步背景，但是很卡！

## 封面cover_panel.js

- [x] 停止播放没有显示封面
- [x] ~~默认选中艺人图片，为空选中专辑封面，支持定义优先级~~
- [x] ~~圆角封面~~
  - [x] ~~专辑封面~~
  - [x] ~~艺人封面~~

- [x] ~~封面图片索引指示颜色跟随主题。~~

- [x] ~~cover_panel添加缓存和去除异步加载逻辑~~

## 其它

- [ ] 引入配置模块
  - [ ] 本地写死路径
  - [ ] 全局透明模式开启
  - [ ] d2d渲染模式
- [ ] 统一版本号后推送。
~~- [ ] TitleFormat对象使用字典管理是不是更好？不推荐！~~
- [ ] 定义panelW、panelH，不要直接使用window.Width、window.Height

- [ ] 脚本 Readme.md 文档
- [ ] 添加一个阴影遮罩在面板底部，让显示更加自然，而不是生硬的切割
- [x] 使用eslyric作为底层背景面板？让其显示动态颜色？
      该方案无法实现，伪透明模式不支持仅显示到eslyric，会穿透到最底层

- [x] 检查通知，设置通知标准。

- [ ] 全局常量
  - [x] DT_LEFT等常用组合标记位优化。
  - [x] 字体、颜色进一步优化管理，字体测量和使用都使用 THEME.TEXT.*
    - [x] cover panel 
    - [x] info rating panel
    - [x] playback button panel
    - [x] control button panel
    - [x] tab container * panel
    - [x] bg_panel *
    - [x] album
    - [x] biography
  - [x] 移除重复常量定义。共享开关现集中在 THEME.CFG 中，面板自有开关集中在 PANEL_CFG 中。
  - [x] 封面及面板的圆角提取？
 
- [ ] tooltip及默认文案改为英文。

- [x] ~~背景padding计算函数抽取，方便传入不同padding。~~
      ~~lib\utils.js function calcContentRect(panelW, panelH, padding)~~

- [x] ~~文件命名优化。~~

- [x] ~~添加全局主题切换！on_font_changed()、on_colours_changed() 重新获取字体、颜色，重新绘制面板。~~

- [ ] 添加一个panel、container对象，用于布局？

- [ ] 编码问题：
  - [x] ~~biography.js 421行的中文，存在显示乱码的情况，动态数据（safeName）是 Unicode 正常，源码常量（“暂无艺人资料: ”）在当前文件编码下被错误解码。~~
    - [x] ~~改为 UTF-8 BOM 编码接口（使用方案）。~~
    - [x] ~~使用英文输出（使用方案）。~~

- [x] ~~移除SMP，改为JSPlitter~~

- [x] ~~@panel_title.js 分拆为 @title\*playlist.js、@title_library.js，优化函数，提取公共函数。~~\*

- [ ] 检查控制器createTitleBarController、createPanelBackgroundController是否会内存泄露！

- [ ] 添加window.DrawMode，优化卡丁面板！

- [x] Pseudo Transparent: window.IsTransparent 伪透明模式
  - [x] ~~艺人面板~~
  - [x] ~~专辑面板：已添加，但是在选中其它曲目的时候背景会出问题，原因未知（函数执行先后导致的）~~

- [x] ~~统一管理使用那种状态的歌曲数据？播放还是选中的 resolveMetadbByMode()~~

---

````markdown
## 重构lib/background.js方案（完成）

- 重构lib/background.js
  - 模式：主题背景（纯色）、封面渐变色、封面图片
  - 主题背景：
    - 支持遮罩、支持圆角
  - 封面渐变色：
    - 支持遮罩、支持圆角（需要通过遮罩图片实现）、支持渐变角度、支持是否启用、支持颜色变化区间设置。
  - 封面图片：
    - 支持遮罩、支持圆角（需要通过遮罩图片实现）、支持blur设置

```markdown
当前 lib/background.js 在一个模块里叠加了配置归一化、模式分发、封面获取、提色、背景图重建、缓存与绘制，复杂度集中在
sync 参数语义和 sync/onResize 重复路径。继续在该结构上叠加“渐变圆角/图片圆角”，会进一步放大维护成本。

本次只重构 lib/background.js，不处理 cover_panel.js / tab_container.js
现有接入。重点是：调用方默认尽量少写代码，同时保留高性能路径（可传 rawImg）给高级调用方。

Recommended approach

采用“双层调用面 + 内部单管线”方案：

1.  对外提供“默认简洁调用面”（一参或零参）和“高级性能调用面”（显式提供 rawImg）。
2.  内部统一收敛到一个 source 解析与更新管线，避免模式分支散落。
3.  先完成性能链路收敛（取图、resize、blur、缓存），再接入圆角组合能力。

Caller API simplification (new standard)

1.  默认简洁调用面（推荐）

- sync()：自动使用 getPreferredMetadb()，自动按需取图。
- sync(metadb)：使用指定 metadb，自动按需取图。

▎ 这两种覆盖大多数调用方，不需要每次传复杂输入。

2.  高级性能调用面（可选）

- syncWithRaw(metadb, rawImg)：调用方已拿到封面图时使用，禁止内部重复取图。
- syncNoArt(metadb)：调用方已确认无图时使用，禁止内部重复取图。

3.  兼容别名（过渡期）

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

1.  Normalize layer

- 统一配置归一化：mode/gradient/image/mask/shape/cacheSize。
- 输出只读 normalizedCfg。

2.  Key builder layer

- 集中构建 trackKey / colorKey / imageRenderKey。
- imageRenderKey 至少包含：track、size、scaleMode、blur、shape相关维度。

3.  State/cache layer

- colorState（theme/c1/c2）
- imageState（bgImage/lastRawImg/lastSize）
- colorCache、imageCache（位图释放由 cache 回调托管）

4.  Pipeline layer

- updateColorPipeline(ctx)：theme/cover-color 路径。
- updateImagePipeline(ctx)：cover-image 路径。
- sync\* 只做输入解析 + mode 分发，不承载细节计算。

5.  Render layer

- paint 改为 shape-first 流程：shape -> fill(solid/gradient/image) -> mask。
- 预留 round-rect 对 gradient/image 的统一裁剪挂点，避免新增模式特判。

Performance strategy (must-have)

1.  调用面降复杂同时保性能

- 默认调用 sync()/sync(metadb) 自动路径。
- 有图调用方用 syncWithRaw 直通，避免重复 GetAlbumArtV2。

2.  严格缓存优先

- 提色先查 colorCache，miss 才 \_extractImageColors。
- 背景图先查 imageCache，miss 才绘制+blur。

3.  resize 降本

- 尺寸不变直接返回。
- 尺寸变化命中 imageRenderKey 时直接复用。

4.  blur 控制

- blur 只在位图重建执行。
- blur 参数纳入 imageRenderKey，防止缓存污染。

5.  资源生命周期单一所有权

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

- 可在单面板中完整走通功能矩阵与性能观察，不依赖 cover_panel.js / tab_container.js。
- 作为后续调用方统一接入前的基准样板。

Critical files

- lib/background.js（本次核心重构文件）
- bg_panel.js（新增：专用测试面板）

Verification plan

1.  易用性验证（新增重点）

- 最小调用样例：sync()、sync(metadb) 正常。
- 高性能样例：syncWithRaw(metadb, rawImg) 无重复取图。

2.  契约验证

- syncNoArt(metadb) 不触发内部取图且状态正确回退。

3.  功能矩阵

- mode × fill × shape × mask（重点：cover-image + round-rect；cover-color + gradient + round-rect）。

4.  性能验证

- 快速切歌/resize 下：取图次数、blur 次数、缓存命中率符合预期。

5.  资源验证

- clearCache() / unload 无位图泄漏与重复释放。

6.  专用测试面板验证（bg_panel.js）

- 在 bg_panel.js 中分别走通简洁调用与高级调用四条路径。
- 通过面板内配置切换验证 mode/shape/gradient/image/mask 组合。
- 以该面板作为后续业务面板接入前的回归基准。
```
````

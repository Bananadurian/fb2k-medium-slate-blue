/**
 * @description 艺人资料面板(v2): MBID 驱动 + JSON Schema v3.0 + Cover glob 匹配。
 *              通过 JSON_SCHEMA_MAP 模板实现 schema 版本透明升级。
 */

"use strict";

window.DrawMode = 1;

include("lib/utils.js");
include("lib/data.js");
include("lib/interaction.js");
include("lib/theme.js");
include("lib/flag.js");
include("lib/json_schema_adapter.js");
include("lib/icons.js");

window.DefineScript("Biography", {
  author: "XRE",
  version: "3.0.0",
  options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

// =========================================================================
// 全局常量配置 (Configuration)
// =========================================================================

// 面板配置开关
const PANEL_CFG = {
  showCover: true, // 是否显示封面
  coverAspectRatio: 3 / 4, // 封面宽高比
  coverMode: "cover", // 封面缩放模式 (fit=完整显示, cover=裁剪填充)
  cornerRadius: THEME.LAYOUT.CORNER_RADIUS, // 封面圆角半径, 0=直角
  coverPadding: {
    top: _scale(10),
    right: _scale(10),
    bottom: _scale(10),
    left: _scale(10),
  }, // 封面内边距
};
const JSON_DIR = window.GetProperty(
  "biography.jsonDir",
  "D:\\11_MusicLib\\_Extras\\MusicMeta\\artists\\",
);
const ARTIST_COVER_DIR = window.GetProperty(
  "biography.coverDir",
  "D:\\11_MusicLib\\_Extras\\MusicMeta\\covers\\artists\\original\\",
);
const DISCO_DATA_SOURCE = window.GetProperty(
  "biography.discoDataSource",
  "json", // "library" | "json"
);
const SCROLL_STEP = THEME.LAYOUT.SCROLL_STEP;
const ICON_SIZE = THEME.LAYOUT.ICON_SIZE;
const LINK_BTN_PAD = _scale(4); // 按钮从图标外扩尺寸 (icon → button)
const LINK_BTN_GAP = _scale(6); // 按钮间水平间距
const LINK_ROW_GAP = _scale(4); // 行间垂直间距
const IMG_CYCLE_MS = THEME.LAYOUT.IMG_CYCLE_MS;

// =========================================================================
// 视觉样式与资源 (Theme & Resources)
// =========================================================================

const COL = THEME.COL;
const TS = THEME.TEXT;

// [UI组件] TitleFormat 与 Tooltip
const MBID_TF = fb.TitleFormat(
  "$if2($meta(MUSICBRAINZ_ARTISTID),$meta(MUSICBRAINZ ARTIST ID))",
);
const albumTf = fb.TitleFormat("%date% - [%album%] ['('$meta(EDITION)')']");

let tooltip = _createDefaultTooltip();

// =========================================================================
// 全局状态变量 (State Management)
// =========================================================================

// 数据状态
let currentMbid = null; // 缓存当前加载的 MBID (用于比对是否需要重载)
let currentMetadb = null; // 当前数据来源句柄 (用于尺寸变化后重建封面)
let lastCoverProcessKey = ""; // 最近一次封面预处理签名 (避免重复重建)
let reloadSeq = 0; // 重载序列号，防止快速切换时旧任务回写
let deferredRefreshTimer = null; // 合并同帧内重复重活刷新，降低切换抖动
let deferredPaintEnsureTimer = null; // 避免在 on_paint 内执行重型封面处理
let lastCarouselTimerKey = ""; // 轮播定时器签名，未变化则不重建 interval
let artistData = null; // 解析后的艺人 JSON 数据对象
const ARTIST_CACHE = new LRUCache(THEME.CFG.CACHE_SIZE); // LRU 缓存 (存储最近访问的艺人数据和图片路径)

// 图片与轮播状态
const carousel = {
  images: [],
  index: 0,
  timer: null,
  rawPaths: [],
  fallbackMetadb: null,
};
let currentCountryFlagImg = null; // 当前国籍对应的国旗图标
let lastCountryCode = null; // 缓存 code，不变则跳过 iconMgr.get('flags', code)
// UI 视图状态
let isShowingDiscography = false; // Tab状态：False=简介(Profile), True=作品集(Discography)
let scrollY = 0; // 当前垂直滚动条位置
let maxScrollY = 0; // 最大可滚动距离
let currentText = ""; // 当前显示的文本内容
let fullTextH = 0; // 文本总高度
let errorText = "Select or play a track..."; // 空状态或错误提示文案

// 交互状态
let activeLinkBtns = []; // 当前生成的外部链接按钮数组
let activeElement = null; // [状态机] 当前鼠标悬停/激活的 UI 元素

// 布局动态计算变量
let panelW = window.Width;
let panelH = window.Height;
let genresH = _getFontLineHeight(TS.body.font);

// 固定 UI 元素定义
const elements = {
  profileBtn: {
    displayText: "Bio",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    isHover: false,
    tooltip: "",
  },
  discographyBtn: {
    displayText: "Releases",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    isHover: false,
    tooltip: "",
  },
};

// 离屏滚动文本 padding — section 与渲染器共享，保证布局一致
const SCROLL_TEXT_PADDING = {
  top: _scale(6),
  right: _scale(10),
  bottom: _scale(6),
  left: _scale(10),
};

// 区域定义 — 每个区域自带 layout/draw 逻辑，layoutSections 垂直堆叠
const SECTIONS = [
  {
    name: "cover",
    padding: PANEL_CFG.coverPadding,
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: PANEL_CFG.showCover,
    getContentHeight() {
      const rawH = Math.floor(panelW * PANEL_CFG.coverAspectRatio);
      const p = PANEL_CFG.coverPadding;
      return Math.max(0, rawH - p.top - p.bottom);
    },
    draw(gr) {
      if (!carousel.images || carousel.images.length === 0) return;
      const count = carousel.images.length;
      const idx = ((carousel.index % count) + count) % count;
      if (!carousel.images[idx]) scheduleEnsureFromPaint();
      const img = carousel.images[idx];
      if (!img) return;
      gr.DrawImage(
        img,
        this.content.x,
        this.content.y,
        this.content.w,
        this.content.h,
        0,
        0,
        img.Width,
        img.Height,
      );
      if (count > 1) {
        const ph = _getFontLineHeight(TS.body.font);
        const pp = _scale(10);
        _drawPageIndicator(
          gr,
          carousel.index,
          count,
          this.content.x + pp,
          this.content.y + this.content.h - pp - ph,
          _scale(50),
          ph,
          TS.body.font,
          TS.body.color,
          _argb(
            153,
            (COL.BG >> 16) & 0xff,
            (COL.BG >> 8) & 0xff,
            COL.BG & 0xff,
          ),
        );
      }
    },
  },
  {
    name: "title",
    padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      return _getFontLineHeight(TS.title.font);
    },
    draw(gr) {
      _drawText(
        gr,
        TS.titleLine,
        artistData.title,
        this.content.x,
        this.content.y,
        this.content.w,
        this.content.h,
      );
    },
  },
  {
    name: "aliases",
    padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
    icon: iconMgr.get("ui", "aliases"),
    iconGap: _scale(5),
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      return _getFontLineHeight(TS.body.font);
    },
    draw(gr) {
      drawIconTextSection(
        gr,
        this,
        artistData.aliases || "Unknown Aliases",
        TS.bodyLine.font,
        LEFT_LINE_FLAGS,
      );
    },
  },
  {
    name: "genres",
    padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
    icon: iconMgr.get("ui", "genres"),
    iconGap: _scale(5),
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      return genresH;
    },
    draw(gr) {
      drawIconTextSection(
        gr,
        this,
        artistData.genres || "Unknown Genre",
        TS.body.font,
        LEFT_WRAP_FLAGS,
      );
    },
  },
  {
    name: "born",
    // 双列: [Born-icon+born] [Country-icon+country]
    padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
    icon: iconMgr.get("ui", "born"),
    iconGap: _scale(5),
    icon2: iconMgr.get("ui", "country"),
    colGap: _scale(100),
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      return _getFontLineHeight(TS.body.font);
    },
    draw(gr) {
      drawBornSection(gr, this);
    },
  },
  {
    name: "links",
    padding: { left: _scale(10), top: 0, right: _scale(10), bottom: _scale(6) },
    icon: iconMgr.get("ui", "links"),
    iconGap: _scale(5),
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      const lineH = _getFontLineHeight(TS.body.font);
      const contentW = panelW - this.padding.left - this.padding.right;
      const btnsPerRow = calcLinkBtnsPerRow(contentW, this.iconGap);
      const rows = Math.min(2, Math.ceil(activeLinkBtns.length / btnsPerRow));
      if (rows <= 1) return lineH;
      const btnSize = ICON_SIZE + LINK_BTN_PAD;
      return btnSize * rows + LINK_ROW_GAP * (rows - 1);
    },
    draw(gr) {
      drawLinksSection(gr, this);
    },
  },
  {
    name: "tab",
    padding: { left: _scale(25), top: 0, right: _scale(10), bottom: 0 },
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      return _getFontLineHeight(TS.tab.font) * 2;
    },
    draw(gr) {
      drawTabSection(gr, this);
    },
  },
  {
    name: "scrollText",
    fillRemaining: true,
    padding: SCROLL_TEXT_PADDING,
    rect: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 0, h: 0 },
    visible: true,
    getContentHeight() {
      return 0;
    },
    draw(gr) {
      if (!currentText) return;
      scrollText.draw(
        gr,
        scrollY,
        this.content.x,
        this.content.y,
        this.content.w,
      );
      if (maxScrollY > 0) {
        _drawScrollbar(
          gr,
          this.content.h,
          fullTextH,
          scrollY,
          maxScrollY,
          panelW,
          this.content.y,
          COL.SCROLLBAR,
        );
      }
    },
  },
];

const SEC = {};
SECTIONS.forEach(function (sec) {
  SEC[sec.name] = sec;
});

// 离屏滚动文本渲染器
const scrollText = createScrollTextRenderer(
  TS.body.font,
  TS.body.color,
  TS.body.flags,
  SCROLL_TEXT_PADDING,
);

// 构建封面处理签名 (用于尺寸/模式变化失效)
function buildCoverProcessKey(pathsSig) {
  return [
    currentMbid,
    SEC.cover.content.w,
    SEC.cover.content.h,
    PANEL_CFG.coverMode,
    PANEL_CFG.cornerRadius,
    PANEL_CFG.showCover,
    pathsSig || "",
  ].join("|");
}

// 确保指定索引封面已处理完成
function ensureCarouselImageReady(nextIndex, carouselState, reason) {
  if (
    !carouselState ||
    !carouselState.images ||
    carouselState.images.length === 0
  )
    return false;

  // _carouselNext/_manageCarousel 可能给出越界索引，统一归一化避免切图失败
  const count = carouselState.images.length;
  const index = ((nextIndex % count) + count) % count;
  if (carouselState.images[index]) return true;

  const targetW = Math.max(1, SEC.cover.content.w);
  const targetH = Math.max(1, SEC.cover.content.h);

  if (carouselState.rawPaths && carouselState.rawPaths.length > 0) {
    const path = carouselState.rawPaths[index];
    if (!path) return false;
    try {
      let srcImg = gdi.Image(path);
      if (!srcImg) return false;
      const processed = _createRoundedImage(
        srcImg,
        targetW,
        targetH,
        PANEL_CFG.cornerRadius,
        PANEL_CFG.coverMode,
      );
      if (typeof srcImg.Dispose === "function") srcImg.Dispose();
      srcImg = null;
      if (!processed) return false;
      carouselState.images[index] = processed;
      return true;
    } catch (e) {
      console.log("Image load error: " + e);
      return false;
    }
  }

  if (carouselState.fallbackMetadb) {
    const tryTypes = [4, 0];
    for (const typeId of tryTypes) {
      let internalArt = utils.GetAlbumArtV2(
        carouselState.fallbackMetadb,
        typeId,
      );
      if (!internalArt) continue;
      const processed = _createRoundedImage(
        internalArt,
        targetW,
        targetH,
        PANEL_CFG.cornerRadius,
        PANEL_CFG.coverMode,
      );
      if (typeof internalArt.Dispose === "function") internalArt.Dispose();
      internalArt = null;
      if (processed) {
        carouselState.images[index] = processed;
        return true;
      }
    }
  }

  return false;
}
function on_size() {
  if (window.Width <= 0 || window.Height <= 0) return;
  panelW = window.Width;
  panelH = window.Height;
  // 1. 计算Tab按钮尺寸
  calcElementsBtnSize();
  // 2. 计算整体布局 (确定Y坐标和高度)
  updateLayoutMetrics();

  if (currentMetadb && currentMbid) {
    const cached = ARTIST_CACHE.get(currentMbid);
    if (cached !== undefined) {
      const pathsSig =
        cached.imgPaths && cached.imgPaths.length > 0
          ? cached.imgPaths.join("||")
          : "fallback";
      const nextKey = buildCoverProcessKey(pathsSig);
      if (nextKey !== lastCoverProcessKey) {
        loadImagesFromCache(cached.imgPaths, currentMetadb);
        lastCoverProcessKey = nextKey;
      }
    }
  }

  // 3. 生成文本缓冲 (耗时操作)
  createTextBuffer();
}

function scheduleDeferredRefresh(seq) {
  if (deferredRefreshTimer) {
    window.ClearTimeout(deferredRefreshTimer);
    deferredRefreshTimer = null;
  }
  deferredRefreshTimer = window.SetTimeout(() => {
    deferredRefreshTimer = null;
    if (seq !== reloadSeq) return;

    createLinkButtons();
    updateLayoutMetrics();
    createTextBuffer();
    if (panelW > 0) {
      window.Repaint();
    }
  }, 0);
}

function on_paint(gr) {
  gr.SetSmoothingMode(0);
  if (!window.IsTransparent) gr.FillSolidRect(0, 0, panelW, panelH, COL.BG);

  if (!artistData) {
    _drawEmptyState(
      gr,
      errorText,
      TS.title.font,
      TS.title.color,
      panelW,
      panelH,
    );
    return;
  }

  for (const sec of SECTIONS) {
    if (sec.visible) sec.draw(gr);
  }
}

function scheduleEnsureFromPaint() {
  if (deferredPaintEnsureTimer) return;
  deferredPaintEnsureTimer = window.SetTimeout(() => {
    deferredPaintEnsureTimer = null;
    if (
      !PANEL_CFG.showCover ||
      !carousel.images ||
      carousel.images.length === 0
    )
      return;

    const count = carousel.images.length;
    const index = ((carousel.index % count) + count) % count;
    if (carousel.images[index]) return;

    const changed = ensureCarouselImageReady(index, carousel, "paint-deferred");
    if (changed) {
      manageCycleTimer();
      window.RepaintRect(0, 0, panelW, SEC.cover.rect.h);
    }
  }, 0);
}

// =========================================================================
// 数据处理与缓存 (Data Processing & Cache)
// =========================================================================

/**
 * 解析 MUSICBRAINZ_ARTISTID 标签值，支持逗号分隔的多个 MBID
 * @param {string} mbidStr - MBID 原始字符串（逗号分隔）
 * @returns {Array<string>} 有效的 MBID 数组
 */
function parseArtistMbids(mbidStr) {
  if (!mbidStr) return [];
  return mbidStr
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(function (s) {
      return s.length > 0;
    });
}

/**
 * 依次尝试每个 MBID，返回第一个存在 JSON 文件的匹配
 * @param {Array<string>} mbids - MBID 数组
 * @returns {{mbid: string, jsonPath: string}|null}
 */
function tryFindArtistFiles(mbids) {
  for (let i = 0; i < mbids.length; i++) {
    const jsonPath = JSON_DIR + mbids[i] + ".json";
    if (utils.IsFile(jsonPath)) return { mbid: mbids[i], jsonPath: jsonPath };
  }
  return null;
}

/**
 * [核心] 数据加载入口：重载艺人数据
 * @param {FbMetadbHandle} metadb - 音频文件句柄
 */
function reloadArtistData(metadb) {
  if (!metadb) return;

  const seq = ++reloadSeq;
  currentMetadb = metadb;

  const mbidStr = MBID_TF.EvalWithMetadb(metadb);
  const mbids = parseArtistMbids(mbidStr);

  if (mbids.length === 0) {
    currentMbid = null;
    artistData = null;
    errorText = "No MUSICBRAINZ_ARTISTID tag";
    window.Repaint();
    return;
  }

  const fileInfo = tryFindArtistFiles(mbids);
  if (!fileInfo) {
    currentMbid = null;
    artistData = null;
    errorText = "No Biography: " + mbids[0];
    window.Repaint();
    return;
  }

  const mbid = fileInfo.mbid;

  // 同 MBID 快速返回，仅重载封面 (逻辑与旧版一致)
  if (currentMbid === mbid) {
    if (panelW > 0) {
      let coverReloaded = false;
      if (PANEL_CFG.showCover) {
        carousel.fallbackMetadb = metadb;
        if (!carousel.images || carousel.images.length === 0) {
          carousel.images = [null];
          carousel.rawPaths = [];
          carousel.index = 0;
        }

        const count = carousel.images.length;
        const index = ((carousel.index % count) + count) % count;
        if (!carousel.images[index]) {
          const changed = ensureCarouselImageReady(
            index,
            carousel,
            "same-artist-refresh",
          );
          manageCycleTimer();
          if (changed) {
            window.RepaintRect(0, 0, panelW, SEC.cover.rect.h);
            coverReloaded = true;
          }
        }
      }

      updateLayoutMetrics();
      if (coverReloaded) {
        window.Repaint();
      } else {
        window.RepaintRect(
          0,
          SEC.cover.rect.h,
          panelW,
          panelH - SEC.cover.rect.h,
        );
      }
    }
    return;
  }

  currentMbid = mbid;

  scrollY = 0;
  maxScrollY = 0;
  currentText = "";
  fullTextH = 0;

  const cacheEntry = getArtistCacheEntry(mbid, fileInfo.jsonPath);
  artistData = cacheEntry.json;
  updateCountryFlag();
  if (cacheEntry.jsonError) {
    errorText = cacheEntry.jsonError;
  } else {
    errorText = artistData ? "" : "No Biography: " + mbid;
  }

  if (panelW > 0) {
    loadImagesFromCache(cacheEntry.imgPaths, metadb, seq);
    const pathsSig =
      cacheEntry.imgPaths && cacheEntry.imgPaths.length > 0
        ? cacheEntry.imgPaths.join("||")
        : "fallback";
    lastCoverProcessKey = buildCoverProcessKey(pathsSig);

    window.Repaint();
    scheduleDeferredRefresh(seq);
  }
}

/**
 * 扫描艺人封面图片文件
 * 匹配模式: {mbid}*.{ext} — MBID 开头的所有图片文件
 *
 * 匹配优先级（按顺序尝试）:
 *   1. {mbid}.{ext}           — * 匹配 0 次，如 20244d07-....jpg
 *   2. {mbid}_{index}.{ext}   — * 匹配 "_01"、"_02" ...
 *   3. {mbid}_X_{index}.{ext} — * 匹配 "_X_01"、"_X_02" ... (手动添加的封面)
 *
 *   如需新增其他后缀（如 _musicbrainz_），在此函数中扩展 SUFFIXES 数组即可。
 *
 * @param {string} mbid - 艺人 MBID
 * @returns {Array<string>} 图片路径数组
 */
function scanImagePaths(mbid) {
  const paths = [];
  const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const MAX_INDEX = 10;
  // 后缀模板: "" 匹配 {mbid}{ext}/{mbid}_{index}{ext};
  //           "_X_" 匹配手动添加的封面 {mbid}_X_{index}.{ext}
  // const SUFFIXES = ["", "_X_"];
  const SUFFIXES = ["_X_"];

  for (let s = 0; s < SUFFIXES.length; s++) {
    const suffix = SUFFIXES[s];

    // 无索引直接匹配: {mbid}{suffix}{ext}
    if (suffix === "") {
      for (let e = 0; e < exts.length; e++) {
        const fullPath = ARTIST_COVER_DIR + mbid + exts[e];
        if (utils.IsFile(fullPath)) paths.push(fullPath);
      }
    }

    // 索引匹配: {mbid}{suffix}{01..10}{ext}
    for (let idx = 1; idx <= MAX_INDEX; idx++) {
      const numStr = (idx < 10 ? "0" : "") + idx;
      let found = false;
      for (let e = 0; e < exts.length; e++) {
        const fullPath = ARTIST_COVER_DIR + mbid + suffix + numStr + exts[e];
        if (utils.IsFile(fullPath)) {
          paths.push(fullPath);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  return paths;
}

/**
 * 获取缓存的艺人数据，如果不存在则读取文件
 * @param {string} mbid - 艺人 MBID
 * @param {string} jsonPath - JSON 文件完整路径（已确认存在）
 */
function getArtistCacheEntry(mbid, jsonPath) {
  // 命中缓存：直接返回 (LRUCache.get 自动刷新到最新位置)
  const cached = ARTIST_CACHE.get(mbid);
  if (cached !== undefined) return cached;

  // 未命中：读取并归一化 JSON
  let jsonData = null;
  let jsonErrorData = null;
  const rawText = utils.ReadTextFile(jsonPath);
  try {
    const rawJson = JSON.parse(rawText);
    jsonData = normalizeArtistData(rawJson);
  } catch (e) {
    jsonData = {
      title: mbid,
      aliases: "",
      genres: "",
      born: "",
      country: "",
      countryCode: null,
      artistbiography: "",
      links: {},
    };
    jsonErrorData = "JSON Error (" + jsonPath + "): " + String(e);
    console.log(jsonErrorData);
  }

  // 扫描封面路径 (MBID 前缀匹配)
  const paths = scanImagePaths(mbid);
  const entry = { json: jsonData, imgPaths: paths, jsonError: jsonErrorData };

  ARTIST_CACHE.set(mbid, entry);
  return entry;
}

/**
 * 根据路径加载图片资源
 * @param {Array<String>} paths - 图片路径数组
 * @param {FbMetadbHandle} metadb - 音频句柄 (用于Fallback)
 */
function loadImagesFromCache(paths, metadb, seq) {
  if (carousel.images && carousel.images.length > 0) {
    carousel.images.forEach((img) => {
      if (img && typeof img.Dispose === "function") img.Dispose();
    });
  }
  carousel.images = [];
  carousel.index = 0;
  carousel.rawPaths = [];
  carousel.fallbackMetadb = null;

  if (!PANEL_CFG.showCover) {
    manageCycleTimer();
    return;
  }

  const targetW = Math.max(1, SEC.cover.content.w);
  const targetH = Math.max(1, SEC.cover.content.h);

  if (paths && paths.length > 0) {
    carousel.rawPaths = paths.slice();
    carousel.images = new Array(paths.length).fill(null);

    try {
      let srcImg = gdi.Image(paths[0]);
      if (srcImg) {
        const processed = _createRoundedImage(
          srcImg,
          targetW,
          targetH,
          PANEL_CFG.cornerRadius,
          PANEL_CFG.coverMode,
        );
        if (typeof srcImg.Dispose === "function") srcImg.Dispose();
        srcImg = null;
        if (processed) carousel.images[0] = processed;
      }
    } catch (e) {
      console.log("Image load error: " + e);
    }

    if (!carousel.images[0]) {
      ensureCarouselImageReady(0, carousel, "initial");
    }

    manageCycleTimer();
    return;
  }

  carousel.fallbackMetadb = metadb;
  carousel.images = [null];
  manageCycleTimer();

  window.SetTimeout(() => {
    // 切歌很快时，旧轮次的 deferred fallback 不能覆盖当前艺人状态
    if (typeof seq === "number" && seq !== reloadSeq) return;
    if (!carousel.fallbackMetadb) return;

    ensureCarouselImageReady(0, carousel, "fallback-deferred");
    if (!carousel.images[0]) {
      carousel.images = [];
    }

    manageCycleTimer();
    window.RepaintRect(0, 0, panelW, SEC.cover.rect.h);
  }, 0);
}

/**
 * 管理图片轮播定时器
 */
function manageCycleTimer() {
  const nextKey = [
    PANEL_CFG.showCover ? 1 : 0,
    carousel.images && carousel.images.length > 1 ? 1 : 0,
    SEC.cover.rect.h,
    panelW,
  ].join("|");
  if (nextKey === lastCarouselTimerKey) return;
  lastCarouselTimerKey = nextKey;
  _manageCarousel(
    carousel,
    SEC.cover.rect.h,
    IMG_CYCLE_MS,
    panelW,
    ensureCarouselImageReady,
  );
}

/**
 * 获取艺人作品集（根据配置选择数据源）
 * @returns {string} 格式化后的专辑列表文本
 */
function getDiscoText() {
  // 1. 检查缓存
  if (artistData.discography && Array.isArray(artistData.discography)) {
    if (artistData.discography.length === 0)
      return "No albums found for this artist";
    return artistData.discography.join("\n");
  }

  // 2. 根据配置选择数据源
  let resultList = [];

  if (DISCO_DATA_SOURCE === "json") {
    resultList = getDiscoFromJson();
  } else {
    resultList = getDiscoFromLibrary();
  }

  // 3. 写入缓存
  artistData.discography = resultList;

  // 4. 返回结果
  if (resultList.length === 0) return "No albums found for this artist";
  return resultList.join("\n");
}

/**
 * 从 foobar2000 音乐库查询艺人作品集
 * @returns {string[]} 格式化后的专辑列表
 */
function getDiscoFromLibrary() {
  const safeQueryName = artistData.title.replace(/'/g, "''");
  const query = "%artist% HAS " + safeQueryName;
  const matches = fb.GetQueryItems(fb.GetLibraryItems(), query);

  if (matches.Count === 0) return [];

  // 排序：按日期降序
  matches.OrderByFormat(albumTf, -1);

  // 格式化并去重
  const rawStrings = albumTf.EvalWithMetadbs(matches);
  const uniqueSet = new Set(rawStrings);

  return Array.from(uniqueSet);
}

/**
 * 从 JSON 数据读取艺人作品集
 * @returns {string[]} 格式化后的专辑列表
 */
function getDiscoFromJson() {
  // 1. 检查 JSON 数据是否存在
  if (!artistData.releaseGroups || !Array.isArray(artistData.releaseGroups)) {
    return [];
  }

  // 2. 按日期降序排序（最新的在前），无日期的排在末尾
  const sorted = artistData.releaseGroups.slice().sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";

    // 无日期排在末尾
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateB.localeCompare(dateA); // 降序
  });

  // 3. 格式化为带序号的输出
  // 格式: "01. 2023-01-01 - Album Title (Live, Compilation)"
  const formatted = sorted.map((rg, index) => {
    const num = String(index + 1).padStart(2, "0");
    let line = num + ". " + (rg.date || "") + " - " + (rg.title || "");

    // 仅添加 secondary_types 标注（如 Live, Compilation, Remix）
    // 与现有 library 模式保持一致，不显示 primary_type
    if (Array.isArray(rg.secondary_types) && rg.secondary_types.length > 0) {
      line += " (" + rg.secondary_types.join(", ") + ")";
    }

    return line;
  });

  return formatted;
}

// =========================================================================
// 布局与几何计算 (Layout & Geometry)
// =========================================================================

/** @param {Object} sec - SECTIONS item with icon/iconGap */
function drawIconTextSection(gr, sec, text, font, flags) {
  const cx = sec.content.x,
    cy = sec.content.y,
    cw = sec.content.w,
    ch = sec.content.h;
  if (sec.icon) {
    _drawIcon(gr, sec.icon, cx, cy, ch);
  }
  const tx = cx + ICON_SIZE + sec.iconGap;
  gr.GdiDrawText(
    text,
    font,
    COL.FG,
    tx,
    cy,
    cw - ICON_SIZE - sec.iconGap,
    ch,
    flags,
  );
}
/** @param {Object} sec - SECTIONS born item with icon/icon2/colGap */
function drawBornSection(gr, sec) {
  const cx = sec.content.x,
    cy = sec.content.y,
    ch = sec.content.h,
    cw = sec.content.w;
  if (sec.icon) {
    _drawIcon(gr, sec.icon, cx, cy, ch);
  }
  const tx1 = cx + ICON_SIZE + sec.iconGap;
  _drawText(
    gr,
    TS.bodyLine,
    artistData.born || "-",
    tx1,
    cy,
    sec.colGap - sec.iconGap - ICON_SIZE,
    ch,
  );
  // 第二列: country (国旗优先，无国旗回退通用位置图标)
  const cx2 = cx + sec.colGap;
  if (currentCountryFlagImg) {
    _drawIcon(gr, currentCountryFlagImg, cx2, cy, ch);
  } else if (sec.icon2) {
    _drawIcon(gr, sec.icon2, cx2, cy, ch);
  }
  const tx2 = cx2 + ICON_SIZE + sec.iconGap;
  _drawText(
    gr,
    TS.bodyLine,
    artistData.country || "-",
    tx2,
    cy,
    cw - sec.colGap - ICON_SIZE - sec.iconGap,
    ch,
  );
}

/** @param {Object} sec - SECTIONS links item, reads activeLinkBtns */
function drawLinksSection(gr, sec) {
  const cx = sec.content.x,
    cy = sec.content.y,
    ch = sec.content.h;
  if (sec.icon) {
    _drawIcon(gr, sec.icon, cx, cy, ch);
  }
  activeLinkBtns.forEach((btn) => {
    if (btn.img)
      gr.DrawImage(
        btn.img,
        btn.x,
        btn.y,
        btn.w,
        btn.h,
        0,
        0,
        btn.img.Width,
        btn.img.Height,
      );
  });
}

function calcLinkBtnsPerRow(contentW, iconGap) {
  const iconSpace = ICON_SIZE + iconGap;
  const btnTotalW = ICON_SIZE + LINK_BTN_PAD + LINK_BTN_GAP;
  return Math.max(
    1,
    Math.floor((contentW - iconSpace + LINK_BTN_GAP) / btnTotalW),
  );
}

function layoutLinkButtonPositions(sec) {
  const btnSize = ICON_SIZE + LINK_BTN_PAD;
  const startX = sec.content.x + ICON_SIZE + sec.iconGap;
  const btnsPerRow = calcLinkBtnsPerRow(sec.content.w, sec.iconGap);
  activeLinkBtns.forEach((btn, i) => {
    const row = Math.min(1, Math.floor(i / btnsPerRow));
    const col = i % btnsPerRow;
    btn.x = startX + col * (btnSize + LINK_BTN_GAP);
    btn.y = sec.content.y + _scale(1) + row * (btnSize + LINK_ROW_GAP);
  });
}

/** @param {Object} sec - SECTIONS tab item */
function drawTabSection(gr, sec) {
  const pBtn = elements.profileBtn;
  const dBtn = elements.discographyBtn;
  const isProfile = !isShowingDiscography;

  const pColor = isProfile ? COL.FG : pBtn.isHover ? COL.FRAME : COL.FG;
  const dColor = !isProfile ? COL.FG : dBtn.isHover ? COL.FRAME : COL.FG;

  gr.GdiDrawText(
    pBtn.displayText,
    isProfile ? TS.tab.font : TS.body.font,
    pColor,
    pBtn.x,
    pBtn.y,
    pBtn.w,
    pBtn.h,
    CENTER_WRAP_FLAGS,
  );
  gr.GdiDrawText(
    dBtn.displayText,
    !isProfile ? TS.tab.font : TS.body.font,
    dColor,
    dBtn.x,
    dBtn.y,
    dBtn.w,
    dBtn.h,
    CENTER_WRAP_FLAGS,
  );

  const activeBtn = isProfile ? pBtn : dBtn;
  _drawTabIndicator(gr, activeBtn, panelW, _scale(10), COL.FRAME, COL.FG);
}

function updateLayoutMetrics() {
  // 更新 aliases 区域可见性
  SEC.aliases.visible = artistData && artistData.aliases;

  // 3. 计算风格高度 (最多 2 行)
  const lineW = Math.max(
    1,
    panelW - SEC.genres.padding.left - SEC.genres.padding.right,
  );
  if (artistData && artistData.genres) {
    genresH = _measureText(artistData.genres, TS.body, lineW).Height;
    genresH = Math.min(genresH, _getFontLineHeight(TS.body.font) * 2);
  } else {
    genresH = _getFontLineHeight(TS.body.font);
  }

  // 4. 更新 links 区域可见性
  SEC.links.visible = activeLinkBtns && activeLinkBtns.length > 0;

  // 5. 一次性布局所有 section (cover → title → ... → tab → scrollText)
  layoutSections(SECTIONS, panelW, panelH);

  // 6. 更新链接按钮 X/Y 坐标
  if (SEC.links.visible) layoutLinkButtonPositions(SEC.links);

  // 7. 设置 Tab 按钮位置
  const tabCx = SEC.tab.content.x;
  elements.profileBtn.x = tabCx;
  elements.profileBtn.y =
    SEC.tab.content.y +
    Math.ceil((SEC.tab.content.h - elements.profileBtn.h) / 2);
  elements.discographyBtn.x = tabCx + elements.profileBtn.w + _scale(5);
  elements.discographyBtn.y = elements.profileBtn.y;

  manageCycleTimer();
}

/**
 * 计算 Tab 按钮的尺寸和 X 坐标
 */
function calcElementsBtnSize() {
  const pM = _measureText(elements.profileBtn.displayText, TS.tab, panelW);
  elements.profileBtn.w = pM.Width;
  elements.profileBtn.h = pM.Height;

  const dM = _measureText(elements.discographyBtn.displayText, TS.tab, panelW);
  elements.discographyBtn.w = dM.Width;
  elements.discographyBtn.h = dM.Height;
}

// 测量文本高度并更新滚动状态
function createTextBuffer() {
  currentText = "";
  fullTextH = 0;

  if (
    !artistData ||
    SEC.scrollText.content.w <= 0 ||
    SEC.scrollText.content.h <= 0
  )
    return;

  currentText = isShowingDiscography
    ? getDiscoText()
    : artistData.artistbiography || "No biography available";

  const measured = _measureText(currentText, TS.body, SEC.scrollText.content.w);
  fullTextH = Math.max(1, Math.min(Math.ceil(measured.Height), _scale(2000)));

  maxScrollY = Math.max(0, fullTextH - SEC.scrollText.content.h);
  if (scrollY > maxScrollY) scrollY = maxScrollY;
  scrollText.ensure(currentText, panelW, fullTextH);
}
/**
 * 根据艺人国籍解析国旗图标。
 * 调用 lib/flag.js resolveCountryCode() 做正则匹配，支持 "美国纽约" 等地址串。
 */
function updateCountryFlag() {
  if (!artistData || (!artistData.country && !artistData.countryCode)) {
    currentCountryFlagImg = null;
    lastCountryCode = null;
    return;
  }
  const code = artistData.countryCode || resolveCountryCode(artistData.country);
  if (code === lastCountryCode) return;
  lastCountryCode = code;
  currentCountryFlagImg = code
    ? iconMgr.get("flags", code.toUpperCase())
    : null;
}

/**
 * 初始化链接按钮对象
 */
function createLinkButtons() {
  activeLinkBtns = [];
  if (!artistData || !artistData.links) return;

  const btnSize = ICON_SIZE + LINK_BTN_PAD;

  for (let key in artistData.links) {
    let url = artistData.links[key];
    if (url && url.length > 0) {
      activeLinkBtns.push({
        name: key,
        url: url,
        x: 0,
        y: 0, // 占位，updateLayoutMetrics → layoutLinkButtonPositions 计算实际值
        w: btnSize,
        h: btnSize,
        img: iconMgr.get("brands", key),
        isHover: false,
        tooltip: key,
      });
    }
  }
}

// =========================================================================
// 交互事件处理 (Event Handlers)
// =========================================================================

function on_mouse_wheel(step) {
  if (!currentText || maxScrollY <= 0) return;
  scrollY -= step * SCROLL_STEP;
  scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
  window.RepaintRect(
    0,
    SEC.scrollText.rect.y,
    panelW,
    panelH - SEC.scrollText.rect.y,
  );
}

// [核心] 状态机：on_mouse_move
function on_mouse_move(x, y) {
  let target = null;

  // 1. 检测 Tab 按钮
  if (_hitTest(x, y, elements.profileBtn)) {
    target = elements.profileBtn;
  } else if (_hitTest(x, y, elements.discographyBtn)) {
    target = elements.discographyBtn;
  }
  // 2. 检测链接按钮
  else {
    for (let btn of activeLinkBtns) {
      if (_hitTest(x, y, btn)) {
        target = btn;
        break;
      }
    }
  }

  // 3. 状态切换
  if (activeElement === target) return; // 没变，直接返回

  // 旧元素复位
  if (activeElement) {
    activeElement.isHover = false;
    window.RepaintRect(
      activeElement.x,
      activeElement.y,
      activeElement.w,
      activeElement.h,
    );
  }

  // 新元素激活
  if (target) {
    target.isHover = true;
    window.RepaintRect(target.x, target.y, target.w, target.h);
    tooltip(target.tooltip || "");
    _setCursor(CURSOR_HAND); // Hand 手型光标
  } else {
    tooltip("");
    _setCursor(CURSOR_ARROW); // Arrow 箭头光标
  }

  activeElement = target;
}

function on_mouse_leave() {
  if (activeElement) {
    activeElement.isHover = false;
    window.RepaintRect(
      activeElement.x,
      activeElement.y,
      activeElement.w,
      activeElement.h,
    );
    activeElement = null;
  }
  tooltip("");
  _setCursor(CURSOR_ARROW);
}

function on_mouse_lbtn_up(x, y) {
  // 1. 封面点击 (切换图片)
  if (
    PANEL_CFG.showCover &&
    y < SEC.cover.rect.y + SEC.cover.rect.h &&
    carousel.images.length > 1
  ) {
    _carouselNext(
      carousel,
      SEC.cover.rect.h,
      IMG_CYCLE_MS,
      panelW,
      ensureCarouselImageReady,
    );
    return;
  }

  // 2. Tab 切换
  if (_hitTest(x, y, elements.profileBtn)) {
    isShowingDiscography = false;
    scrollY = 0;
    createTextBuffer();
    if (window.IsTransparent) {
      window.Repaint();
    } else {
      window.RepaintRect(
        0,
        elements.profileBtn.y,
        panelW,
        panelH - elements.profileBtn.y,
      );
    }
    return;
  } else if (_hitTest(x, y, elements.discographyBtn)) {
    isShowingDiscography = true;
    scrollY = 0;
    createTextBuffer();
    window.RepaintRect(
      0,
      elements.profileBtn.y,
      panelW,
      panelH - elements.profileBtn.y,
    );
    return;
  }

  // 3. 链接点击 (ActiveX 延迟加载)
  activeLinkBtns.forEach((btn) => {
    if (_hitTest(x, y, btn)) {
      try {
        // 仅在点击时实例化 WScript.Shell，节省常驻资源
        const WshShell = new ActiveXObject("WScript.Shell");
        WshShell.Run(btn.url);
      } catch (e) {
        console.log("Link Error: " + e);
      }
    }
  });
}

// 播放/停止/切歌 -> 触发数据更新
function on_playback_new_track(metadb) {
  reloadArtistData(metadb);
  if (window.IsTransparent) {
    window.SetTimeout(() => {
      window.Repaint();
    }, 0);
  }
}

function on_playback_stop(reason) {
  if (reason !== 2) {
    reloadArtistData(resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_ONLY));
  }
}

function on_playlist_items_selection_change() {
  const target = resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_FIRST);
  if (target) {
    reloadArtistData(target);
  } else {
    currentMbid = null;
    artistData = null;
    errorText = "Select or play a track...";
    if (panelW > 0) {
      window.Repaint();
    }
  }
  // console.log("=========" + window.IsTransparent)
}

function on_colours_changed() {
  _refreshThemeColors();
  createTextBuffer();
  window.Repaint();
}

function on_font_changed() {
  _refreshThemeFonts();
  createTextBuffer();
  window.Repaint();
}

// 脚本卸载/重载时释放资源
function on_script_unload() {
  if (deferredPaintEnsureTimer) {
    window.ClearTimeout(deferredPaintEnsureTimer);
    deferredPaintEnsureTimer = null;
  }
  if (deferredRefreshTimer) {
    window.ClearTimeout(deferredRefreshTimer);
    deferredRefreshTimer = null;
  }
  if (carousel.timer) {
    window.ClearInterval(carousel.timer);
    carousel.timer = null;
  }
  if (carousel.images && carousel.images.length > 0) {
    carousel.images.forEach((img) => {
      if (img && typeof img.Dispose === "function") img.Dispose();
    });
  }
  scrollText.dispose();
  _measureDispose();
  ARTIST_CACHE.clear();
  // iconMgr 缓存由 JSplitter 管理生命周期，此处不手动清理
}

// =========================================================================
// 初始化执行 (Initialization)
// =========================================================================

const initSelection = resolveMetadbByMode(METADB_RESOLVE_MODE.SELECTION_ONLY);
if (initSelection) {
  reloadArtistData(initSelection);
} else {
  const initPlaying = resolveMetadbByMode(METADB_RESOLVE_MODE.PLAYING_ONLY);
  if (initPlaying) {
    reloadArtistData(initPlaying);
  }
}

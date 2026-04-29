/**
 * @file BIOGRAPHY.js
 * @author XYSRe
 * @created 2025-12-23
 * @updated 2026-04-14
 * @version 1.6.9
 * @description 艺人资料面板 (优化版：修复高度计算Bug，延迟加载ActiveX，增强注释)
 */

"use strict";

// =========================================================================
// 1. 脚本定义与基础工具 (Script Definition & Utils)
// =========================================================================

window.DefineScript("BIOGRAPHY", {
    author: "XYSRe",
    version: "1.6.9",
    options: { grab_focus: false }
});

const DPI = window.DPI;

/**
 * 根据 DPI 缩放像素值
 * @param {number} size - 原始像素值 (基于 96 DPI / 72pt)
 * @returns {number} 缩放后的像素值
 */
function _scale(size) {
    return Math.round((size * DPI) / 72);
}

/**
 * 生成颜色值的辅助函数
 */
function _RGB(r, g, b) {
    return 0xff000000 | (r << 16) | (g << 8) | b;
}

/**
 * 安全加载图片，文件不存在则返回 null
 */
function load_image(path) {
    return utils.IsFile(path) ? gdi.Image(path) : null;
}

// =========================================================================
// 2. 全局常量配置 (Configuration)
// =========================================================================

// [路径配置] 
const BASE_PATH = "D:\\11_MusicLib\\_Extras\\"; 
const JSON_DIR = BASE_PATH + "ArtistBiography\\";
const ARTIST_COVER_DIR = BASE_PATH + "ArtistCover\\";
const LINK_ICONS_DIR = fb.ProfilePath + "\\user-theme-fb2k-medium-slate-blue\\imgs\\Links\\";

// [布局常量]
const SCROLL_STEP = _scale(30);       // 滚轮滚动步长
const MAX_BUFFER_H = _scale(2000);    // 文本缓冲最大高度 (限制高度防显存溢出)
const ICON_SIZE = _scale(10);         // 详情行小图标大小
const MARGIN = _scale(10);            // 通用内边距
const LINE_H = _scale(16);            // 基础文本行高
const LINE_SPACE = _scale(8);         // 行与行之间的间距
const COVER_SCALE = 3 / 4;            // 封面图片宽高比 9 / 16
const COVER_IDENTIFER = "_Cover_";    // 封面文件名特征匹配符

// [GDI 文本绘制标志位]
// 参考: http://msdn.microsoft.com/en-us/library/dd162498(VS.85).aspx
const DT_LEFT         = 0x00000000;
const DT_CENTER       = 0x00000001;
const DT_RIGHT        = 0x00000002;
const DT_VCENTER      = 0x00000004;
const DT_BOTTOM       = 0x00000008;
const DT_WORDBREAK    = 0x00000010; // 自动换行
const DT_NOPREFIX     = 0x00000800; // 禁用 '&' 转义字符处理
const DT_EDITCONTROL  = 0x00002000; // 长文本排版优化 (类似于编辑框行为)
const DT_END_ELLIPSIS = 0x00008000; // 文本超出区域显示省略号

// [组合样式]
// 多行文本: 左对齐 + 自动换行 + 省略号 + 无转义
const MULTI_LINE_FLAGS = DT_LEFT | DT_WORDBREAK | DT_END_ELLIPSIS | DT_NOPREFIX;
// 单行文本: 左对齐 + 垂直居中 + 省略号 + 无转义
const ONE_LINE_FLAGS   = DT_LEFT | DT_VCENTER | DT_END_ELLIPSIS | DT_NOPREFIX;
// 按钮样式: 水平垂直居中 + 无转义 + 自动换行
const BTN_STYLE_FLAGS  = DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_WORDBREAK;

// =========================================================================
// 3. 视觉样式与资源 (Theme & Resources)
// =========================================================================

const COLORS = {
    Bg:        window.GetColourCUI(3),                  // CUI 全局 背景 颜色
    Title:     window.GetColourCUI(1),                  // CUI 全局 选中文案 颜色
    Accent:    window.GetColourCUI(6),                  // CUI 全局 激活项 颜色
    Accent1:   window.GetColourCUI(4),                  // CUI 全局 选中项背景 颜色
    Body:      window.GetColourCUI(0),                  // CUI 全局 普通项文本 颜色
    Dim:       window.GetColourCUI(0),                  // 非激活状态颜色 (跟随文本色)
    BtnNormal: window.GetColourCUI(1),                  // 按钮默认颜色 (选中文案色)
    BtnHover:  window.GetColourCUI(6),                  // 按钮悬停颜色 (激活项色)
    Scroll:    _RGB(149, 149, 149),                     // 滚动条颜色
};

const CUI_GLOBAL_FONT = window.GetFontCUI(0).Name;     // CUI 通用项字体名称
const CUI_TEXT_FONT = window.GetFontCUI(0, "{19F8E0B3-E822-4F07-B200-D4A67E4872F9}").Name; // NG Playlist 字体名称

const FONTS = {
    Title:          gdi.Font(CUI_GLOBAL_FONT, _scale(18), 1), // 标题 (粗体)
    Body:           gdi.Font(CUI_TEXT_FONT, _scale(12), 0),   // 正文
    ButtonNormal:   gdi.Font(CUI_GLOBAL_FONT, _scale(12), 0), // 按钮默认
    ButtonSelected: gdi.Font(CUI_GLOBAL_FONT, _scale(12), 1)  // 按钮选中 (粗体)
};

// [图标资源]
const LINK_ICONS = {
    "genres_mark":       load_image(LINK_ICONS_DIR + "circle-small.png"),
    "country_mark":      load_image(LINK_ICONS_DIR + "locate.png"),
    "born_mark":         load_image(LINK_ICONS_DIR + "calendar.png"),
    "links_mark":        load_image(LINK_ICONS_DIR + "milestone.png"),
    "default":      load_image(LINK_ICONS_DIR + "default.png"),
    "official":     load_image(LINK_ICONS_DIR + "house.png"),
    "soundcloud":   load_image(LINK_ICONS_DIR + "soundcloud.png"),
    "bandcamp":     load_image(LINK_ICONS_DIR + "bandcamp.png"),
    "instagram":    load_image(LINK_ICONS_DIR + "Instagram.png"),
    "x":            load_image(LINK_ICONS_DIR + "X.png"),
    "tiktok":       load_image(LINK_ICONS_DIR + "TikTok.png"),
    "youtube":      load_image(LINK_ICONS_DIR + "YouTube.png"),
    "discogs":      load_image(LINK_ICONS_DIR + "Discogs.png"),
    "allmusic":     load_image(LINK_ICONS_DIR + "ALLMUSIC.png"),
    "musicbrainz":  load_image(LINK_ICONS_DIR + "Musicbrainz.png"),
    "rateyourmusic":load_image(LINK_ICONS_DIR + "rateyourmusic.png"),
    "aoty":         load_image(LINK_ICONS_DIR + "aoty.png"),
    "pitchfork":    load_image(LINK_ICONS_DIR + "pitchfork.png"),
    "metacritic":   load_image(LINK_ICONS_DIR + "metacritic.png"),
    "fandom":       load_image(LINK_ICONS_DIR + "fandom.png"),
    "wikipedia":    load_image(LINK_ICONS_DIR + "wikipedia.png")  
};

// [UI组件] TitleFormat 与 Tooltip
// $meta(artist,0) 用于避免多值艺人字段导致的文件路径匹配失败
const tf_artist = fb.TitleFormat("$meta(artist,0)");  
const tf_album = fb.TitleFormat(" ▸ [%date%]: [%album%] ['('$meta(EDITION)')']"); 

const tooltip = window.CreateTooltip(CUI_GLOBAL_FONT, _scale(13));
tooltip.SetMaxWidth(1200);

// Tooltip 简易封装，避免重复设置
function _tt(value) {
    if (tooltip.Text !== value) {
        tooltip.Text = value;
        tooltip.Activate();
    }
}

// =========================================================================
// 4. 全局状态变量 (State Management)
// =========================================================================

// 数据状态
let artist_name = null;      // 缓存当前加载的艺人名 (用于比对是否需要重载)
let artistData = null;       // 解析后的艺人 JSON 数据对象
const ARTIST_CACHE = new Map(); // LRU 缓存 (存储最近访问的艺人数据和图片路径)
const CACHE_MAX_SIZE = 50;   // 缓存最大条目数

// 图片与轮播状态
let imgList = [];            // 当前加载的封面图对象列表
let curImgIndex = 0;         // 当前显示的图片索引
let imgTimer = null;         // 图片轮播定时器 ID
const IMG_CYCLE_MS = 8000;   // 轮播时间间隔 (8秒)

// UI 视图状态
let showDiscography = false; // Tab状态：False=简介(Profile), True=作品集(Discography)
let scrollY = 0;             // 当前垂直滚动条位置
let maxScrollY = 0;          // 最大可滚动距离
let textImg = null;          // 文本内容的离屏渲染缓冲图 (GdiBitmap)
let errorText = "请选择或播放歌曲..."; // 空状态或错误提示文案
let isCoverFit = true;      // 封面显示模式 (Fit/Cover)

// 交互状态
let activeLinkBtns = [];     // 当前生成的外部链接按钮数组
let g_activeElement = null;  // [状态机] 当前鼠标悬停/激活的 UI 元素

// 布局动态计算变量 (初始化为 LINE_H 防止除零或计算异常)
let title_h = LINE_H;        
let title_w = 0;     
let cover_h = 0;              
let genres_h = LINE_H;        
let line_w = 0;               
let line_start_y = 0;
let header_height = 0;        
let view_w = 0;               
let view_h = 0;               

// 固定 UI 元素定义
const elements = {
    profileBtn:     { displayText: "Profile", x: 0, y: 0, w: 0, h: 0, is_hover: false, tooltip: "艺人简介" },
    discographyBtn: { displayText: "Discography", x: 0, y: 0, w: 0, h: 0, is_hover: false, tooltip: "本地专辑" }
};

// [性能优化] 文本测量工具单例
let _measureImg = null;
let _measureGr = null;

// =========================================================================
// 5. 核心渲染循环 (Core Render Loop)
// =========================================================================

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    
    // 1. 如果有数据，先创建链接按钮对象 (确定X和W)
    if (artistData) create_link_buttons();    
    // 2. 计算Tab按钮尺寸
    calc_elements_btn_size();
    // 3. 计算整体布局 (确定Y坐标和高度)
    update_layout_metrics();
    // 4. 生成文本缓冲 (耗时操作)
    create_text_buffer(); 
}

function on_paint(gr) {
    // 1. 绘制背景 (关闭抗锯齿以保持矩形边缘锐利)
    gr.SetSmoothingMode(0); 
    gr.FillSolidRect(0, 0, window.Width, window.Height, COLORS.Bg);

    if (!artistData) {
        gr.GdiDrawText(errorText, FONTS.Body, COLORS.Title, 0, window.Height / 2, window.Width, window.Height, BTN_STYLE_FLAGS);
        return;
    }

    // 2. 绘制封面区
    if (imgList.length > 0 && imgList[curImgIndex]) {
        let currentImg = imgList[curImgIndex];
        if (isCoverFit) {
            drawImageFit(gr, currentImg, 0, 0, window.Width, cover_h);
        } else {
            drawImageCover(gr, currentImg, 0, 0, window.Width, cover_h);
        }
        
        // 绘制页码指示器 (半透明圆角矩形)
        if (imgList.length > 1) {
            let pageText = (curImgIndex + 1) + " / " + imgList.length;
            gr.SetSmoothingMode(4); // 开启抗锯齿画圆角
            gr.FillRoundRect(MARGIN, cover_h - MARGIN - LINE_H, _scale(50), LINE_H, _scale(6), _scale(6), 0x99000000);
            gr.SetSmoothingMode(0); 
            gr.GdiDrawText(pageText, FONTS.Body, 0xFFFFFFFF, MARGIN, cover_h - MARGIN - LINE_H, _scale(50), LINE_H, BTN_STYLE_FLAGS);
        }
    }

    let currentY = line_start_y; 
    
    // 3. 绘制头部信息 (Header)
    
    // 3.1 艺人标题 (超长截断逻辑)
    gr.GdiDrawText(artistData.title, FONTS.Title, COLORS.Title, MARGIN, currentY, title_w > line_w ? line_w : title_w, title_h, ONE_LINE_FLAGS);
    // 别名 (如果标题没占满一行，在后面追加显示)
    if (artistData.aliases && title_w < (line_w - MARGIN * 2)) {
        gr.GdiDrawText(" (" + artistData.aliases + ")", FONTS.Body, COLORS.Title, title_w + MARGIN, currentY + _scale(4), line_w - title_w - MARGIN, LINE_H, ONE_LINE_FLAGS);
    }
    currentY += title_h + LINE_SPACE;
    
    // 3.2 风格 (多行)
    if (LINK_ICONS.genres_mark) gr.DrawImage(LINK_ICONS.genres_mark, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.genres_mark.Width, LINK_ICONS.genres_mark.Height);
    gr.GdiDrawText(artistData.genres || "Unknown Genre", FONTS.Body, COLORS.Title, MARGIN * 2.5, currentY, line_w, genres_h, MULTI_LINE_FLAGS);
    currentY += genres_h + LINE_SPACE;

    // 3.3 生日
    if (LINK_ICONS.born_mark) gr.DrawImage(LINK_ICONS.born_mark, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.born_mark.Width, LINK_ICONS.born_mark.Height);
    gr.GdiDrawText(artistData.born || "-", FONTS.Body, COLORS.Title, MARGIN * 2.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);

    // 3.4 地区 (与生日同一行，靠右侧布局)
    if (LINK_ICONS.country_mark) gr.DrawImage(LINK_ICONS.country_mark, MARGIN * 13, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.country_mark.Width, LINK_ICONS.country_mark.Height);
    gr.GdiDrawText(artistData.country || "-", FONTS.Body, COLORS.Title, MARGIN * 14.5, currentY, line_w, LINE_H, ONE_LINE_FLAGS);
    currentY += LINE_H + LINE_SPACE;

    // 3.5 链接图标按钮
    if (LINK_ICONS.links_mark) gr.DrawImage(LINK_ICONS.links_mark, MARGIN, currentY + Math.ceil(((LINE_H - ICON_SIZE) / 2)), ICON_SIZE, ICON_SIZE, 0, 0, LINK_ICONS.links_mark.Width, LINK_ICONS.links_mark.Height);
    
    activeLinkBtns.forEach(btn => {
        if (!btn.img) return;
        // if (btn.isHover) { ... } // 可选：绘制按钮Hover背景
        gr.DrawImage(btn.img, btn.x, btn.y, btn.w, btn.h, 0, 0, btn.img.Width, btn.img.Height);
    });
    
    // 4. 绘制 Tab 切换按钮
    const pBtn = elements.profileBtn;
    const dBtn = elements.discographyBtn;
    const isProfile = !showDiscography;
    
    // 根据状态确定颜色
    const pColor = isProfile ? COLORS.BtnNormal : (pBtn.is_hover ? COLORS.BtnHover : COLORS.Dim);
    const dColor = !isProfile ? COLORS.BtnNormal : (dBtn.is_hover ? COLORS.BtnHover : COLORS.Dim);

    gr.GdiDrawText(pBtn.displayText, isProfile ? FONTS.ButtonSelected : FONTS.ButtonNormal, pColor, pBtn.x, pBtn.y, pBtn.w, pBtn.h, BTN_STYLE_FLAGS);
    gr.GdiDrawText(dBtn.displayText, !isProfile ? FONTS.ButtonSelected : FONTS.ButtonNormal, dColor, dBtn.x, dBtn.y, dBtn.w, dBtn.h, BTN_STYLE_FLAGS);

    // Tab 指示线
    gr.SetSmoothingMode(4); 
    const activeBtn = isProfile ? pBtn : dBtn;
    gr.DrawLine(activeBtn.x, header_height - MARGIN, activeBtn.x + activeBtn.w, header_height - MARGIN, _scale(2), COLORS.Accent1);
    gr.DrawLine(MARGIN, header_height - MARGIN, window.Width - MARGIN, header_height - MARGIN, _scale(1), COLORS.Dim);
    gr.SetSmoothingMode(0);

    // 5. 绘制滚动内容 (使用离屏缓冲直绘，提高性能)
    if (textImg) {
        const sourceH = Math.min(view_h, textImg.Height - scrollY);
        if (sourceH > 0) {
            gr.DrawImage(textImg, MARGIN, header_height, view_w, sourceH, 0, scrollY, view_w, sourceH);
        }
        // 绘制滚动条
        if (maxScrollY > 0) {
            const barH = Math.max(_scale(20), (view_h / textImg.Height) * view_h);
            const barY = header_height + (scrollY / maxScrollY) * (view_h - barH);
            gr.FillRoundRect(window.Width - _scale(3), barY, _scale(2.5), barH, _scale(1), _scale(1), COLORS.Scroll);
        }
    }
}

// =========================================================================
// 6. 数据处理与缓存 (Data Processing & Cache)
// =========================================================================

/**
 * [核心] 数据加载入口：重载艺人数据
 * @param {FbMetadbHandle} metadb - 音频文件句柄
 */
function reload_artist_data(metadb) {
    if (!metadb) return;

    const artist = tf_artist.EvalWithMetadb(metadb);
    // 文件名安全处理：替换非法字符
    const safeName = artist.replace(/[\\\/:*?"<>|]/g, "_");
    
    if (artist_name === safeName) return; // 相同艺人无需重载
    artist_name = safeName;
    
    // 重置滚动状态
    scrollY = 0;
    maxScrollY = 0;
    
    // 获取或创建缓存
    const cacheEntry = get_artist_cache_entry(safeName);
    artistData = cacheEntry.json;
    if (cacheEntry.jsonError){
        errorText = cacheEntry.jsonError;
    }else{
        errorText = artistData ? "" : "暂无艺人资料: " + safeName;
    }
    // errorText = !cacheEntry.jsonError ? "" : cacheEntry.jsonError;

    load_images_from_cache(cacheEntry.imgPaths, metadb);

    if (window.Width > 0) {
        create_link_buttons();
        update_layout_metrics();
        create_text_buffer();
        window.Repaint();
    }
}

/**
 * 扫描艺人封面图片文件
 * @returns {Array<string>} 图片路径数组
 */
function scan_image_paths(safeName) {
    let paths = [];
    let index = 1;
    const maxCheck = 10; // 最大尝试扫描数量
    const exts = [".jpg", ".jpeg", ".png"];

    while (index <= maxCheck) {
        let numStr = (index < 10 ? "0" : "") + index;
        let basePath = ARTIST_COVER_DIR + safeName + COVER_IDENTIFER + numStr;
        let foundCurrentIndex = false;

        for (let i = 0; i < exts.length; i++) {
            let fullPath = basePath + exts[i];
            if (utils.IsFile(fullPath)) {
                paths.push(fullPath);
                foundCurrentIndex = true;
                break; // 找到一种格式即可
            }
        }
        if (foundCurrentIndex) {
            index++;
        } else {
            break; // 遇到中断序号则停止扫描
        }
    }
    return paths;
}

/**
 * 获取缓存的艺人数据，如果不存在则读取文件
 */
function get_artist_cache_entry(safeName) {
    // 命中缓存：直接返回，并刷新 LRU 位置（删旧插新）
    if (ARTIST_CACHE.has(safeName)) {
        const entry = ARTIST_CACHE.get(safeName);
        ARTIST_CACHE.delete(safeName); 
        ARTIST_CACHE.set(safeName, entry);
        return entry;
    }

    // 未命中：读取 JSON
    let jsonData = null;
    let jsonErrorData = null;
    const jsonPath = JSON_DIR + safeName + ".json";
    if (utils.IsFile(jsonPath)) {
        try {
            jsonData = JSON.parse(utils.ReadTextFile(jsonPath));
            // 数组转字符串，方便显示
            if (jsonData.aliases && Array.isArray(jsonData.aliases)) {
                jsonData.aliases = jsonData.aliases.join(", ");
            }
            if (jsonData.genres && Array.isArray(jsonData.genres)) {
                jsonData.genres = jsonData.genres.join(", ");
            }
        } catch (e) {
            errorText = "JSON Error: " + e;
            console.log("JSON Error: " + e);
        }
    }

    // 扫描封面路径
    const paths = scan_image_paths(safeName);
    const entry = { json: jsonData, imgPaths: paths, jsonError: jsonErrorData};

    // 缓存清理 (LRU)
    if (ARTIST_CACHE.size >= CACHE_MAX_SIZE) {
        const oldestKey = ARTIST_CACHE.keys().next().value;
        ARTIST_CACHE.delete(oldestKey);
    }
    ARTIST_CACHE.set(safeName, entry);
    return entry;
}

/**
 * 根据路径加载图片资源
 * @param {Array<String>} paths - 图片路径数组
 * @param {FbMetadbHandle} metadb - 音频句柄 (用于Fallback)
 */
function load_images_from_cache(paths, metadb) {
    // 释放旧资源
    if (imgList && imgList.length > 0) {
        imgList.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    imgList = [];
    curImgIndex = 0;

    // 1. 加载本地扫描到的图片
    if (paths && paths.length > 0) {
        paths.forEach(path => {
            let img = gdi.Image(path); 
            if (img) imgList.push(img);
        });
    }

    // 2. Fallback: 如果没有本地图，尝试获取内嵌封面
    if (imgList.length === 0) {
        const tryTypes = [4, 0]; // 4=Artist, 0=Front
        for (const typeId of tryTypes) {
            const internalArt = utils.GetAlbumArtV2(metadb, typeId);
            if (internalArt) {
                imgList.push(internalArt);
                break; 
            }
        }
    }

    // 3. 启动轮播逻辑
    manage_cycle_timer();
}

/**
 * 管理图片轮播定时器
 */
function manage_cycle_timer() {
    if (imgTimer) {
        window.ClearInterval(imgTimer);
        imgTimer = null;
    }
    if (imgList.length > 1) {
        imgTimer = window.SetInterval(() => {
            curImgIndex++;
            if (curImgIndex >= imgList.length) curImgIndex = 0;
            window.RepaintRect(0, 0, window.Width, cover_h);
        }, IMG_CYCLE_MS);
    }
}

/**
 * 获取艺人作品集 (自动从音乐库读取并缓存)
 * 格式: YYYY-MM-DD - 专辑名
 */
function get_disco_text() {
    // 1. 检查缓存：如果已经有数据（且是数组），直接返回 joined 字符串
    // 注意：这里我们改变了数据结构，从原来的 Object 变成了 Array<String>
    if (artistData.discography && Array.isArray(artistData.discography)) {
        if (artistData.discography.length === 0) return "音乐库中暂无该艺人专辑记录";
        return artistData.discography.join("\n"); // 使用双换行让排版更稀疏好看
    }

    // --- 以下是初始化逻辑 (仅在第一次访问时运行) ---

    // 2. 准备查询
    // artistData.title 是艺人的真实名字 (如 "Guns N' Roses")
    // 需要处理名字中的单引号，防止查询语法错误
    const safeQueryName = artistData.title.replace(/'/g, "''");
    const query = "%artist% HAS " + safeQueryName;
    
    // 3. 获取所有相关曲目 handle list 
    const matches = fb.GetQueryItems(fb.GetLibraryItems(), query);
    // console.log(matches.Count)
    let resultList = [];

    if (matches.Count > 0) {
        // 4. 排序：按日期降序 (最新的在前面)，也就是 0-9 还是 9-0 取决于你的需求
        // 排序依据: %date% %album%  1 为升序, -1 为降序
        matches.OrderByFormat(tf_album, -1);

        // 5. 格式化提取
        // 使用 TitleFormat 直接生成需要的字符串格式
        // 格式示例: [2023-01-01] - 专辑名
        const rawStrings = tf_album.EvalWithMetadbs(matches); // 返回原生字符串数组

        // 6. 去重 (核心步骤)
        // 因为查询返回的是所有歌曲，一张专辑有10首歌就会出现10次
        // 我们利用 Set 特性去除重复的 "日期 - 专辑" 行
        const uniqueSet = new Set(rawStrings);
        
        // 将 Set 转回数组
        resultList = Array.from(uniqueSet);
        
        // (可选) 如果需要按日期降序(新->旧)，在这里反转数组
        // resultList.reverse(); 
    }
    
    // 7. 写入缓存到 artistData 对象中 (内存缓存)
    // 这样下次调用 get_disco_text 就不会再次查询硬盘了
    artistData.discography = resultList;

    // 8. 返回结果
    if (resultList.length === 0) return "音乐库中暂无该艺人专辑记录";
    return resultList.join("\n");
}


// =========================================================================
// 7. 布局与几何计算 (Layout & Geometry)
// =========================================================================

/**
 * 文本测量工具 (单例模式)
 * 修正 GDI+ MeasureString 与 GDI 绘制值的差异
 */
function measure_string(text, font, maxWidth, text_style_flag) {
    if (!_measureImg) {
        _measureImg = gdi.CreateImage(1, 1);
        _measureGr = _measureImg.GetGraphics();
    }
    const result = _measureGr.MeasureString(text, font, 0, 0, maxWidth, MAX_BUFFER_H, text_style_flag || MULTI_LINE_FLAGS);
    return {
        Width: Math.ceil(result.Width),
        Height: Math.ceil(result.Height) - _scale(1)
    };
}

/**
 * 布局核心算法
 * 负责计算所有元素的坐标和尺寸，实现逻辑与渲染分离
 */
function update_layout_metrics() {
    cover_h = Math.floor(window.Width * COVER_SCALE);
    line_w = window.Width - MARGIN * 4;
    line_start_y = cover_h + MARGIN;

    // 1. 计算标题高度
    if (artistData && artistData.title) {
        // 分别计算单行和完整高度，限制标题最多显示一行的高度(配合 truncate 样式)
        const measureOne = measure_string("M", FONTS.Title, line_w, ONE_LINE_FLAGS);
        const measureFull = measure_string(artistData.title, FONTS.Title, line_w, ONE_LINE_FLAGS);
        title_h = Math.min(measureFull.Height, measureOne.Height); 
        title_w = measureFull.Width;
    } else {
        title_h = LINE_H * 2;
        title_w = LINE_H * 2;
    }

    // 2. 计算风格高度 (限制最大2行)
    if (artistData && artistData.genres) {
        const measureOne = measure_string("M", FONTS.Body, line_w, MULTI_LINE_FLAGS);
        const measureFull = measure_string(artistData.genres, FONTS.Body, line_w, MULTI_LINE_FLAGS);
        const limitHeight = Math.ceil(measureOne.Height * 2); 
        
        // [修复] 修正了 genres_h 可能为 0 的 Bug
        genres_h = Math.min(limitHeight, measureFull.Height);
    } else {
        genres_h = LINE_H;
    }

    // 3. 模拟垂直堆叠，计算头部总高度
    let stackY = line_start_y;
    stackY += title_h + LINE_SPACE;     // 名字
    stackY += genres_h + LINE_SPACE;    // 风格
    stackY += LINE_H + LINE_SPACE;      // 生日/地区
    
    // 4. 计算链接按钮的 Y 坐标
    if (activeLinkBtns && activeLinkBtns.length > 0) {
        const linkY = stackY + _scale(1); // 微调偏移
        activeLinkBtns.forEach(btn => {
            btn.y = linkY;
        });
    }
    stackY += LINE_H + LINE_SPACE; // 链接行占用
    
    stackY += LINE_H * 2.5; // 预留给 Tab 按钮和分割线的空间
    
    header_height = stackY; 

    view_w = Math.max(1, window.Width - MARGIN * 2);
    view_h = Math.max(1, window.Height - header_height - MARGIN);

    // 设置 Tab 按钮坐标
    elements.profileBtn.y = header_height - elements.profileBtn.h * 2;
    elements.discographyBtn.y = elements.profileBtn.y;
}

/**
 * 计算 Tab 按钮的尺寸和 X 坐标
 */
function calc_elements_btn_size() {
    const pM = measure_string(elements.profileBtn.displayText, FONTS.ButtonSelected, window.Width, BTN_STYLE_FLAGS);
    elements.profileBtn.w = pM.Width;
    elements.profileBtn.h = pM.Height;
    
    const dM = measure_string(elements.discographyBtn.displayText, FONTS.ButtonSelected, window.Width, BTN_STYLE_FLAGS);
    elements.discographyBtn.w = dM.Width;
    elements.discographyBtn.h = dM.Height;

    elements.profileBtn.x = MARGIN * 2.5;
    elements.discographyBtn.x = MARGIN * 3.5 + elements.profileBtn.w;
}

/**
 * 创建离屏文本缓冲 (Text Buffer)
 * 将耗时的文本排版渲染到一张图片上，滚动时直接绘制图片
 */
function create_text_buffer() {
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    textImg = null;
    
    if (!artistData || view_w <= 0 || view_h <= 0) return;

    const text = showDiscography ? get_disco_text() : (artistData.artistbiography || "暂无详细简介信息");
    
    const measured = measure_string(text, FONTS.Body, view_w, MULTI_LINE_FLAGS);
    let fullH = Math.ceil(measured.Height);
    fullH = Math.max(1, Math.min(fullH, MAX_BUFFER_H));
    
    try {
        textImg = gdi.CreateImage(view_w, fullH);
        const gr = textImg.GetGraphics();
        gr.GdiDrawText(text, FONTS.Body, COLORS.Body, 0, 0, view_w, fullH, MULTI_LINE_FLAGS);
        textImg.ReleaseGraphics(gr);
    } catch (e) {
        console.log("Buffer Error: " + e);
        textImg = null;
        return;
    }

    maxScrollY = Math.max(0, fullH - view_h);
    if (scrollY > maxScrollY) scrollY = maxScrollY;
}

/**
 * 初始化链接按钮对象
 */
function create_link_buttons() {
    activeLinkBtns = []; 
    if (!artistData || !artistData.links) return;

    const btnSize = ICON_SIZE + _scale(4);
    const startX = MARGIN * 2.5;
    let currentX = startX;
    
    for (let key in artistData.links) {
        let url = artistData.links[key];
        // TODO key 转成小写
        if (url && url.length > 0) {
            activeLinkBtns.push({
                name: key,
                url: url,
                x: currentX,
                y: 0,  // 占位，update_layout_metrics 中计算实际值
                w: btnSize,
                h: btnSize,
                img: LINK_ICONS[key] || LINK_ICONS["default"], 
                is_hover: false,
                tooltip: key,
            });
            currentX += (btnSize + _scale(6));
        }
    }
}

/**
 * 图片绘制辅助：保持比例适应 (Fit)
 */
function drawImageFit(gr, img, x, y, w, h) {
    if (!img || w <= 0 || h <= 0) return;
    const ratio = Math.min(w / img.Width, h / img.Height);
    const newW = img.Width * ratio;
    const newH = img.Height * ratio;
    const offX = x + (w - newW) / 2;
    const offY = y + (h - newH) / 2;
    gr.DrawImage(img, offX, offY, newW, newH, 0, 0, img.Width, img.Height);
}

/**
 * 图片绘制辅助：保持比例覆盖 (Cover/Fill)
 */
function drawImageCover(gr, img, x, y, w, h) {
    if (!img) return;
    const ratio = Math.max(w / img.Width, h / img.Height);
    const srcW = w / ratio;
    const srcH = h / ratio;
    const srcX = (img.Width - srcW) / 2;
    const srcY = (img.Height - srcH) / 2;
    gr.DrawImage(img, x, y, w, h, srcX, srcY, srcW, srcH);
}

// =========================================================================
// 8. 交互事件处理 (Event Handlers)
// =========================================================================

/**
 * 检测坐标是否在元素矩形内
 */
function _element_trace(x, y, ele) {
    return (x >= ele.x && x <= ele.x + ele.w && y >= ele.y && y <= ele.y + ele.h);
}

function on_mouse_wheel(step) {
    if (!textImg || maxScrollY <= 0) return;
    scrollY -= step * SCROLL_STEP;
    scrollY = Math.max(0, Math.min(scrollY, maxScrollY));
    window.RepaintRect(0, header_height, window.Width, window.Height - header_height);
}

// [核心] 状态机：on_mouse_move
function on_mouse_move(x, y) {
    let target = null;

    // 1. 检测 Tab 按钮
    if (_element_trace(x, y, elements.profileBtn)) {
        target = elements.profileBtn;
    } else if (_element_trace(x, y, elements.discographyBtn)) {
        target = elements.discographyBtn;
    } 
    // 2. 检测链接按钮
    else {
        for (let btn of activeLinkBtns) {
            if (_element_trace(x, y, btn)) {
                target = btn;
                break;
            }
        }
    }

    // 3. 状态切换
    if (g_activeElement === target) return; // 没变，直接返回

    // 旧元素复位
    if (g_activeElement) {
        g_activeElement.is_hover = false;
        window.RepaintRect(g_activeElement.x, g_activeElement.y, g_activeElement.w, g_activeElement.h);
    }

    // 新元素激活
    if (target) {
        target.is_hover = true;
        window.RepaintRect(target.x, target.y, target.w, target.h);
        _tt(target.tooltip || "");
        window.SetCursor(32649); // Hand 手型光标
    } else {
        _tt("");
        window.SetCursor(32512); // Arrow 箭头光标
    }

    g_activeElement = target;
}

function on_mouse_leave() {
    if (g_activeElement) {
        g_activeElement.is_hover = false;
        window.RepaintRect(g_activeElement.x, g_activeElement.y, g_activeElement.w, g_activeElement.h);
        g_activeElement = null;
    }
    _tt("");
    window.SetCursor(32512);
}

function on_mouse_lbtn_up(x, y) {
    // 1. 封面点击 (切换图片)
    if (y < cover_h && imgList.length > 1) {
        curImgIndex++;
        if (curImgIndex >= imgList.length) curImgIndex = 0;
        manage_cycle_timer(); 
        window.RepaintRect(0, 0, window.Width, cover_h);
        return; 
    }
    
    // 2. Tab 切换
    if (_element_trace(x, y, elements.profileBtn)) {
        showDiscography = false;
        create_text_buffer();
        window.RepaintRect(0, elements.profileBtn.y, window.Width, window.Height - elements.profileBtn.y);
        return;
    } else if (_element_trace(x, y, elements.discographyBtn)) {
        showDiscography = true;
        create_text_buffer();
        window.RepaintRect(0, elements.profileBtn.y, window.Width, window.Height - elements.profileBtn.y); 
        return;
    }

    // 3. 链接点击 (ActiveX 延迟加载)
    activeLinkBtns.forEach(btn => {
        if (_element_trace(x, y, btn)) {
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
    reload_artist_data(metadb);
}

function on_playlist_items_selection_change() {
    let selection = fb.GetSelection(); 
    if (selection) {
        reload_artist_data(selection);
    } else {
        if (fb.IsPlaying) reload_artist_data(fb.GetNowPlaying());
    }
}

// 脚本卸载/重载时释放资源
function on_script_unload() {
    if (imgTimer) {
        window.ClearInterval(imgTimer);
        imgTimer = null;
    }
    if (imgList && imgList.length > 0) {
        imgList.forEach(img => {
            if (img && typeof img.Dispose === "function") img.Dispose();
        });
    }
    if (textImg && typeof textImg.Dispose === "function") textImg.Dispose();
    
    for (let key in LINK_ICONS) {
        if (LINK_ICONS[key] && typeof LINK_ICONS[key].Dispose === "function") {
            LINK_ICONS[key].Dispose();
        }
    }
    if (_measureImg) {
        _measureImg.ReleaseGraphics(_measureGr);
        if (typeof _measureImg.Dispose === "function") _measureImg.Dispose();
    }
    if (ARTIST_CACHE) ARTIST_CACHE.clear();
}

// =========================================================================
// 9. 初始化执行 (Initialization)
// =========================================================================

let initSelection = fb.GetSelection();
if (initSelection) {
    reload_artist_data(initSelection);
} else if (fb.IsPlaying) {
    reload_artist_data(fb.GetNowPlaying());
}
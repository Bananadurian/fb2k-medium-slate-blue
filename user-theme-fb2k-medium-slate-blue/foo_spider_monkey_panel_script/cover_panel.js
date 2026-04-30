/**
 * @file cover_panel.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-29
 * @version 2.0.0
 * @description 封面显示面板: 圆角渲染、颜色提取渐变背景、Async 封面加载。
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");

// ==========================================
// 1. 面板配置
// ==========================================

const PANEL_CFG = {
    cornerRadius: _scale(20),       // 封面圆角半径
    margin: _scale(40),              // 封面周围的全局边距 (Padding)

    // --- 颜色与背景选项 ---
    useCoverColor: true,           // true: 提取封面颜色, false: 强制使用 CUI 全局背景色
    useGradient: false,              // (仅在 useCoverColor 为 true 时有效) true: 渐变色, false: 单色
    gradientAngle: 90,              // 渐变角度 (90=从上到下, 0=从左到右)
    textColor: _rgb(200, 200, 200)   // 提示文字颜色
};

// ==========================================
// 2. 全局状态 (GLOBAL STATE)
// ==========================================

// 初始化 CUI 全局背景色 (3 = ColourType.background)
let themeBgColor = THEME.COL.BG;

let img = null;           // 缓存原始封面图像 
let imgRounded = null;   // 缓存处理好带有透明圆角的最终图像
let bgColor1 = themeBgColor; // 背景色 1 
let bgColor2 = themeBgColor; // 背景色 2 
const font = THEME.FONT.TITLE;
let panelW = 0, panelH = 0;         

// ==========================================
// 3. 数据层 (DATA LAYER)
// ==========================================

// _rgb / _createRoundedImage / _extractImageColors 来自 lib/utils.js

function getAlbumArtData(metadb, artId, useCoverColor, useGradient, fallbackColor) {
    return new Promise((resolve) => {
        if (!metadb) {
            resolve({ image: null, colors: { c1: fallbackColor, c2: fallbackColor } });
            return;
        }
        
        utils.GetAlbumArtAsyncV2(window.ID, metadb, artId)
            .then(result => {
                let img = result.image;
                let colors;
                
                // 【性能优化核心】仅在允许提取颜色，且有封面的情况下才去跑分析算法
                if (useCoverColor && img) {
                    colors = _extractImageColors(img, useGradient, fallbackColor);
                } else {
                    colors = { c1: fallbackColor, c2: fallbackColor };
                }
                
                resolve({
                    image: img,
                    colors: colors
                });
            })
            .catch(err => {
                console.log("Album art load error: " + err);
                resolve({ image: null, colors: { c1: fallbackColor, c2: fallbackColor } });
            });
    });
}

// ==========================================
// 4. 表现层与面板业务逻辑 (VIEW LAYER)
// ==========================================

/**
 * [视图更新] 重新计算封面圆角图的尺寸排版 (Aspect-Fit)
 */
function recalculateCoverGeometry() {
    if (!img || panelW === 0 || panelH === 0) {
        imgRounded = null;
        return;
    }
    
    let maxW = Math.max(10, panelW - PANEL_CFG.margin);
    let maxH = Math.max(10, panelH - PANEL_CFG.margin);
    
    let scale = Math.min(maxW / img.Width, maxH / img.Height);
    
    let targetW = Math.floor(img.Width * scale);
    let targetH = Math.floor(img.Height * scale);
    
    imgRounded = _createRoundedImage(img, targetW, targetH, PANEL_CFG.cornerRadius);
}

/**
 * [业务总控] 加载指定音轨的数据并刷新面板
 */
function updatePanelData(metadb) {
    getAlbumArtData(metadb, 0, PANEL_CFG.useCoverColor, PANEL_CFG.useGradient, themeBgColor)
        .then(data => {
            if (img && typeof img.Dispose === "function") img.Dispose();
            if (imgRounded && typeof imgRounded.Dispose === "function") imgRounded.Dispose();
            imgRounded = null;
            img = data.image;
            bgColor1 = data.colors.c1;
            bgColor2 = data.colors.c2;

            recalculateCoverGeometry();
            window.Repaint();
        });
}

// ==========================================
// 5. 系统回调事件 (SYSTEM CALLBACKS)
// ==========================================

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    panelW = window.Width;
    panelH = window.Height;

    recalculateCoverGeometry();
}

function on_paint(gr) {
    gr.FillGradRect(0, 0, panelW, panelH, PANEL_CFG.gradientAngle, bgColor1, bgColor2, 1.0);
    
    if (imgRounded) {
        let x = Math.round((panelW - imgRounded.Width) / 2);
        let y = Math.round((panelH - imgRounded.Height) / 2);
        gr.DrawImage(imgRounded, x, y, imgRounded.Width, imgRounded.Height, 0, 0, imgRounded.Width, imgRounded.Height);
    } else {
        let text = fb.IsPlaying ? "No Cover Found" : "Stopped";
        if (font) {
            gr.GdiDrawText(text, font, PANEL_CFG.textColor, 0, 0, panelW, panelH, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
        }
    }
}

function on_playback_new_track(metadb) {
    updatePanelData(metadb);
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        updatePanelData(null);
    }
}

function on_playlist_items_selection_change() {
    let selection = fb.GetSelection();
    if (selection) {
        updatePanelData(selection);
    } else if (fb.IsPlaying) {
        updatePanelData(fb.GetNowPlaying());
    }
}

function on_colours_changed() {
    _refreshThemeColors();
    themeBgColor = THEME.COL.BG;
    bgColor1 = themeBgColor;
    bgColor2 = themeBgColor;
    window.Repaint();
}

function on_font_changed() {
    _refreshThemeFonts();
    window.Repaint();
}

// ==========================================
// 6. 启动初始化 (INITIALIZATION)
// ==========================================

function on_script_unload() {
    if (img && typeof img.Dispose === "function") img.Dispose();
    if (imgRounded && typeof imgRounded.Dispose === "function") imgRounded.Dispose();
}

let currentTrack = fb.GetNowPlaying();
if (currentTrack) {
    updatePanelData(currentTrack);
}
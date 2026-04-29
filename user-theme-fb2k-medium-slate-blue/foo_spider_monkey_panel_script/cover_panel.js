/**
 * @file cover_panel.js
 * @author XYSRe
 * @created 2025-12-16
 * @updated 2026-04-27
 * @version 3.3.0
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
    useGradient: true,              // (仅在 useCoverColor 为 true 时有效) true: 渐变色, false: 单色
    gradientAngle: 90,              // 渐变角度 (90=从上到下, 0=从左到右)
    textColor: _rgb(200, 200, 200)   // 提示文字颜色
};

// ==========================================
// ## 2. 全局状态 (GLOBAL STATE)
// ==========================================

// 初始化 CUI 全局背景色 (3 = ColourType.background)
let themeBgColor = THEME.COL.BG;

let img = null;           // 缓存原始封面图像 
let imgRounded = null;   // 缓存处理好带有透明圆角的最终图像
let bgColor1 = themeBgColor; // 背景色 1 
let bgColor2 = themeBgColor; // 背景色 2 
let font = null;          
let panelW = 0, panelH = 0;         

// ==========================================
// ## 3. 通用工具函数 (UTILITY FUNCTIONS)
// ==========================================

// _rgb 来自 lib/utils.js

/**
 * [纯函数] 将指定图片等比缩放、居中裁剪，并应用透明圆角遮罩 (支持长方形)
 */
function createRoundedImage(img, targetW, targetH, radius) {
    if (!img || targetW <= 0 || targetH <= 0) return null;
    
    let bmp = gdi.CreateImage(targetW, targetH);
    let gr = bmp.GetGraphics();
    
    let srcW = img.Width;
    let srcH = img.Height;
    
    let scale = Math.max(targetW / srcW, targetH / srcH);
    let drawW = Math.round(srcW * scale);
    let drawH = Math.round(srcH * scale);
    let drawX = Math.round((targetW - drawW) / 2);
    let drawY = Math.round((targetH - drawH) / 2);
    
    gr.SetInterpolationMode(7); 
    gr.DrawImage(img, drawX, drawY, drawW, drawH, 0, 0, srcW, srcH);
    bmp.ReleaseGraphics(gr);
    
    let mask = gdi.CreateImage(targetW, targetH);
    let grMask = mask.GetGraphics();
    grMask.SetSmoothingMode(2); 
    
    // 白色区域透明(裁切)，黑色区域保留(不透明)
    grMask.FillSolidRect(0, 0, targetW, targetH, _rgb(255, 255, 255));
    grMask.FillRoundRect(0, 0, targetW, targetH, radius, radius, _rgb(0, 0, 0));
    mask.ReleaseGraphics(grMask);
    
    bmp.ApplyMask(mask);
    return bmp;
}

/**
 * [纯函数] 从图像中提取主色调
 * @returns {{ c1: number, c2: number }} c1 为主色调, c2 为次色调 (渐变用; 单色模式下 c2===c1)
 */
function extractCoverColors(img, useGradient, fallbackColor) {
    let result = { c1: fallbackColor, c2: fallbackColor };
    if (!img) return result;
    
    try {
        let colorsJson = img.GetColourSchemeJSON(5);
        let colors = JSON.parse(colorsJson);
        
        if (colors && colors.length > 0) {
            result.c1 = colors[0].col; 
            if (useGradient && colors.length >= 2) {
                result.c2 = colors[1].col; 
            } else {
                result.c2 = colors[0].col; 
            }
        }
    } catch (e) {
        console.log("SMP Extract Colors Error: " + e);
    }
    return result;
}

/**
 * [异步数据层] 获取封面图像对象及配套颜色数据
 * 包含阻断式性能优化：当 useCoverColor 为 false 时直接跳过颜色提取
 */
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
                    colors = extractCoverColors(img, useGradient, fallbackColor);
                } else {
                    colors = { c1: fallbackColor, c2: fallbackColor };
                }
                
                resolve({
                    image: img,
                    colors: colors
                });
            })
            .catch(err => {
                resolve({ image: null, colors: { c1: fallbackColor, c2: fallbackColor } });
            });
    });
}

// ==========================================
// ## 4. 表现层与面板业务逻辑 (VIEW LAYER)
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
    
    imgRounded = createRoundedImage(img, targetW, targetH, PANEL_CFG.cornerRadius);
}

/**
 * [业务总控] 加载指定音轨的数据并刷新面板
 */
function updatePanelData(metadb) {
    // 传入控制开关和 CUI 全局背景色
    getAlbumArtData(metadb, 0, PANEL_CFG.useCoverColor, PANEL_CFG.useGradient, themeBgColor)
        .then(data => {
            img = data.image;
            bgColor1 = data.colors.c1;
            bgColor2 = data.colors.c2;
            
            recalculateCoverGeometry();
            window.Repaint();
        });
}

// ==========================================
// ## 5. 系统回调事件 (SYSTEM CALLBACKS)
// ==========================================

function on_size() {
    panelW = window.Width;
    panelH = window.Height;
    
    if (!font) {
        font = THEME.FONT.TITLE; 
    }
    
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

// 动态响应 CUI 颜色设置变化
function on_colours_changed() {
    themeBgColor = THEME.COL.BG;
    
    // 强制刷新当前界面的数据 (使得背景色变更立刻生效)
    updatePanelData(fb.GetNowPlaying());
}

// ==========================================
// ## 6. 启动初始化 (INITIALIZATION)
// ==========================================

function on_script_unload() {
    if (img && typeof img.Dispose === "function") img.Dispose();
    if (imgRounded && typeof imgRounded.Dispose === "function") imgRounded.Dispose();
}

let currentTrack = fb.GetNowPlaying();
if (currentTrack) {
    updatePanelData(currentTrack);
}
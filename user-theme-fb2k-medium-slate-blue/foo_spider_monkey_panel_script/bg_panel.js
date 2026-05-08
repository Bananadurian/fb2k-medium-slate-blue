/**
 * @file bg_panel.js
 * @author XYSRe
 * @created 2026-05-08
 * @updated 2026-05-08
 * @version 1.0.0
 * @description 背景控制器专用测试面板：验证 lib/background.js 新标准调用与性能路径
 */

"use strict";

include("lib/utils.js");
include("lib/data.js");
include("lib/theme.js");
include("lib/background.js");

window.DefineScript("bg_panel", {
    author: "XYSRe",
    version: "1.0.0",
    options: { grab_focus: THEME.CFG.GRAB_FOCUS },
});

const BG_MODE_THEME = "theme";
const BG_MODE_COVER_COLOR = "cover-color";
const BG_MODE_COVER_IMAGE = "cover-image";

const SYNC_MODE_AUTO = "auto";
const SYNC_MODE_WITH_RAW = "with-raw";
const SYNC_MODE_NO_ART = "no-art";

const PANEL_CFG = {
    mode: BG_MODE_COVER_IMAGE,
    gradientEnabled: true,
    gradientAngle: 90,
    gradientSpan: 10,
    shapeType: "round-rect",
    shapeRadius: _scale(50),
    imageScaleMode: "cover",
    imageBlurRadius: 0,
    imageCacheSize: 3,
    maskEnabled: true,
    maskColor: _rgb(255, 255, 255),
    maskAlpha: 90,
    syncMode: SYNC_MODE_AUTO,
};

let panelW = window.Width;
let panelH = window.Height;
let bgLayer = null;

let titleFont = THEME.FONT.TITLE;
let bodyFont = THEME.FONT.BODY;

let fetchCount = 0;
let manualRawCount = 0;
let noArtCount = 0;
let lastTrackKey = "";

const coverKeyTf = fb.TitleFormat("%album artist% - %album%");

/** @returns {FbMetadbHandle|null} */
function getActiveMetadb() {
    if (fb.IsPlaying) return fb.GetNowPlaying();
    const selection = fb.GetSelection();
    return selection || null;
}

/**
 * @param {FbMetadbHandle} metadb
 * @returns {GdiBitmap|null}
 */
function fetchAlbumArt(metadb) {
    fetchCount += 1;
    return utils.GetAlbumArtV2(metadb, 0);
}

/** @returns {void} */
function resetCounters() {
    fetchCount = 0;
    manualRawCount = 0;
    noArtCount = 0;
}

/**
 * @param {FbMetadbHandle|null} metadb
 * @returns {string}
 */
function getTrackKey(metadb) {
    if (!metadb) return "";
    const key = coverKeyTf.EvalWithMetadb(metadb);
    return key || metadb.Path || "";
}

/** @returns {void} */
function recreateBackgroundLayer() {
    if (bgLayer) {
        bgLayer.clearCache();
    }

    bgLayer = createPanelBackgroundLayer({
        background: {
            mode: PANEL_CFG.mode,
            gradient: {
                enabled: PANEL_CFG.gradientEnabled,
                angle: PANEL_CFG.gradientAngle,
                span: PANEL_CFG.gradientSpan,
            },
            image: {
                scaleMode: PANEL_CFG.imageScaleMode,
                blurRadius: PANEL_CFG.imageBlurRadius,
                cacheSize: PANEL_CFG.imageCacheSize,
            },
            shape: {
                type: PANEL_CFG.shapeType,
                radius: PANEL_CFG.shapeRadius,
            },
            mask: {
                enabled: PANEL_CFG.maskEnabled,
                color: PANEL_CFG.maskColor,
                alpha: PANEL_CFG.maskAlpha,
            },
            cacheSize: Math.min(5, THEME.CFG.CACHE_SIZE),
            keyTf: coverKeyTf,
        },
        getPreferredMetadb: function () {
            return getActiveMetadb();
        },
        getTargetRect: function () {
            return { x: 0, y: 0, w: panelW, h: panelH };
        },
        getAlbumArt: function (metadb) {
            return fetchAlbumArt(metadb);
        },
    });

    bgLayer.setThemeColor(THEME.COL.BG);
    syncBackground();
}

/**
 * @param {FbMetadbHandle|null} [metadb]
 * @returns {void}
 */
function syncBackground(metadb) {
    if (!bgLayer) return;

    const hasInputMetadb = typeof metadb !== "undefined";
    const target = hasInputMetadb ? metadb || null : getActiveMetadb();

    if (PANEL_CFG.syncMode === SYNC_MODE_WITH_RAW) {
        if (!target) {
            noArtCount += 1;
            bgLayer.syncNoArt(null);
            window.Repaint();
            return;
        }
        const raw = utils.GetAlbumArtV2(target, 0);
        if (raw) {
            manualRawCount += 1;
            bgLayer.syncWithRaw(target, raw);
        } else {
            noArtCount += 1;
            bgLayer.syncNoArt(target);
        }
        window.Repaint();
        return;
    }

    if (PANEL_CFG.syncMode === SYNC_MODE_NO_ART) {
        noArtCount += 1;
        bgLayer.syncNoArt(target);
        window.Repaint();
        return;
    }

    if (hasInputMetadb) {
        bgLayer.sync(target);
    } else {
        bgLayer.sync();
    }

    window.Repaint();
}

/** @returns {void} */
function cycleMode() {
    if (PANEL_CFG.mode === BG_MODE_THEME) {
        PANEL_CFG.mode = BG_MODE_COVER_COLOR;
    } else if (PANEL_CFG.mode === BG_MODE_COVER_COLOR) {
        PANEL_CFG.mode = BG_MODE_COVER_IMAGE;
    } else {
        PANEL_CFG.mode = BG_MODE_THEME;
    }
    recreateBackgroundLayer();
}

/** @returns {void} */
function cycleSyncMode() {
    if (PANEL_CFG.syncMode === SYNC_MODE_AUTO) {
        PANEL_CFG.syncMode = SYNC_MODE_WITH_RAW;
    } else if (PANEL_CFG.syncMode === SYNC_MODE_WITH_RAW) {
        PANEL_CFG.syncMode = SYNC_MODE_NO_ART;
    } else {
        PANEL_CFG.syncMode = SYNC_MODE_AUTO;
    }
    syncBackground();
}


/** @param {GdiGraphics} gr */
function drawOverlay(gr) {
    const metadb = getActiveMetadb();
    const trackKey = getTrackKey(metadb);
    if (trackKey !== lastTrackKey) {
        lastTrackKey = trackKey;
    }

    const info = [
        "bg_panel.js",
        "Mode: " + PANEL_CFG.mode,
        "Sync: " + PANEL_CFG.syncMode,
        "Shape: " + PANEL_CFG.shapeType + " (r=" + PANEL_CFG.shapeRadius + ")",
        "Gradient: " + (PANEL_CFG.gradientEnabled ? "on" : "off") + " @ " + PANEL_CFG.gradientAngle,
        "Image: " + PANEL_CFG.imageScaleMode + ", blur=" + PANEL_CFG.imageBlurRadius,
        "Mask: " + (PANEL_CFG.maskEnabled ? "on" : "off") + ", alpha=" + PANEL_CFG.maskAlpha,
        "AutoFetch Count: " + fetchCount,
        "ManualRaw Count: " + manualRawCount,
        "NoArt Count: " + noArtCount,
        "Track: " + (trackKey || "(none)"),
        "",
        "LButton: cycle mode",
        "MButton: cycle sync strategy",
        "RButton: no-op (edit PANEL_CFG manually)",
    ].join("\n");

    const pad = _scale(18);
    const boxW = Math.max(_scale(420), Math.floor(panelW * 0.62));
    const boxH = Math.max(_scale(280), Math.floor(panelH * 0.7));

    gr.FillRoundRect(pad, pad, boxW, boxH, _scale(12), _scale(12), _argb(140, 0, 0, 0));
    gr.GdiDrawText(info, bodyFont, _rgb(235, 235, 235), pad + _scale(12), pad + _scale(10), boxW - _scale(24), boxH - _scale(20), DT_LEFT | DT_WORDBREAK | DT_NOPREFIX);

    if (titleFont) {
        gr.GdiDrawText("Background Controller Test Panel", titleFont, _rgb(255, 255, 255), pad + _scale(12), pad - _scale(2), boxW - _scale(24), _scale(30), DT_LEFT | DT_NOPREFIX);
    }
}

function init() {
    recreateBackgroundLayer();
}

init();

function on_size() {
    if (window.Width <= 0 || window.Height <= 0) return;
    panelW = window.Width;
    panelH = window.Height;
    if (bgLayer) {
        bgLayer.onResize();
    }
}

/** @param {GdiGraphics} gr */
function on_paint(gr) {
    if (bgLayer) {
        bgLayer.paint(gr);
    } else {
        gr.FillSolidRect(0, 0, panelW, panelH, THEME.COL.BG);
    }
    drawOverlay(gr);
}

/** @param {FbMetadbHandle} metadb */
function on_playback_new_track(metadb) {
    syncBackground(metadb);
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        syncBackground(null);
    }
}

function on_playlist_items_selection_change() {
    const now = fb.IsPlaying ? fb.GetNowPlaying() : null;
    const sel = fb.GetSelection();
    const target = now || sel || null;
    syncBackground(target);
}

function on_colours_changed() {
    _refreshThemeColors();
    if (bgLayer) {
        bgLayer.setThemeColor(THEME.COL.BG);
        bgLayer.sync();
    }
    window.Repaint();
}

function on_font_changed() {
    _refreshThemeFonts();
    titleFont = THEME.FONT.TITLE;
    bodyFont = THEME.FONT.BODY;
    window.Repaint();
}

function on_mouse_lbtn_up() {
    cycleMode();
}

function on_mouse_mbtn_up() {
    cycleSyncMode();
}

// function on_mouse_rbtn_up() {
//     return true;
// }

function on_script_unload() {
    if (bgLayer) {
        bgLayer.clearCache();
        bgLayer = null;
    }
}

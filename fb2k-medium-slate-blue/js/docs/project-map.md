# Project Map

## 1. Script Inventory
- `track_info.js`: metadata, rating, AQ badge, source icon
- `album_info.js`: album view + cover carousel + tabs
- `biography_v2.js`: artist profile/discography + links (v3.0.0, MBID-driven, JSON Schema v3.0)
- `playback_buttons.js`: transport controls
- `control_buttons.js`: utility controls + volume
- `title_playlist.js`: playlist title bar
- `title_library.js`: library title bar
- `cover_panel.js`: cover display + background controller
- `_tab_container.js`: JSplitter tab container (canonical template)
- `tab_container_detail.js`: JSplitter tab container (detail panels variant)
- `tab_container_playlist.js`: JSplitter tab container (playlist variant)
- `bg_panel.js`: background controller validation panel
- `bg_panel_container_playlistview.js`: background container with playlist sub-panel layout
- `bg_panel_container_control.js`: background container with control sub-panel layout

## 2. Directory Layout
- `lib/`: shared libs (`utils.js`, `data.js`, `interaction.js`, `theme.js`, `background.js`, `title_bar_shared.js`, `flag.js`, `json_schema_adapter.js`)
- `test1.js`: local test copy

## 3. Library Dependency Chain
`lib/utils.js`
- consumed by: `theme.js`, `data.js`, `interaction.js`, `flag.js`
- then reused by: `background.js`, `title_bar_shared.js`
`lib/flag.js`
- depends on: `lib/icons.js` (iconMgr); flags loaded via `iconMgr.get('flags', code)`
`lib/icons.js`
- `IconManager` 统一图标管理：4 类注册表懒加载（brands/player/ui/flags），内置 Map 缓存 + "default" fallback
- 键名规范化：`get()` 自动转小写 + 空格转下划线（`TIDAL` → `tidal`, `APPLE MUSIC` → `apple_music`）
- 注册表统一小写：BRANDS/FLAGS 键名全部小写 + 下划线（`cd`, `web`, `cn`, `us` 等）
- 单例 `iconMgr`：`get(category, name, opts)`, `invalidate()`, `clear()`, `clearAll()`
- depends on: `lib/theme.js` (ICONS_*), `lib/utils.js` (_loadImage)

## 4. Canonical Reuse Targets
- `lib/utils.js`: `_hitTest`, `_measureString`, `_measureText`, `_measureDispose`, `_extractImageColors`, `resolveMetadbByMode`, `normalizePadding`, `calcContentRect`, `_getFontLineHeight`, `layoutSections`
- `lib/interaction.js`: `CURSOR_ARROW`, `CURSOR_HAND`, `Button`, `TextTab`, `_setCursor`, `_drawScrollbar`, `_manageCarousel`, `_carouselNext`, `_drawTabIndicator`, `_drawText`, `_drawIcon`, `_drawEmptyState`, `_drawPageIndicator`, `_disposeImageDict`, `_initTooltip`, `_createDefaultTooltip`, `createScrollTextRenderer`
- `lib/background.js`: `createPanelBackgroundController`, `createPanelBackgroundAutoController`, `createPanelBackgroundLayer`
- `lib/title_bar_shared.js`: `createTitleBarController`
- `lib/icons.js`: `iconMgr` (IconManager 单例 — 统一图标获取，替代散落字典)
- `lib/flag.js`: `COUNTRY_RULES`, `LANGUAGE_MAP`, `resolveCountryCode`, `resolveLanguageCode`

## 5. Behavior Constraints Snapshot
- Prefer existing library helpers over local reinvention.
- Keep expensive work out of `on_paint`.
- Use `window.RepaintRect` for localized updates.
- Respect cache ownership; avoid double-dispose patterns.

/**
 * @description 国际化文案 — tooltip / hover / 菜单文本的中英文映射
 * @requires 无外部依赖，纯数据模块
 */
"use strict";

// key 命名: 与脚本内部按键/标识符一致，小写 snake_case
const I18N = {
  playback_buttons: {
    replay:    { en: "Replay",                               zh: "重放" },
    stop:      { en: "Stop",                                 zh: "停止" },
    rewind:    { en: "Seek -5s",                             zh: "快退 5 秒" },
    prev:      { en: "Previous",                             zh: "上一曲" },
    play:      { en: "Play",                                 zh: "播放" },
    pause:     { en: "Pause",                                zh: "暂停" },
    next:      { en: "Next",                                 zh: "下一曲" },
    forward:   { en: "Seek +5s",                             zh: "快进 5 秒" },
    order:     { en: "Play Mode",                            zh: "播放模式" },
    random:    { en: "Random",                               zh: "随机" },
    stop_after_current:    { en: "Stop Immediately (RMB: Cancel)",      zh: "立即停止 (右键: 取消稍后停止)" },
    stop_default:          { en: "Stop (RMB: Stop After Current)",     zh: "停止播放 (右键: 稍后停止)" },
    order_mode_0:          { en: "Default",                            zh: "顺序播放" },
    order_mode_1:          { en: "Repeat Playlist",                    zh: "列表循环" },
    order_mode_2:          { en: "Repeat Track",                       zh: "单曲循环" },
    order_mode_3:          { en: "Random",                             zh: "随机播放 (Random)" },
    order_mode_4:          { en: "Shuffle Tracks",                     zh: "随机乱序 (Shuffle)" },
    order_mode_default:    { en: "Other Mode",                         zh: "其他模式" },
    order_menu_0:          { en: "Default",                            zh: "顺序播放 (Default)" },
    order_menu_1:          { en: "Repeat Playlist",                    zh: "列表循环 (Repeat Playlist)" },
    order_menu_2:          { en: "Repeat Track",                       zh: "单曲循环 (Repeat Track)" },
    order_menu_3:          { en: "Random",                             zh: "随机播放 (Random)" },
    order_menu_4:          { en: "Shuffle Tracks",                     zh: "随机乱序 (Shuffle Tracks)" },
    order_menu_5:          { en: "Shuffle Albums",                     zh: "专辑乱序 (Shuffle Albums)" },
    order_menu_6:          { en: "Shuffle Folders",                    zh: "目录乱序 (Shuffle Folders)" },
  },

  control_buttons: {
    menu:           { en: "Main Menu",                              zh: "主菜单" },
    search:         { en: "Search (RMB: Library Search)",           zh: "搜索 (右键: 媒体库搜索)" },
    queue:          { en: "Queue",                                  zh: "队列" },
    favorite:       { en: "Most Played",                            zh: "最受欢迎" },
    recent:         { en: "Recently Played",                        zh: "最近播放" },
    search_song:    { en: "Search Songs",                           zh: "搜索歌曲" },
    search_artist:  { en: "Search Artists",                         zh: "搜索歌手" },
    search_album_artist: { en: "Search Album Artists",              zh: "搜索专辑歌手" },
    search_album:   { en: "Search Albums",                          zh: "搜索专辑" },
    search_smart:   { en: "Smart Playlist Search",                  zh: "智能列表默认搜索" },
    rg_none:        { en: "Turn On ReplayGain (Current: None)",     zh: "开启音轨增益 (当前:无)" },
    rg_track:       { en: "Turn Off ReplayGain (Current: Track)",   zh: "关闭音轨增益 (当前:音轨)" },
    rg_album:       { en: "Turn Off ReplayGain (Current: Album)",   zh: "关闭专辑增益 (当前:专辑)" },
    rg_smart:       { en: "Turn Off ReplayGain (Current: Smart)",   zh: "关闭增益 (当前:智能)" },
    device_default: { en: "Switch Device",                          zh: "切换设备" },
    device_asio:    { en: "Current: ASIO (Click for WASAPI exclusive)", zh: "当前: ASIO (点击切换 WASAPI exclusive)" },
    device_wasapi_ex: { en: "Current: WASAPI exclusive (Click for WASAPI shared)", zh: "当前: WASAPI exclusive (点击切换 WASAPI shared)" },
    device_wasapi_share:  { en: "Current: WASAPI shared (Click for ASIO)",     zh: "当前: WASAPI shared (点击切换 ASIO)" },
    mute:           { en: "Mute",                                   zh: "静音" },
    unmute:         { en: "Unmute",                                 zh: "取消静音" },
    playlist_recent:   { en: "\u{1F559}️ Recently Played",     zh: "\u{1F559}️ 最近播放" },
    playlist_favorite: { en: "\u{1F525} Most Played",               zh: "\u{1F525} 最受欢迎" },
  },

  title_library: {
    tooltip:    { en: "Library Search",     zh: "音乐库搜索" },
    title:      { en: "Library",            zh: "音乐库" },
  },

  title_playlist: {
    tooltip:    { en: "New Playlist",                                           zh: "新增播放列表" },
    title:      { en: "Playlist ({count})",                                     zh: "播放列表 ({count})" },
  },

  /**
   * 获取当前语言的 UI 文案，支持 {key} 占位替换。
   * @param {string} path — 点号分隔路径，如 "playback_buttons.play"
   * @param {Object} [vars] — 占位变量，如 { count: 5 }
   * @returns {string}
   */
  t: function (path, vars) {
    const lang = window.GetProperty("ui.language", THEME.CFG.LANGUAGE) === "zh" ? "zh" : "en";
    let node = I18N;
    const parts = path.split(".");
    for (let i = 0; i < parts.length; i++) {
      node = node[parts[i]];
      if (!node) return path; // fallback: 返回路径本身防止 undefined
    }
    let text = node[lang] || path;
    if (vars) {
      for (let k in vars) {
        text = text.replace("{" + k + "}", vars[k]);
      }
    }
    return text;
  },
};

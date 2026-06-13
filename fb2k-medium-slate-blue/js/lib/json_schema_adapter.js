/**
 * @file json_schema_adapter.js
 * @author XRE
 * @created 2026-06-12
 * @version 1.0.0
 * @description JSON Schema 适配器 — 可配置的路径映射模板，支持 schema 版本升级时只改模板即可。
 *              配合 biography_v2.js 使用，将嵌套的 v3.0 JSON 结构归一化为面板内部统一格式。
 */

"use strict";

// ============================================================================
// JSON Schema 字段路径映射模板
// ============================================================================

/**
 * JSON_SCHEMA_MAP — 将逻辑字段名映射到 JSON 中的实际路径（点分隔）
 *
 * @description
 * 当 JSON schema 版本升级时，只需修改此对象中的路径即可适配新结构，
 * 无需修改 biography_v2.js 中的渲染逻辑。
 *
 * @example
 * // schema v3.0 → v4.0 升级时:
 * // 只需将 "data.name" 改为 "artist.name"，normalizeArtistData 自动适配
 *
 * @const {Object<string, string>}
 */
const JSON_SCHEMA_MAP = {
    name: "data.name",
    aliases: "data.aliases",
    genres: "data.genres",
    born: "data.life_span.begin",
    country: "data.origin.country.name_en",
    countryCode: "data.origin.country.code",
    biography: "data.intro.summary",
    links: "data.external_urls",
    releaseGroups: "data.release_groups",
    covers: "data.covers"
};

// ============================================================================
// 路径解析工具
// ============================================================================

/**
 * 按点分隔路径从嵌套对象中安全提取值
 * @param {Object|null} obj - 源对象
 * @param {string} path - 点分隔路径（如 "data.life_span.begin"）
 * @returns {*} 提取的值，路径不存在返回 undefined
 *
 * @example
 * resolveNestedValue({data: {name: "Taylor"}}, "data.name")  // "Taylor"
 * resolveNestedValue({}, "data.name")                          // undefined
 * resolveNestedValue(null, "data.name")                        // undefined
 */
function resolveNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
        if (current == null || typeof current !== "object") return undefined;
        current = current[keys[i]];
    }
    return current;
}

// ============================================================================
// 数据归一化
// ============================================================================

/**
 * 将 v3.0 原始 JSON 转换为面板内部的统一数据格式
 *
 * @description
 * - 通过 JSON_SCHEMA_MAP 提取字段路径
 * - 数组类型字段（aliases, genres）自动转为逗号分隔字符串
 * - 返回对象字段名与 biography.js 渲染代码完全兼容
 *
 * @param {Object|null} rawJson - 原始 JSON 对象（含 system + data 两层）
 * @returns {Object|null} 归一化后的数据对象
 *
 * @typedef {Object} NormalizedArtistData
 * @property {string} title           - 艺人名
 * @property {string} aliases         - 别名（逗号分隔）
 * @property {string} genres          - 风格（逗号分隔）
 * @property {string} born            - 出生日期 (YYYY-MM-DD)
 * @property {string} country         - 国家名
 * @property {string|null} countryCode - ISO 国家代码（用于国旗查找）
 * @property {string} artistbiography - 简介文本
 * @property {Object} links           - 外部链接对象
 * @property {Array|null} releaseGroups - 专辑列表
 * @property {Array|null} covers      - 封面列表
 */
function normalizeArtistData(rawJson) {
    if (!rawJson || !rawJson.data) return null;

    const data = rawJson.data;

    // 数组类型字段 → 逗号分隔字符串
    let aliases = "";
    if (Array.isArray(data.aliases)) {
        aliases = data.aliases.join(", ");
    } else if (typeof data.aliases === "string") {
        aliases = data.aliases;
    }

    let genres = "";
    if (Array.isArray(data.genres)) {
        genres = data.genres.join(", ");
    } else if (typeof data.genres === "string") {
        genres = data.genres;
    }

    return {
        title: data.name || "",
        aliases: aliases,
        genres: genres,
        born: resolveNestedValue(data, "life_span.begin") || "",
        country: resolveNestedValue(data, "origin.country.name_zh") || resolveNestedValue(data, "origin.country.name_en") || "",
        countryCode: resolveNestedValue(data, "origin.country.code") || null,
        artistbiography: resolveNestedValue(data, "intro.summary") || "",
        links: data.external_urls || {},
        releaseGroups: data.release_groups || null,
        covers: data.covers || null
    };
}

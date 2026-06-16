/**
 * @description JSON Schema 适配器 — 可配置的路径映射模板，支持 schema 版本升级时只改模板即可。
 *              配合 biography_v2.js 使用，将嵌套的 v3.0 JSON 结构归一化为面板内部统一格式。
 */

"use strict";

// ============================================================================
// JSON Schema 字段路径映射模板
// ============================================================================

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
 * 当前实现直接硬编码字段路径（schema v3.0 only）。
 *
 * 未来多版本适配方案（需要时再实现）：
 * 引入配置驱动的 JSON_SCHEMA_MAP，示例结构：
 * ```javascript
 * const JSON_SCHEMA_MAP = {
 *     title: {
 *         source: "name",           // 单路径
 *         default: ""
 *     },
 *     aliases: {
 *         source: "aliases",
 *         type: "array",            // 数组 → 逗号分隔字符串
 *         default: ""
 *     },
 *     country: {
 *         source: ["origin.country.name_zh", "origin.country.name_en"],  // 多路径降级
 *         default: ""
 *     },
 *     // ...其他字段
 * };
 * ```
 * 函数遍历 MAP 动态提取字段，支持：
 * - 多路径降级（取第一个非空值）
 * - 类型转换（array → string, date → format 等）
 * - 默认值处理
 *
 * Schema 版本升级时仅需修改 MAP，函数逻辑无需改动。
 *
 * @param {Object|null} rawJson - 原始 JSON 对象（含 system + data 两层）
 * @returns {Object|null} 归一化后的数据对象
 *
 * @typedef {Object} NormalizedArtistData
 * @property {string} title           - 艺人名
 * @property {string} aliases         - 别名（逗号分隔）
 * @property {string} genres          - 风格（逗号分隔）
 * @property {string} born            - 出生日期 (YYYY-MM-DD)
 * @property {string} country         - 国家名（优先中文，降级英文）
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

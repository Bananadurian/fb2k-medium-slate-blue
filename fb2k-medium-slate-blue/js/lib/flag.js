/**
 * @description 国旗图标系统 — 国家正则匹配 + 语言 hash 映射 → ISO-2 码 → 国旗图片
 * @requires lib/theme.js (ICONS_FLAGS)
 */

"use strict";

// ============================================================================
// COUNTRY_RULES — 国家/地址匹配（biography_v2.js 使用）
// 规则按优先级排列，首个正则命中胜出。具体地区（TW/HK）在泛称（CN）之前。
// ============================================================================

const COUNTRY_RULES = [
    { re: /台湾|taiwan|tw/i,                                         code: "TW" },
    { re: /香港|hong kong|hk/i,                                      code: "HK" },
    { re: /中国|china|cn|chi|zho|zh|mandarin|cantonese|yue/i,       code: "CN" },
    { re: /日本|japan|japanese|jp|jpn|ja/i,                          code: "JP" },
    { re: /美国|united states|america|usa|美利坚/i,                 code: "US" },
    { re: /英国|united kingdom|england|britain|uk|english|eng|en/i, code: "GB" },
    { re: /英国|英格兰|united kingdom|england|britain|uk|english|eng|en/i, code: "GB" },
    { re: /韩国|korea|kr|kor|ko/i,                                   code: "KR" },
    { re: /法国|france|fr|fre|fra|french/i,                          code: "FR" },
    { re: /德国|germany|de|ger|deu|deutsch|german/i,                code: "DE" },
    { re: /意大利|italy|it|ita|italian/i,                            code: "IT" },
    { re: /西班牙|spain|es|spa|spanish/i,                            code: "ES" },
    { re: /俄罗斯|russia|ru|rus|russian/i,                           code: "RU" },
    { re: /加拿大|canada|ca/i,                                       code: "CA" },
    { re: /澳大利亚|australia|au/i,                                   code: "AU" },
    { re: /巴西|brazil|br|bra|por|portuguese|pt/i,                  code: "BR" },
    { re: /瑞典|sweden|se|swe|sv/i,                                   code: "SE" },
    { re: /挪威|norway|no|nor/i,                                      code: "NO" },
    { re: /丹麦|denmark|dk|dan|da/i,                                  code: "DK" },
    { re: /芬兰|finland|fi|fin/i,                                     code: "FI" },
    { re: /荷兰|netherlands|nl|nld|dutch/i,                          code: "NL" },
    { re: /印度|india|in|ind|hindi|hin|hi/i,                         code: "IN" },
    { re: /波兰|poland|pl|pol/i,                                      code: "PL" },
    { re: /乌克兰|ukraine|ua|ukr/i,                                   code: "UA" },
    { re: /瑞士|switzerland|ch|che/i,                                 code: "CH" },
    { re: /奥地利|austria|at|aut/i,                                   code: "AT" },
    { re: /比利时|belgium|be|bel/i,                                   code: "BE" },
    { re: /爱尔兰|ireland|ie|irl/i,                                   code: "IE" },
    { re: /墨西哥|mexico|mx|mex/i,                                    code: "MX" },
    { re: /阿根廷|argentina|ar|arg/i,                                 code: "AR" },
    { re: /泰国|thailand|th|tha/i,                                    code: "TH" },
    { re: /越南|vietnam|vn|vie|vi/i,                                  code: "VN" },
    { re: /印尼|indonesia|id|indonesian/i,                            code: "ID" },
    { re: /土耳其|turkey|tr|tur/i,                                    code: "TR" },
    { re: /希腊|greece|gr|gre|ell|el/i,                               code: "GR" },
    { re: /葡萄牙|portugal|pt|por/i,                                  code: "PT" },
    { re: /捷克|czech|cz|ces|cs/i,                                    code: "CZ" },
    { re: /匈牙利|hungary|hu|hun/i,                                   code: "HU" },
    { re: /罗马尼亚|romania|ro|ron/i,                                 code: "RO" },
    { re: /新加坡|singapore|sg/i,                                     code: "SG" },
    { re: /南非|south africa|za/i,                                    code: "ZA" },
    { re: /以色列|israel|il|isr|hebrew|heb|he/i,                     code: "IL" },
    { re: /新西兰|new zealand|nz/i,                                   code: "NZ" },
    { re: /菲律宾|philippines|ph|phl|tagalog|tgl|tl/i,               code: "PH" },
    { re: /马来西亚|malaysia|my|msa|malay|ms/i,                       code: "MY" },
];

// ============================================================================
// LANGUAGE_MAP — 语言代码 → {name, code}（album_info.js 使用）
// code 为 ISO 3166-1 alpha-2 国家代码，null 表示无对应国旗
// ============================================================================

const LANGUAGE_MAP = {
    "chi": { name: "Chinese",     code: "CN" },
    "zho": { name: "Chinese",     code: "CN" },
    "zh":  { name: "Chinese",     code: "CN" },
    "yue": { name: "Cantonese",   code: "HK" },
    "jpn": { name: "Japanese",    code: "JP" },
    "ja":  { name: "Japanese",    code: "JP" },
    "eng": { name: "English",     code: "GB" },
    "en":  { name: "English",     code: "GB" },
    "kor": { name: "Korean",      code: "KR" },
    "ko":  { name: "Korean",      code: "KR" },
    "vie": { name: "Vietnamese",  code: "VN" },
    "vi":  { name: "Vietnamese",  code: "VN" },
    "fre": { name: "French",      code: "FR" },
    "fra": { name: "French",      code: "FR" },
    "fr":  { name: "French",      code: "FR" },
    "ger": { name: "German",      code: "DE" },
    "deu": { name: "German",      code: "DE" },
    "de":  { name: "German",      code: "DE" },
    "ita": { name: "Italian",     code: "IT" },
    "it":  { name: "Italian",     code: "IT" },
    "spa": { name: "Spanish",     code: "ES" },
    "es":  { name: "Spanish",     code: "ES" },
    "rus": { name: "Russian",     code: "RU" },
    "ru":  { name: "Russian",     code: "RU" },
    "por": { name: "Portuguese",  code: "PT" },
    "pt":  { name: "Portuguese",  code: "PT" },
    "swe": { name: "Swedish",     code: "SE" },
    "sv":  { name: "Swedish",     code: "SE" },
    "nor": { name: "Norwegian",   code: "NO" },
    "no":  { name: "Norwegian",   code: "NO" },
    "dan": { name: "Danish",      code: "DK" },
    "da":  { name: "Danish",      code: "DK" },
    "fin": { name: "Finnish",     code: "FI" },
    "fi":  { name: "Finnish",     code: "FI" },
    "nld": { name: "Dutch",       code: "NL" },
    "nl":  { name: "Dutch",       code: "NL" },
    "pol": { name: "Polish",      code: "PL" },
    "pl":  { name: "Polish",      code: "PL" },
    "tur": { name: "Turkish",     code: "TR" },
    "tr":  { name: "Turkish",     code: "TR" },
    "tha": { name: "Thai",        code: "TH" },
    "th":  { name: "Thai",        code: "TH" },
    "ell": { name: "Greek",       code: "GR" },
    "el":  { name: "Greek",       code: "GR" },
    "ces": { name: "Czech",       code: "CZ" },
    "cs":  { name: "Czech",       code: "CZ" },
    "hun": { name: "Hungarian",   code: "HU" },
    "hu":  { name: "Hungarian",   code: "HU" },
    "ron": { name: "Romanian",    code: "RO" },
    "ro":  { name: "Romanian",    code: "RO" },
    "ukr": { name: "Ukrainian",   code: "UA" },
    "ua":  { name: "Ukrainian",   code: "UA" },
    "ara": { name: "Arabic",      code: "SA" },
    "ar":  { name: "Arabic",      code: "SA" },
    "heb": { name: "Hebrew",      code: "IL" },
    "he":  { name: "Hebrew",      code: "IL" },
    "hin": { name: "Hindi",       code: "IN" },
    "hi":  { name: "Hindi",       code: "IN" },
    "ind": { name: "Indonesian",  code: "ID" },
    "id":  { name: "Indonesian",  code: "ID" },
    "tgl": { name: "Tagalog",     code: "PH" },
    "tl":  { name: "Tagalog",     code: "PH" },
    "msa": { name: "Malay",       code: "MY" },
    "ms":  { name: "Malay",       code: "MY" },
    "cat": { name: "Catalan",     code: "ES" },
    "ca":  { name: "Catalan",     code: "ES" },
    "und": { name: "Undetermined", code: null },
    "zxx": { name: "Instrumental", code: null },
};

// ============================================================================
// 函数
// ============================================================================

/**
 * 从任意格式输入中提取 ISO 3166-1 alpha-2 国家代码（biography_v2.js 使用）。
 * 正则按 COUNTRY_RULES 优先级依次测试，首个命中即返回。
 * 支持中文名、英文名、ISO 码、"美国纽约" 等地址串的子串匹配。
 * @param {*} input - 国家名（中/英）、地址串、ISO 码等
 * @returns {string|null} 如 "CN"、"HK"，无匹配返回 null
 */
function resolveCountryCode(input) {
    if (input == null || input === "") return null;
    const s = String(input).trim().toLowerCase();
    for (let i = 0; i < COUNTRY_RULES.length; i++) {
        if (COUNTRY_RULES[i].re.test(s)) return COUNTRY_RULES[i].code;
    }
    return null;
}

/**
 * 从语言代码字符串中提取国家代码（album_info.js 使用）。
 * 通过 LANGUAGE_MAP 做 O(1) hash 查找，不做模糊匹配。
 * @param {string} rawLang — "eng", "jpn;chi", "eng//cho", "eng, jpn"
 * @returns {string|null} 如 "GB"、"JP"，无匹配返回 null
 */
function resolveLanguageCode(rawLang) {
    if (!rawLang) return null;
    const parts = String(rawLang).split(/\/\/|[;,]/);
    for (let i = 0; i < parts.length; i++) {
        const entry = LANGUAGE_MAP[parts[i].trim().toLowerCase()];
        if (entry && entry.code) return entry.code;
    }
    return null;
}


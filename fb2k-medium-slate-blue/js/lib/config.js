/**
 * @description Theme configuration module — schema defaults, global JSON file,
 *              per-panel overrides via JSplitter panel properties.
 * @requires JSplitter host fb/utils APIs (not lib/utils.js)
 *
 * Load this file before lib/utils.js and lib/theme.js. This module must not
 * create any GDI/D2D objects, because it is evaluated before window.DrawMode
 * is applied.
 */

"use strict";

const THEME_CONFIG = (function () {
    const VERSION = 1;
    const CONFIG_DIR = fb.ProfilePath + "\\js_data";
    const CONFIG_PATH = CONFIG_DIR + "\\theme_config.json";
    const OVERRIDE_PREFIX = "theme.config.override.";
    const LOG_PREFIX = "[theme-config]";

    const SCHEMA = Object.freeze({
        "render.drawMode": Object.freeze({
            type: "int",
            values: [0, 1],
            default: 0,
            reloadRequired: true,
            description: "0 = GDI+, 1 = Direct2D. Requires panel reload.",
        }),
    });

    const KEY = Object.freeze({
        DRAW_MODE: "render.drawMode",
    });

    const DRAW_MODE = Object.freeze({
        GDI: 0,
        D2D: 1,
    });

    const SOURCE = Object.freeze({
        OVERRIDE: "override",
        GLOBAL: "global",
        PANEL_DEFAULT: "panel-default",
        SCHEMA_DEFAULT: "schema-default",
    });

    const PANEL_ID = Object.freeze({
        TRACK_INFO: "track_info",
        ALBUM_INFO: "album_info",
        BIOGRAPHY_V2: "biography_v2",
        PLAYBACK_BUTTONS: "playback_buttons",
        CONTROL_BUTTONS: "control_buttons",
        TITLE_PLAYLIST: "title_playlist",
        TITLE_LIBRARY: "title_library",
        COVER_PANEL: "cover_panel",
        TAB_CONTAINER: "_tab_container",
        TAB_CONTAINER_DETAIL: "tab_container_detail",
        TAB_CONTAINER_PLAYLIST: "tab_container_playlist",
        BG_PANEL: "bg_panel",
        BG_PANEL_CONTAINER_PLAYLISTVIEW: "bg_panel_container_playlistview",
        BG_PANEL_CONTAINER_CONTROL: "bg_panel_container_control",
    });

    let globalDoc = null;
    let globalDocError = false;
    let globalDocNewer = false;

    /**
     * @param {string} message
     * @returns {void}
     */
    function _log(message) {
        try {
            console.log(LOG_PREFIX + " " + message);
        } catch (e) {
            // Console can be unavailable during early startup.
        }
    }

    /**
     * @param {*} value
     * @returns {boolean}
     */
    function _isPlainObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    /**
     * Read a dotted path from a plain object.
     * @param {Object} obj
     * @param {string} key
     * @returns {*}
     */
    function _getPath(obj, key) {
        const parts = key.split(".");
        let current = obj;
        for (let i = 0; i < parts.length; i++) {
            if (!_isPlainObject(current)) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

    /**
     * Write a dotted path into a plain object.
     * @param {Object} obj
     * @param {string} key
     * @param {*} value
     * @returns {void}
     */
    function _setPath(obj, key, value) {
        const parts = key.split(".");
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!_isPlainObject(current[parts[i]])) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    /**
     * Delete a dotted path and prune empty parent objects.
     * @param {Object} obj
     * @param {string} key
     * @returns {boolean} true if the key existed
     */
    function _deletePath(obj, key) {
        const parts = key.split(".");
        const parents = [];
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!_isPlainObject(current[parts[i]])) return false;
            parents.push([current, parts[i]]);
            current = current[parts[i]];
        }
        if (!_isPlainObject(current) ||
            !Object.prototype.hasOwnProperty.call(current, parts[parts.length - 1])) {
            return false;
        }
        delete current[parts[parts.length - 1]];
        for (let i = parents.length - 1; i >= 0; i--) {
            const parent = parents[i][0];
            const name = parents[i][1];
            if (_isPlainObject(parent[name]) && Object.keys(parent[name]).length === 0) {
                delete parent[name];
            } else {
                break;
            }
        }
        return true;
    }

    /**
     * Validate and normalize a value against its schema.
     * @param {string} key
     * @param {*} value
     * @returns {{ok:boolean, value?:*, reason?:string}}
     */
    function _validate(key, value) {
        const spec = SCHEMA[key];
        if (!spec) return { ok: false, reason: "unknown key" };

        let normalized = value;
        if (spec.type === "int") {
            if (typeof normalized === "string" && normalized.trim() !== "") {
                const n = Number(normalized);
                if (Number.isInteger(n)) normalized = n;
            }
            if (typeof normalized !== "number" || !Number.isInteger(normalized)) {
                return { ok: false, reason: "expected integer" };
            }
            if (spec.values && spec.values.indexOf(normalized) === -1) {
                return { ok: false, reason: "expected one of " + spec.values.join(", ") };
            }
        } else if (spec.type === "bool") {
            if (typeof normalized !== "boolean") {
                return { ok: false, reason: "expected boolean" };
            }
        } else if (spec.type === "string") {
            if (typeof normalized !== "string") {
                return { ok: false, reason: "expected string" };
            }
        } else {
            return { ok: false, reason: "unsupported schema type" };
        }
        return { ok: true, value: normalized };
    }

    /**
     * Load the global config document lazily.
     * Missing or invalid files fall back to an empty document; the read path
     * never creates js_data or the config file.
     * @returns {Object}
     */
    function _loadGlobalDoc() {
        if (globalDoc !== null) return globalDoc;

        globalDocError = false;
        globalDocNewer = false;

        let text = "";
        try {
            text = utils.ReadTextFile(CONFIG_PATH, 65001);
        } catch (e) {
            _log("unable to read " + CONFIG_PATH + ": " + e);
            globalDoc = { version: VERSION };
            return globalDoc;
        }

        if (!text) {
            globalDoc = { version: VERSION };
            return globalDoc;
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            _log("invalid JSON in " + CONFIG_PATH + ": " + e);
            globalDoc = { version: VERSION };
            globalDocError = true;
            return globalDoc;
        }

        if (!_isPlainObject(parsed)) {
            _log("config root must be a JSON object: " + CONFIG_PATH);
            globalDoc = { version: VERSION };
            globalDocError = true;
            return globalDoc;
        }

        if (typeof parsed.version !== "number") parsed.version = VERSION;
        if (parsed.version > VERSION) {
            _log("config version " + parsed.version +
                " is newer than supported " + VERSION + "; writes disabled");
            globalDocNewer = true;
        }

        globalDoc = parsed;
        return globalDoc;
    }

    /**
     * Write the global config document atomically (temp file + rename).
     * @param {Object} doc
     * @returns {boolean}
     */
    function _writeGlobalDoc(doc) {
        if (globalDocNewer) {
            _log("refusing to write: config version is newer than " + VERSION);
            return false;
        }

        if (!utils.IsDirectory(CONFIG_DIR)) {
            if (!utils.CreateFolder(CONFIG_DIR)) {
                _log("unable to create " + CONFIG_DIR);
                return false;
            }
        }

        if (globalDocError && utils.FileExists(CONFIG_PATH)) {
            try {
                if (!utils.CopyFile(CONFIG_PATH, CONFIG_PATH + ".bad", true)) {
                    _log("unable to back up invalid config; aborting write");
                    return false;
                }
            } catch (e) {
                _log("unable to back up invalid config: " + e);
                return false;
            }
        }

        doc.version = VERSION;
        const text = JSON.stringify(doc, null, 2) + "\n";
        const tmpPath = CONFIG_PATH + ".tmp";

        try {
            if (!utils.WriteTextFile(tmpPath, text, false, 65001)) {
                _log("unable to write " + tmpPath);
                return false;
            }
        } catch (e) {
            _log("unable to write " + tmpPath + ": " + e);
            return false;
        }

        let replaced = false;
        try {
            replaced = utils.RenamePath(tmpPath, CONFIG_PATH);
        } catch (e) {
            replaced = false;
        }

        if (!replaced && utils.FileExists(CONFIG_PATH)) {
            try {
                utils.RemovePath(CONFIG_PATH);
            } catch (e) {
                // Ignore and try the rename anyway.
            }
            try {
                replaced = utils.RenamePath(tmpPath, CONFIG_PATH);
            } catch (e) {
                replaced = false;
            }
        }

        if (!replaced) {
            try {
                replaced = utils.CopyFile(tmpPath, CONFIG_PATH, true);
            } catch (e) {
                replaced = false;
            }
        }

        if (!replaced) {
            _log("unable to replace " + CONFIG_PATH);
            try { utils.RemovePath(tmpPath); } catch (e) {}
            return false;
        }

        try { utils.RemovePath(tmpPath); } catch (e) {}

        globalDoc = doc;
        globalDocError = false;
        globalDocNewer = false;
        return true;
    }

    /**
     * Create a per-panel configuration view.
     * @param {string} panelId Diagnostic identifier.
     * @param {Object<string, *>} panelDefaults Panel-specific code defaults.
     * @returns {Object}
     */
    function create(panelId, panelDefaults) {
        const id = (typeof panelId === "string" && panelId) ? panelId : "unknown";
        const defaults = _isPlainObject(panelDefaults) ? panelDefaults : {};
        let warned = {};

        /**
         * Log invalid user data once per key to avoid paint-loop spam.
         * @param {string} key
         * @param {string} message
         * @returns {void}
         */
        function _warnOnce(key, message) {
            if (warned[key]) return;
            warned[key] = true;
            _log(id + ": " + message);
        }

        /**
         * @param {string} key
         * @returns {{present:boolean, value?:*}}
         */
        function _readOverride(key) {
            let value;
            try {
                value = window.GetProperty(OVERRIDE_PREFIX + key);
            } catch (e) {
                _warnOnce(key, "unable to read override: " + e);
                return { present: false };
            }
            if (value === undefined || value === null) return { present: false };
            const valid = _validate(key, value);
            if (!valid.ok) {
                _warnOnce(key, "invalid override (" + value + "): " + valid.reason);
                return { present: false };
            }
            return { present: true, value: valid.value };
        }

        /**
         * @param {string} key
         * @returns {{present:boolean, value?:*}}
         */
        function _readGlobal(key) {
            const doc = _loadGlobalDoc();
            const value = _getPath(doc, key);
            if (value === undefined) return { present: false };
            const valid = _validate(key, value);
            if (!valid.ok) {
                _warnOnce(key, "invalid global value (" + value + "): " + valid.reason);
                return { present: false };
            }
            return { present: true, value: valid.value };
        }

        /**
         * @param {string} key
         * @returns {{present:boolean, value?:*}}
         */
        function _readPanelDefault(key) {
            if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
                return { present: false };
            }
            const valid = _validate(key, defaults[key]);
            if (!valid.ok) {
                _warnOnce(key, "invalid panel default (" + defaults[key] + "): " + valid.reason);
                return { present: false };
            }
            return { present: true, value: valid.value };
        }

        /**
         * Resolve all layers for one key.
         * @param {string} key
         * @returns {?Object}
         */
        function _snapshot(key) {
            const spec = SCHEMA[key];
            if (!spec) return null;

            const override = _readOverride(key);
            const globalValue = _readGlobal(key);
            const panelDefault = _readPanelDefault(key);

            let value;
            let source;
            if (override.present) {
                value = override.value;
                source = SOURCE.OVERRIDE;
            } else if (globalValue.present) {
                value = globalValue.value;
                source = SOURCE.GLOBAL;
            } else if (panelDefault.present) {
                value = panelDefault.value;
                source = SOURCE.PANEL_DEFAULT;
            } else {
                value = spec.default;
                source = SOURCE.SCHEMA_DEFAULT;
            }

            return {
                key: key,
                spec: spec,
                override: override,
                globalValue: globalValue,
                panelDefault: panelDefault,
                value: value,
                source: source,
            };
        }

        /**
         * @param {string} key
         * @returns {{value:*, source:string}}
         */
        function _resolve(key) {
            const snap = _snapshot(key);
            if (!snap) {
                _warnOnce(key, "unknown config key");
                return { value: undefined, source: "unknown" };
            }
            return { value: snap.value, source: snap.source };
        }

        return {
            panelId: id,

            /**
             * @param {string} key
             * @returns {*}
             */
            get: function (key) {
                return _resolve(key).value;
            },

            /**
             * @param {string} key
             * @returns {string}
             */
            getSource: function (key) {
                return _resolve(key).source;
            },

            /**
             * @param {string} key
             * @returns {*}
             */
            getOverride: function (key) {
                const result = _readOverride(key);
                return result.present ? result.value : undefined;
            },

            /**
             * @param {string} key
             * @returns {*}
             */
            getGlobal: function (key) {
                const result = _readGlobal(key);
                return result.present ? result.value : undefined;
            },

            /**
             * @param {string} key
             * @returns {*}
             */
            getPanelDefault: function (key) {
                const result = _readPanelDefault(key);
                return result.present ? result.value : undefined;
            },

            /**
             * @param {string} key
             * @returns {*}
             */
            getSchemaDefault: function (key) {
                const spec = SCHEMA[key];
                return spec ? spec.default : undefined;
            },

            /**
             * @param {string} key
             * @returns {boolean}
             */
            hasOverride: function (key) {
                return _readOverride(key).present;
            },

            /**
             * @param {string} key
             * @param {*} value
             * @param {{reload?:boolean}} [options]
             * @returns {boolean}
             */
            set: function (key, value, options) {
                const spec = SCHEMA[key];
                if (!spec) {
                    _log(id + ": refusing unknown key " + key);
                    return false;
                }
                const valid = _validate(key, value);
                if (!valid.ok) {
                    _log(id + ": refusing invalid value for " + key +
                        " (" + value + "): " + valid.reason);
                    return false;
                }
                try {
                    window.SetProperty(OVERRIDE_PREFIX + key, valid.value);
                } catch (e) {
                    _log(id + ": unable to write override for " + key + ": " + e);
                    return false;
                }
                if (spec.reloadRequired && !(options && options.reload)) {
                    _log(id + ": " + key + " will not take effect until the panel is reloaded");
                }
                if (options && options.reload) {
                    try {
                        window.Reload();
                    } catch (e) {
                        _log(id + ": reload failed: " + e);
                    }
                }
                return true;
            },

            /**
             * @param {string} key
             * @param {{reload?:boolean}} [options]
             * @returns {boolean}
             */
            clear: function (key, options) {
                const spec = SCHEMA[key];
                if (!spec) {
                    _log(id + ": refusing unknown key " + key);
                    return false;
                }
                try {
                    window.SetProperty(OVERRIDE_PREFIX + key, null);
                } catch (e) {
                    _log(id + ": unable to clear override for " + key + ": " + e);
                    return false;
                }
                if (spec.reloadRequired && !(options && options.reload)) {
                    _log(id + ": " + key + " will not take effect until the panel is reloaded");
                }
                if (options && options.reload) {
                    try {
                        window.Reload();
                    } catch (e) {
                        _log(id + ": reload failed: " + e);
                    }
                }
                return true;
            },

            /**
             * Drop the parsed global document; the next get() re-reads it.
             * @returns {void}
             */
            reload: function () {
                globalDoc = null;
                globalDocError = false;
                globalDocNewer = false;
                warned = {};
            },

            /**
             * @returns {Object}
             */
            dump: function () {
                const values = [];
                Object.keys(SCHEMA).forEach(function (key) {
                    const snap = _snapshot(key);
                    values.push({
                        key: key,
                        value: snap.value,
                        source: snap.source,
                        override: snap.override.present ? snap.override.value : undefined,
                        global: snap.globalValue.present ? snap.globalValue.value : undefined,
                        panelDefault: snap.panelDefault.present ? snap.panelDefault.value : undefined,
                        schemaDefault: snap.spec.default,
                    });
                });
                return {
                    panelId: id,
                    filePath: CONFIG_PATH,
                    values: values,
                };
            },
        };
    }

    return Object.freeze({
        VERSION: VERSION,
        filePath: CONFIG_PATH,
        schema: SCHEMA,
        KEY: KEY,
        DRAW_MODE: DRAW_MODE,
        SOURCE: SOURCE,
        PANEL_ID: PANEL_ID,
        create: create,

        /**
         * @param {string} key
         * @returns {*}
         */
        getGlobal: function (key) {
            if (!SCHEMA[key]) return undefined;
            const value = _getPath(_loadGlobalDoc(), key);
            if (value === undefined) return undefined;
            const valid = _validate(key, value);
            return valid.ok ? valid.value : undefined;
        },

        /**
         * @param {string} key
         * @param {*} value
         * @returns {boolean}
         */
        setGlobal: function (key, value) {
            if (!SCHEMA[key]) {
                _log("refusing unknown global key " + key);
                return false;
            }
            const valid = _validate(key, value);
            if (!valid.ok) {
                _log("refusing invalid global value for " + key +
                    " (" + value + "): " + valid.reason);
                return false;
            }

            // Read-modify-write: reload from disk before changing one key.
            globalDoc = null;
            globalDocError = false;
            globalDocNewer = false;
            const latest = _loadGlobalDoc();
            if (globalDocNewer) {
                _log("refusing to write a newer config version");
                return false;
            }

            const next = JSON.parse(JSON.stringify(latest));
            _setPath(next, key, valid.value);
            return _writeGlobalDoc(next);
        },

        /**
         * @param {string} key
         * @returns {boolean}
         */
        removeGlobal: function (key) {
            if (!SCHEMA[key]) {
                _log("refusing unknown global key " + key);
                return false;
            }

            globalDoc = null;
            globalDocError = false;
            globalDocNewer = false;
            const latest = _loadGlobalDoc();
            if (globalDocNewer) {
                _log("refusing to write a newer config version");
                return false;
            }

            const next = JSON.parse(JSON.stringify(latest));
            if (!_deletePath(next, key)) return false;
            return _writeGlobalDoc(next);
        },

        /**
         * @returns {void}
         */
        reloadGlobal: function () {
            globalDoc = null;
            globalDocError = false;
            globalDocNewer = false;
        },
    });
})();

#!/usr/bin/env python3
"""Sanitize privacy-sensitive data from foobar2000 config.sqlite."""
import sqlite3, sys

# (表名, [{"name": ..., "enabled": ...}]) — 按 key + enabled 标记删除
TABLE_RULES = {
    "configStrings": [
        {"name": "UPnP.renderer.name", "enabled": True},   # 含主机名
        {"name": "UPnP.renderer.USN", "enabled": True},    # 设备 UUID
        {"name": "milk2.szPresetDir", "enabled": True},    # 含旧安装路径
    ],
    "configReals": [
        {"name": "core.totalTimePlayed", "enabled": False}, # 总播放时长
    ],
}
# 按 value 内容匹配删除（key 是动态 UUID）
VALUE_RULES = [
    "%127.0.0.1:%",     # IPv4 本地代理
    "%localhost:%",      # 主机名形式
    "%::1:%",            # IPv6 本地代理
]

def sanitize(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    for table, rules in TABLE_RULES.items():
        for rule in rules:
            if rule["enabled"]:
                cur.execute(f"DELETE FROM {table} WHERE name = ?", (rule["name"],))
    for pattern in VALUE_RULES:
        cur.execute("DELETE FROM configStrings WHERE value LIKE ?", (pattern,))
    conn.commit()
    cur.execute("VACUUM")  # 物理擦除已删除数据
    conn.close()

if __name__ == "__main__":
    sanitize(sys.argv[1])

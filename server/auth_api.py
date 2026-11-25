#!/usr/bin/env python3
"""
校园暂停键 (Campus Pause) 轻量独立认证、角色权限与社区内容微服务
- 零第三方依赖（仅 Python 3 标准库 + SQLite3）
- 仅监听 127.0.0.1:3088，由 Nginx 反代 /campus-pause-api/
- 支持邮箱验证码登录、微信小程序 wx.login 一键登录、头像与景点封面持久化上传
- 内置超级管理员 (super_admin) / 管理员 (admin) / 普通用户 (user) 权限体系
  - 默认超级管理员：m7736097132@163.com（不可被降权或撤销）
  - 超级管理员可新增、预授权、管理与撤销其他管理员
  - 超级管理员与管理员均可编辑/删除全站用户发布的地图地点、打卡评论、共鸣泡泡与限时搭子内容
"""

from __future__ import annotations

import base64
import json
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("API_HOST", "127.0.0.1")
PORT = int(os.environ.get("API_PORT", "3088"))
DB_PATH = os.environ.get("DB_PATH", "/srv/campus-pause/api/campus_pause.db")
AVATAR_DIR = os.environ.get("AVATAR_DIR", "/srv/campus-pause/api/avatars")
UPLOAD_DIR = os.environ.get(
    "UPLOAD_DIR", os.path.join(os.path.dirname(DB_PATH), "uploads")
)
PUBLIC_API_BASE = os.environ.get(
    "PUBLIC_API_BASE", "https://pause.jingshutech.top/campus-pause-api"
)

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.163.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "校园暂停键 Campus Pause")

# 预留：后续接入微信小程序一键登录时在 /etc/campus-pause/api.env 中配置
WECHAT_APPID = os.environ.get("WECHAT_APPID", "")
WECHAT_SECRET = os.environ.get("WECHAT_SECRET", "")

# 超级管理员邮箱白名单（默认包含 m7736097132@163.com）
_raw_super_emails = os.environ.get("SUPER_ADMIN_EMAILS", "m7736097132@163.com")
SUPER_ADMIN_EMAILS = {
    e.strip().lower() for e in _raw_super_emails.split(",") if e.strip()
}
SUPER_ADMIN_EMAILS.add("m7736097132@163.com")

DEFAULT_SCHOOL = "广西外国语学院（五合校区）"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
OTP_TTL_SECONDS = 5 * 60
SEND_COOLDOWN_SECONDS = 55
MAX_HOURLY_PER_EMAIL = 8

VALID_SPOT_CATEGORIES = {"sunset", "cats", "quiet", "lawn", "rooftop"}
VALID_QUIET_STATUSES = {"very_quiet", "moderate", "crowded"}
VALID_BUBBLE_TONES = {"lavender", "amber", "mint"}
VALID_BUDDY_CATEGORIES = {"walk", "eat", "study", "sunset"}

PRESET_AVATARS = [
    "/assets/avatars/avatar-1.png",
    "/assets/avatars/avatar-2.png",
    "/assets/avatars/avatar-3.png",
    "/assets/avatars/avatar-4.png",
    "/assets/avatars/avatar-5.png",
]

SEED_SPOTS = [
    {
        "id": "gxufl-1",
        "markerId": 1,
        "name": "明德楼西侧观景连廊",
        "category": "sunset",
        "longitude": 108.51512,
        "latitude": 22.80088,
        "coverUrl": "/assets/spots/sunset.png",
        "quietStatus": "very_quiet",
        "quietUpdatedAt": "6分钟前更新",
        "rating": 4.9,
        "recommendation": "南宁傍晚 18:10 的橘子海晚霞洒在蓝白欧式立面上美到失语，下完语种课来这里吹风放空最治愈。",
        "likes": 218,
        "tags": ["欧式落日", "微风连廊", "出片秘境"],
        "authorName": "官方精选",
        "reviews": [
            {
                "id": "rev-1",
                "author": "小语种晚风人",
                "content": "刚考完专四模拟上来发呆十五分钟，晚霞把尖顶染成粉金色，焦虑一下散了一半。",
                "createdAt": "今天 18:20",
                "moodTag": "被晚霞接住了",
            }
        ],
    },
    {
        "id": "gxufl-2",
        "markerId": 2,
        "name": "化龙池欧式廊桥撸猫角",
        "category": "cats",
        "longitude": 108.51655,
        "latitude": 22.80122,
        "coverUrl": "/assets/spots/cats.png",
        "quietStatus": "moderate",
        "quietUpdatedAt": "12分钟前更新",
        "rating": 4.9,
        "recommendation": "湖边树荫下常驻几只超亲人的校猫，午后看着水面波光一边摸呼噜噜的大橘，电量瞬间回血。",
        "likes": 264,
        "tags": ["亲人校猫", "湖畔树荫", "允许摸头"],
        "authorName": "官方精选",
        "reviews": [
            {
                "id": "rev-2",
                "author": "常备猫条同学",
                "content": "今天大橘和三花都在桥头石阶晒太阳，蹭了我半天帆布包，太治愈啦！",
                "createdAt": "今天 15:10",
                "moodTag": "电量满格",
            }
        ],
    },
    {
        "id": "gxufl-3",
        "markerId": 3,
        "name": "五合图书馆 4F 靠窗静区",
        "category": "quiet",
        "longitude": 108.51624,
        "latitude": 22.80205,
        "coverUrl": "/assets/spots/library.png",
        "quietStatus": "very_quiet",
        "quietUpdatedAt": "刚刚更新",
        "rating": 5.0,
        "recommendation": "窗外正对整片绿树与尖顶轮廓，有独立台灯与插座，适合戴耳机静静整理思绪或背单词。",
        "likes": 175,
        "tags": ["极度安静", "靠窗采光", "有插座"],
        "authorName": "官方精选",
        "reviews": [
            {
                "id": "rev-3",
                "author": "考研上岸中",
                "content": "空调温度刚刚好，抬头能看到远处的云，在这里心率都会变慢。",
                "createdAt": "今天 14:40",
                "moodTag": "心率平稳",
            }
        ],
    },
    {
        "id": "gxufl-4",
        "markerId": 4,
        "name": "天鹅湖西岸斜坡绿草坪",
        "category": "lawn",
        "longitude": 108.51468,
        "latitude": 22.79972,
        "coverUrl": "/assets/spots/lawn.png",
        "quietStatus": "moderate",
        "quietUpdatedAt": "19分钟前更新",
        "rating": 4.8,
        "recommendation": "南宁的晚风混着青草香，傍晚买杯柠檬茶坐在斜坡上看天色变暗，合法暂停二十分钟。",
        "likes": 193,
        "tags": ["合法躺平", "湖面晚风", "青草香"],
        "authorName": "官方精选",
        "reviews": [
            {
                "id": "rev-4",
                "author": "偷得浮生半日闲",
                "content": "不看手机光发呆二十分钟，感觉脑袋里打结的线都松开了。",
                "createdAt": "今天 17:30",
                "moodTag": "精神放风",
            }
        ],
    },
    {
        "id": "gxufl-5",
        "markerId": 5,
        "name": "致达楼高层观风露台",
        "category": "rooftop",
        "longitude": 108.51718,
        "latitude": 22.80015,
        "coverUrl": "/assets/spots/rooftop.png",
        "quietStatus": "very_quiet",
        "quietUpdatedAt": "10分钟前更新",
        "rating": 4.9,
        "recommendation": "视野开阔能俯瞰整个五合欧式建筑群灯火，晚上 21:00 后上来吹南宁晚风，呼吸瞬间通畅。",
        "likes": 207,
        "tags": ["俯瞰校园", "夜景绝美", "晚风自由"],
        "authorName": "官方精选",
        "reviews": [
            {
                "id": "rev-5",
                "author": "改完PPT的人",
                "content": "站在栏杆边看楼下暖黄色路灯，突然觉得明天也没那么难熬了。",
                "createdAt": "昨晚 21:45",
                "moodTag": "世界静音",
            }
        ],
    },
    {
        "id": "gxufl-6",
        "markerId": 6,
        "name": "田径场西侧最高排看台",
        "category": "sunset",
        "longitude": 108.51755,
        "latitude": 22.80215,
        "coverUrl": "/assets/spots/track.png",
        "quietStatus": "moderate",
        "quietUpdatedAt": "24分钟前更新",
        "rating": 4.7,
        "recommendation": "坐在最高一排石阶看操场夜跑和远处粉色天际线，社恐不用参与也能沾到满满生命力。",
        "likes": 146,
        "tags": ["粉色天空", "社恐友好", "夜跑白噪音"],
        "authorName": "官方精选",
        "reviews": [],
    },
    {
        "id": "gxufl-7",
        "markerId": 7,
        "name": "五合南门钟楼林荫长椅",
        "category": "quiet",
        "longitude": 108.51586,
        "latitude": 22.79758,
        "coverUrl": "/assets/spots/gate.png",
        "quietStatus": "very_quiet",
        "quietUpdatedAt": "31分钟前更新",
        "rating": 4.8,
        "recommendation": "橙红尖塔城堡大门旁的绿荫角落，早八前或晚归时坐五分钟深呼吸，自带电影滤镜感。",
        "likes": 132,
        "tags": ["城堡大门", "林荫长椅", "雨天避世"],
        "authorName": "官方精选",
        "reviews": [],
    },
]

SEED_BUBBLES = [
    {
        "id": "vb-1",
        "content": "小组 Pre 明天早八上台，四个组员三个已读不回，我现在还在图书馆改第 6 版 PPT…真的好想直接隐身。",
        "tag": "小组作业全是我做",
        "createdAt": "6分钟前",
        "hugs": 42,
        "empathy": 67,
        "tone": "lavender",
        "authorName": "五合匿名泡泡",
    },
    {
        "id": "vb-2",
        "content": "投了 80 多份实习简历，收到 3 个面试全挂在二面，躲进阳台吹了十分钟南宁晚风才缓过来。",
        "tag": "秋招 0 Offer",
        "createdAt": "18分钟前",
        "hugs": 89,
        "empathy": 112,
        "tone": "amber",
        "authorName": "五合匿名泡泡",
    },
    {
        "id": "vb-3",
        "content": "连着上了三天满课，今天突然电量掉到 1%，什么大事也没发生，就想安静发呆半小时。",
        "tag": "低电量时刻",
        "createdAt": "35分钟前",
        "hugs": 64,
        "empathy": 95,
        "tone": "mint",
        "authorName": "五合匿名泡泡",
    },
    {
        "id": "vb-4",
        "content": "专四听力刚练完一套错了一半，合上真题的那一刻觉得脑子变成了一锅浆糊。",
        "tag": "专四焦虑",
        "createdAt": "52分钟前",
        "hugs": 53,
        "empathy": 81,
        "tone": "lavender",
        "authorName": "五合匿名泡泡",
    },
]

SEED_BUDDIES = [
    {
        "id": "buddy-1",
        "title": "田径场暴走不说话搭子（30分钟）",
        "category": "walk",
        "location": "五合田径场西侧看台入口",
        "durationMinutes": 30,
        "offsetMinutes": 26,
        "maxPeople": 3,
        "joinedCount": 1,
        "hostAlias": "低电量步行者",
        "cipher": "穿深灰卫衣 + 戴头戴式耳机",
        "vibeNote": "刚上完满课想迈开腿放空，全程可以零交流，走满 4 圈各自解散。",
        "boundaryTag": "活动结束自动解散 · 不强制加微信",
        "isSilent": True,
        "quickMessages": [
            {
                "id": "qm-1",
                "sender": "低电量步行者",
                "text": "我在看台口栏杆旁，到了直接一起开走～",
                "time": "3分钟前",
            }
        ],
    },
    {
        "id": "buddy-2",
        "title": "食堂干饭不尴尬搭子",
        "category": "eat",
        "location": "五合食堂二楼靠窗区",
        "durationMinutes": 30,
        "offsetMinutes": 19,
        "maxPeople": 2,
        "joinedCount": 1,
        "hostAlias": "干饭要紧同学",
        "cipher": "桌角放一杯冰柠檬茶",
        "vibeNote": "互相帮忙占座干饭，吃饭期间各自刷手机完全 OK，绝不尬聊！",
        "boundaryTag": "活动结束自动解散 · 不强制加微信",
        "isSilent": False,
        "quickMessages": [
            {
                "id": "qm-2",
                "sender": "干饭要紧同学",
                "text": "我先去占个二人位，各自点想吃的就好！",
                "time": "5分钟前",
            }
        ],
    },
    {
        "id": "buddy-3",
        "title": "五合图书馆静音互相监督搭子",
        "category": "study",
        "location": "图书馆 4F 靠窗长桌",
        "durationMinutes": 30,
        "offsetMinutes": 29,
        "maxPeople": 4,
        "joinedCount": 2,
        "hostAlias": "专四冲刺中",
        "cipher": "桌面立一张薄荷绿便利贴",
        "vibeNote": "手机统一反扣桌面 30 分钟，谁也不许偷刷短视频，到点点头收工！",
        "boundaryTag": "活动结束自动解散 · 不强制加微信",
        "isSilent": True,
        "quickMessages": [
            {
                "id": "qm-3",
                "sender": "专四冲刺中",
                "text": "已反扣手机开始计时，来了直接坐对面就行。",
                "time": "2分钟前",
            }
        ],
    },
    {
        "id": "buddy-4",
        "title": "明德楼连廊发呆看落日搭子",
        "category": "sunset",
        "location": "明德楼西侧观景连廊",
        "durationMinutes": 30,
        "offsetMinutes": 22,
        "maxPeople": 3,
        "joinedCount": 1,
        "hostAlias": "南宁晚霞观测员",
        "cipher": "拿两杯冰美式（多出来一杯随缘）",
        "vibeNote": "今天南宁云层超适合出橘子海晚霞，欢迎并排吹风不寒暄。",
        "boundaryTag": "活动结束自动解散 · 不强制加微信",
        "isSilent": True,
        "quickMessages": [
            {
                "id": "qm-4",
                "sender": "南宁晚霞观测员",
                "text": "西边天空已经开始泛金黄色了！",
                "time": "刚刚",
            }
        ],
    },
]

db_lock = threading.Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def format_short_time() -> str:
    return datetime.now().strftime("%m-%d %H:%M")


def get_db() -> sqlite3.Connection:
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with db_lock:
        conn = get_db()
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS users (
                    uid TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    nickname TEXT NOT NULL,
                    avatar_url TEXT NOT NULL,
                    auth_provider TEXT NOT NULL DEFAULT 'email',
                    wx_openid TEXT UNIQUE,
                    wx_unionid TEXT,
                    school_name TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS admin_email_grants (
                    email TEXT PRIMARY KEY,
                    note TEXT NOT NULL DEFAULT '',
                    granted_by TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS email_otps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    code TEXT NOT NULL,
                    expires_at INTEGER NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_otps_email_created ON email_otps(email, created_at);
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    uid TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    FOREIGN KEY(uid) REFERENCES users(uid)
                );
                CREATE TABLE IF NOT EXISTS spots (
                    id TEXT PRIMARY KEY,
                    marker_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'sunset',
                    longitude REAL NOT NULL,
                    latitude REAL NOT NULL,
                    cover_url TEXT NOT NULL,
                    quiet_status TEXT NOT NULL DEFAULT 'very_quiet',
                    quiet_updated_at TEXT NOT NULL,
                    rating REAL NOT NULL DEFAULT 5.0,
                    recommendation TEXT NOT NULL,
                    likes INTEGER NOT NULL DEFAULT 0,
                    tags_json TEXT NOT NULL DEFAULT '[]',
                    author_uid TEXT NOT NULL DEFAULT '',
                    author_name TEXT NOT NULL DEFAULT '五合探索者',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS spot_reviews (
                    id TEXT PRIMARY KEY,
                    spot_id TEXT NOT NULL,
                    author_uid TEXT NOT NULL DEFAULT '',
                    author TEXT NOT NULL,
                    content TEXT NOT NULL,
                    mood_tag TEXT NOT NULL DEFAULT '被治愈到了',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(spot_id) REFERENCES spots(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_reviews_spot ON spot_reviews(spot_id);
                CREATE TABLE IF NOT EXISTS vent_bubbles (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    tag TEXT NOT NULL DEFAULT '低电量时刻',
                    tone TEXT NOT NULL DEFAULT 'lavender',
                    hugs INTEGER NOT NULL DEFAULT 0,
                    empathy INTEGER NOT NULL DEFAULT 0,
                    author_uid TEXT NOT NULL DEFAULT '',
                    author_name TEXT NOT NULL DEFAULT '五合匿名泡泡',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS buddies (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'walk',
                    location TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL DEFAULT 30,
                    expires_at INTEGER NOT NULL,
                    max_people INTEGER NOT NULL DEFAULT 3,
                    joined_count INTEGER NOT NULL DEFAULT 1,
                    joined_uids_json TEXT NOT NULL DEFAULT '[]',
                    host_uid TEXT NOT NULL DEFAULT '',
                    host_alias TEXT NOT NULL DEFAULT '五合同学',
                    cipher TEXT NOT NULL DEFAULT '',
                    vibe_note TEXT NOT NULL DEFAULT '',
                    boundary_tag TEXT NOT NULL DEFAULT '活动结束自动解散 · 不强制加微信',
                    is_silent INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS buddy_messages (
                    id TEXT PRIMARY KEY,
                    buddy_id TEXT NOT NULL,
                    sender_uid TEXT NOT NULL DEFAULT '',
                    sender TEXT NOT NULL,
                    text TEXT NOT NULL,
                    time_label TEXT NOT NULL DEFAULT '刚刚',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(buddy_id) REFERENCES buddies(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_buddy_msgs_buddy ON buddy_messages(buddy_id);
                """
            )

            # 兼容旧库迁移：为已存在的 users 表补齐 role 字段
            cols = {
                r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()
            }
            if "role" not in cols:
                conn.execute(
                    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
                )

            # 强制确保所有预设超级管理员邮箱拥有 super_admin 权限
            iso = now_iso()
            for super_email in SUPER_ADMIN_EMAILS:
                conn.execute(
                    "UPDATE users SET role = 'super_admin', updated_at = ? WHERE lower(email) = ?",
                    (iso, super_email),
                )
                conn.execute(
                    "DELETE FROM admin_email_grants WHERE lower(email) = ?",
                    (super_email,),
                )

            # 首次初始化写入校园默认示例内容（仅执行一次，后续删除不会被覆盖恢复）
            _seed_initial_content(conn)
            conn.commit()
        finally:
            conn.close()


def _seed_initial_content(conn: sqlite3.Connection) -> None:
    iso = now_iso()

    if not conn.execute("SELECT 1 FROM meta WHERE key = 'seeded_spots_v1'").fetchone():
        existing_cnt = conn.execute("SELECT COUNT(*) AS cnt FROM spots").fetchone()["cnt"]
        if existing_cnt == 0:
            for s in SEED_SPOTS:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO spots (
                        id, marker_id, name, category, longitude, latitude, cover_url,
                        quiet_status, quiet_updated_at, rating, recommendation, likes,
                        tags_json, author_uid, author_name, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)
                    """,
                    (
                        s["id"],
                        s["markerId"],
                        s["name"],
                        s["category"],
                        s["longitude"],
                        s["latitude"],
                        s["coverUrl"],
                        s["quietStatus"],
                        s["quietUpdatedAt"],
                        s["rating"],
                        s["recommendation"],
                        s["likes"],
                        json.dumps(s["tags"], ensure_ascii=False),
                        s["authorName"],
                        iso,
                        iso,
                    ),
                )
                for rev in s.get("reviews", []):
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO spot_reviews (
                            id, spot_id, author_uid, author, content, mood_tag, created_at, updated_at
                        ) VALUES (?, ?, '', ?, ?, ?, ?, ?)
                        """,
                        (
                            rev["id"],
                            s["id"],
                            rev["author"],
                            rev["content"],
                            rev["moodTag"],
                            rev["createdAt"],
                            iso,
                        ),
                    )
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded_spots_v1', ?)",
            (iso,),
        )

    if not conn.execute("SELECT 1 FROM meta WHERE key = 'seeded_bubbles_v1'").fetchone():
        existing_cnt = conn.execute("SELECT COUNT(*) AS cnt FROM vent_bubbles").fetchone()["cnt"]
        if existing_cnt == 0:
            for b in SEED_BUBBLES:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO vent_bubbles (
                        id, content, tag, tone, hugs, empathy, author_uid, author_name, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?)
                    """,
                    (
                        b["id"],
                        b["content"],
                        b["tag"],
                        b["tone"],
                        b["hugs"],
                        b["empathy"],
                        b["authorName"],
                        b["createdAt"],
                        iso,
                    ),
                )
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded_bubbles_v1', ?)",
            (iso,),
        )

    if not conn.execute("SELECT 1 FROM meta WHERE key = 'seeded_buddies_v1'").fetchone():
        existing_cnt = conn.execute("SELECT COUNT(*) AS cnt FROM buddies").fetchone()["cnt"]
        if existing_cnt == 0:
            now_ms = int(time.time() * 1000)
            for bd in SEED_BUDDIES:
                expires_at = now_ms + bd["offsetMinutes"] * 60 * 1000
                conn.execute(
                    """
                    INSERT OR IGNORE INTO buddies (
                        id, title, category, location, duration_minutes, expires_at,
                        max_people, joined_count, joined_uids_json, host_uid, host_alias,
                        cipher, vibe_note, boundary_tag, is_silent, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '', ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        bd["id"],
                        bd["title"],
                        bd["category"],
                        bd["location"],
                        bd["durationMinutes"],
                        expires_at,
                        bd["maxPeople"],
                        bd["joinedCount"],
                        bd["hostAlias"],
                        bd["cipher"],
                        bd["vibeNote"],
                        bd["boundaryTag"],
                        1 if bd["isSilent"] else 0,
                        iso,
                        iso,
                    ),
                )
                for qm in bd.get("quickMessages", []):
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO buddy_messages (
                            id, buddy_id, sender_uid, sender, text, time_label, created_at
                        ) VALUES (?, ?, '', ?, ?, ?, ?)
                        """,
                        (
                            qm["id"],
                            bd["id"],
                            qm["sender"],
                            qm["text"],
                            qm["time"],
                            iso,
                        ),
                    )
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded_buddies_v1', ?)",
            (iso,),
        )


ROLE_RANK = {"user": 0, "admin": 1, "super_admin": 2}


def resolve_user_role(row: sqlite3.Row) -> str:
    email = (row["email"] or "").strip().lower()
    if email and email in SUPER_ADMIN_EMAILS:
        return "super_admin"
    role = (row["role"] or "user").strip().lower()
    if role in ("super_admin", "admin", "user"):
        return role
    return "user"


def merge_roles(
    role_a: str | None,
    role_b: str | None,
    email_a: str | None = None,
    email_b: str | None = None,
) -> str:
    for em in (email_a, email_b):
        clean = (em or "").strip().lower()
        if clean and clean in SUPER_ADMIN_EMAILS:
            return "super_admin"
    ra = (role_a or "user").strip().lower()
    rb = (role_b or "user").strip().lower()
    return ra if ROLE_RANK.get(ra, 0) >= ROLE_RANK.get(rb, 0) else rb


def merge_user_records(conn: sqlite3.Connection, primary_uid: str, secondary_uid: str) -> None:
    """将 secondary_uid 下的会话与全部内容记录安全迁移到 primary_uid，并删除冗余用户行"""
    if not primary_uid or not secondary_uid or primary_uid == secondary_uid:
        return
    conn.execute("UPDATE sessions SET uid = ? WHERE uid = ?", (primary_uid, secondary_uid))
    conn.execute("UPDATE spots SET author_uid = ? WHERE author_uid = ?", (primary_uid, secondary_uid))
    conn.execute("UPDATE spot_reviews SET author_uid = ? WHERE author_uid = ?", (primary_uid, secondary_uid))
    conn.execute("UPDATE vent_bubbles SET author_uid = ? WHERE author_uid = ?", (primary_uid, secondary_uid))
    conn.execute("UPDATE buddies SET host_uid = ? WHERE host_uid = ?", (primary_uid, secondary_uid))
    conn.execute("UPDATE buddy_messages SET sender_uid = ? WHERE sender_uid = ?", (primary_uid, secondary_uid))

    buddy_rows = conn.execute(
        "SELECT id, joined_uids_json FROM buddies WHERE joined_uids_json LIKE ?",
        (f"%{secondary_uid}%",),
    ).fetchall()
    for br in buddy_rows:
        uids = _safe_json_list(br["joined_uids_json"])
        if secondary_uid in uids:
            deduped = []
            for u in uids:
                mapped = primary_uid if u == secondary_uid else u
                if mapped not in deduped:
                    deduped.append(mapped)
            conn.execute(
                "UPDATE buddies SET joined_uids_json = ? WHERE id = ?",
                (json.dumps(deduped), br["id"]),
            )

    conn.execute("DELETE FROM users WHERE uid = ?", (secondary_uid,))


def _mask_openid(openid: str | None) -> str | None:
    if not openid:
        return None
    if len(openid) >= 8:
        return f"{openid[:4]}****{openid[-4:]}"
    return "已绑定微信"


def row_to_user(row: sqlite3.Row, include_sensitive: bool = True) -> dict:
    role = resolve_user_role(row)
    email = (row["email"] or "").strip().lower() or None
    openid = row["wx_openid"] or None
    return {
        "uid": row["uid"],
        "email": email,
        "nickname": row["nickname"],
        "avatarUrl": row["avatar_url"],
        "authProvider": row["auth_provider"],
        "wxBound": bool(openid),
        "wxOpenIdMasked": _mask_openid(openid),
        "wxOpenId": openid if include_sensitive else None,
        "wxUnionId": (row["wx_unionid"] or None) if include_sensitive else None,
        "schoolName": row["school_name"],
        "role": role,
        "isAdmin": role in ("admin", "super_admin"),
        "isSuperAdmin": role == "super_admin",
        "isProtected": bool(email and email in SUPER_ADMIN_EMAILS),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _safe_json_list(raw: str) -> list:
    try:
        parsed = json.loads(raw or "[]")
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def row_to_spot(row: sqlite3.Row, reviews: list[dict]) -> dict:
    return {
        "id": row["id"],
        "markerId": int(row["marker_id"]),
        "name": row["name"],
        "category": row["category"],
        "longitude": float(row["longitude"]),
        "latitude": float(row["latitude"]),
        "coverUrl": row["cover_url"],
        "quietStatus": row["quiet_status"],
        "quietUpdatedAt": row["quiet_updated_at"],
        "rating": float(row["rating"]),
        "recommendation": row["recommendation"],
        "likes": int(row["likes"]),
        "tags": _safe_json_list(row["tags_json"]),
        "authorUid": row["author_uid"] or "",
        "authorName": row["author_name"] or "五合探索者",
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "reviews": reviews,
    }


def row_to_review(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "spotId": row["spot_id"],
        "authorUid": row["author_uid"] or "",
        "author": row["author"],
        "content": row["content"],
        "moodTag": row["mood_tag"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_bubble(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "content": row["content"],
        "tag": row["tag"],
        "tone": row["tone"],
        "hugs": int(row["hugs"]),
        "empathy": int(row["empathy"]),
        "authorUid": row["author_uid"] or "",
        "authorName": row["author_name"] or "五合匿名泡泡",
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_buddy(
    row: sqlite3.Row, messages: list[dict], viewer_uid: str = ""
) -> dict:
    joined_uids = _safe_json_list(row["joined_uids_json"])
    joined_by_me = bool(viewer_uid and viewer_uid in joined_uids)
    return {
        "id": row["id"],
        "title": row["title"],
        "category": row["category"],
        "location": row["location"],
        "durationMinutes": int(row["duration_minutes"]),
        "expiresAt": int(row["expires_at"]),
        "maxPeople": int(row["max_people"]),
        "joinedCount": int(row["joined_count"]),
        "joinedByMe": joined_by_me,
        "hostUid": row["host_uid"] or "",
        "hostAlias": row["host_alias"],
        "cipher": row["cipher"],
        "vibeNote": row["vibe_note"],
        "boundaryTag": row["boundary_tag"],
        "isSilent": bool(row["is_silent"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "quickMessages": messages,
    }


def row_to_buddy_message(row: sqlite3.Row, viewer_uid: str = "") -> dict:
    is_me = bool(viewer_uid and row["sender_uid"] and row["sender_uid"] == viewer_uid)
    return {
        "id": row["id"],
        "buddyId": row["buddy_id"],
        "senderUid": row["sender_uid"] or "",
        "sender": row["sender"],
        "text": row["text"],
        "time": row["time_label"],
        "isMe": is_me,
        "createdAt": row["created_at"],
    }


def send_otp_email(to_email: str, code: str) -> None:
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("服务器未配置 SMTP 凭证")

    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((str(Header(SMTP_FROM_NAME, "utf-8")), SMTP_USER))
    msg["To"] = to_email
    msg["Subject"] = str(Header(f"【校园暂停键】你的登录验证码：{code}", "utf-8"))
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="163.com")

    plain = (
        f"你好！\n\n"
        f"你正在登录/注册「校园暂停键 (Campus Pause)」，本次邮箱验证码为：\n\n"
        f"    {code}\n\n"
        f"验证码 5 分钟内有效，请勿泄露给他人。如非本人操作，请直接忽略本邮件。\n\n"
        f"—— 校园暂停键 · 广西外国语学院五合校区"
    )

    html = f"""\
<!doctype html>
<html lang="zh-CN">
<body style="margin:0;padding:24px;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Helvetica Neue',sans-serif;color:#1D1D1F;">
  <div style="max-width:460px;margin:0 auto;background:#FFFFFF;border-radius:24px;padding:32px 28px;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
    <div style="font-size:12px;font-weight:600;color:#007AFF;letter-spacing:0.06em;margin-bottom:8px;">CAMPUS PAUSE · 校园暂停键</div>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1D1D1F;">邮箱登录验证码</h1>
    <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#6B7280;">
      请输入下方 6 位验证码完成登录或注册，验证码将在 <strong>5 分钟</strong>后失效：
    </p>
    <div style="background:#F2F2F7;border-radius:16px;padding:18px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.24em;color:#007AFF;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
      {code}
    </div>
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#9CA3AF;">
      如非本人操作请忽略本邮件。愿你在忙碌的校园生活里，随时拥有喘口气的温柔角落。
    </p>
  </div>
</body>
</html>
"""
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15, context=context) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, [to_email], msg.as_string())


def _decode_and_save_image(raw_b64: str, target_dir: str, prefix: str, max_bytes: int) -> tuple[str | None, str | None]:
    raw_b64 = str(raw_b64 or "").strip()
    if not raw_b64:
        return None, "缺少图片数据"
    if "," in raw_b64 and raw_b64.startswith("data:"):
        raw_b64 = raw_b64.split(",", 1)[1]
    try:
        img_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception:
        return None, "图片数据格式无效"
    if len(img_bytes) < 64 or len(img_bytes) > max_bytes:
        mb = round(max_bytes / 1_000_000, 1)
        return None, f"图片文件大小需小于 {mb}MB"

    if img_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        ext = "png"
    elif img_bytes[:4] == b"RIFF" and img_bytes[8:12] == b"WEBP":
        ext = "webp"
    elif img_bytes[:2] == b"\xff\xd8":
        ext = "jpg"
    else:
        return None, "仅支持 JPG / PNG / WebP 图片"

    os.makedirs(target_dir, exist_ok=True)
    fname = f"{prefix}_{int(time.time())}_{secrets.token_hex(6)}.{ext}"
    with open(os.path.join(target_dir, fname), "wb") as fp:
        fp.write(img_bytes)
    return fname, None


class AuthHandler(BaseHTTPRequestHandler):
    server_version = "CampusPauseAPI/2.0"

    def log_message(self, fmt: str, *args) -> None:
        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] {self.address_string()} {fmt % args}",
            flush=True,
        )

    def _send_cors(self) -> None:
        origin = self.headers.get("Origin", "*")
        self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 4 * 1024 * 1024:
            return {}
        raw = self.rfile.read(length)
        try:
            parsed = json.loads(raw.decode("utf-8"))
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def _get_auth_user(self) -> sqlite3.Row | None:
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:].strip()
        if not token:
            return None
        now = int(time.time())
        with db_lock:
            conn = get_db()
            try:
                row = conn.execute(
                    """
                    SELECT u.* FROM sessions s
                    JOIN users u ON u.uid = s.uid
                    WHERE s.token = ? AND s.expires_at > ?
                    """,
                    (token, now),
                ).fetchone()
                if row:
                    email = (row["email"] or "").strip().lower()
                    if email and email in SUPER_ADMIN_EMAILS and row["role"] != "super_admin":
                        conn.execute(
                            "UPDATE users SET role = 'super_admin', updated_at = ? WHERE uid = ?",
                            (now_iso(), row["uid"]),
                        )
                        conn.commit()
                        row = conn.execute(
                            "SELECT * FROM users WHERE uid = ?", (row["uid"],)
                        ).fetchone()
                return row
            finally:
                conn.close()

    def _require_user(self) -> sqlite3.Row | None:
        user_row = self._get_auth_user()
        if not user_row:
            self._json(401, {"message": "请先登录"})
            return None
        return user_row

    def _require_admin(self) -> sqlite3.Row | None:
        user_row = self._require_user()
        if not user_row:
            return None
        if resolve_user_role(user_row) not in ("admin", "super_admin"):
            self._json(403, {"message": "仅管理员或超级管理员可执行此操作"})
            return None
        return user_row

    def _require_super_admin(self) -> sqlite3.Row | None:
        user_row = self._require_user()
        if not user_row:
            return None
        if resolve_user_role(user_row) != "super_admin":
            self._json(403, {"message": "仅超级管理员可执行此操作"})
            return None
        return user_row

    def _serve_static_image(self, directory: str, fname: str, head_only: bool) -> None:
        fname = os.path.basename(fname)
        if not re.match(r"^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$", fname):
            self._json(404, {"message": "Not Found"})
            return
        fpath = os.path.join(directory, fname)
        if not os.path.isfile(fpath):
            self._json(404, {"message": "Image Not Found"})
            return
        ext = fname.rsplit(".", 1)[-1].lower()
        mime = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }.get(ext, "application/octet-stream")
        with open(fpath, "rb") as fp:
            raw = fp.read()
        self.send_response(200)
        self._send_cors()
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "public, max-age=2592000, immutable")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        if not head_only:
            self.wfile.write(raw)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_HEAD(self) -> None:
        self._serve_get(head_only=True)

    def do_GET(self) -> None:
        self._serve_get(head_only=False)

    def _serve_get(self, head_only: bool = False) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/health":
            if head_only:
                self.send_response(200)
                self._send_cors()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                return
            self._json(200, {"ok": True, "service": "campus-pause-api", "version": "2.0"})
            return

        if path == "/auth/me":
            user_row = self._get_auth_user()
            if not user_row:
                self._json(401, {"message": "登录已过期，请重新登录"})
                return
            self._json(200, {"ok": True, "user": row_to_user(user_row)})
            return

        if path.startswith("/avatars/"):
            self._serve_static_image(AVATAR_DIR, path[len("/avatars/"):], head_only)
            return

        if path.startswith("/uploads/"):
            self._serve_static_image(UPLOAD_DIR, path[len("/uploads/"):], head_only)
            return

        # ===== 社区内容查询（公开可读） =====
        if path == "/content/spots":
            self._handle_list_spots()
            return
        if path == "/content/bubbles":
            self._handle_list_bubbles()
            return
        if path == "/content/buddies":
            self._handle_list_buddies()
            return

        # ===== 管理员接口 =====
        if path == "/admin/overview":
            self._handle_admin_overview()
            return
        if path == "/admin/admins":
            query_text = (qs.get("q", [""])[0] or "").strip()
            self._handle_list_admins(query_text)
            return

        self._json(404, {"message": "Not Found"})

    def do_POST(self) -> None:
        path = urllib.parse.urlparse(self.path).path.rstrip("/") or "/"
        data = self._read_json()

        # 认证与个人资料
        if path == "/auth/send-code":
            self._handle_send_code(data)
            return
        if path == "/auth/verify-email":
            self._handle_verify_email(data)
            return
        if path == "/auth/profile":
            self._handle_update_profile(data)
            return
        if path == "/auth/upload-avatar":
            self._handle_upload_avatar(data)
            return
        if path == "/auth/wechat-miniprogram":
            self._handle_wechat_login(data)
            return
        if path == "/auth/bind-wechat":
            self._handle_bind_wechat(data)
            return
        if path == "/auth/unbind-wechat":
            self._handle_unbind_wechat()
            return
        if path == "/auth/bind-email":
            self._handle_bind_email(data)
            return
        if path == "/uploads/image":
            self._handle_upload_image(data)
            return

        # 管理员权限管理（仅超级管理员）
        if path == "/admin/admins/add":
            self._handle_add_admin(data)
            return
        if path == "/admin/admins/remove":
            self._handle_remove_admin(data)
            return

        # 地图地点与打卡评论
        if path == "/content/spots":
            self._handle_create_spot(data)
            return
        if path == "/content/spots/update":
            self._handle_update_spot(data)
            return
        if path == "/content/spots/delete":
            self._handle_delete_spot(data)
            return
        if path == "/content/spots/like":
            self._handle_like_spot(data)
            return
        if path == "/content/spots/quiet":
            self._handle_quiet_spot(data)
            return
        if path == "/content/reviews":
            self._handle_create_review(data)
            return
        if path == "/content/reviews/update":
            self._handle_update_review(data)
            return
        if path == "/content/reviews/delete":
            self._handle_delete_review(data)
            return

        # 同校悬浮共鸣泡泡
        if path == "/content/bubbles":
            self._handle_create_bubble(data)
            return
        if path == "/content/bubbles/react":
            self._handle_react_bubble(data)
            return
        if path == "/content/bubbles/update":
            self._handle_update_bubble(data)
            return
        if path == "/content/bubbles/delete":
            self._handle_delete_bubble(data)
            return

        # 限时搭子与临时频道消息
        if path == "/content/buddies":
            self._handle_create_buddy(data)
            return
        if path == "/content/buddies/join":
            self._handle_join_buddy(data)
            return
        if path == "/content/buddies/update":
            self._handle_update_buddy(data)
            return
        if path == "/content/buddies/delete":
            self._handle_delete_buddy(data)
            return
        if path == "/content/buddies/message":
            self._handle_create_buddy_message(data)
            return
        if path == "/content/buddies/message/update":
            self._handle_update_buddy_message(data)
            return
        if path == "/content/buddies/message/delete":
            self._handle_delete_buddy_message(data)
            return

        self._json(404, {"message": "Not Found"})

    # ==================== 认证与头像/图片上传 ====================

    def _handle_send_code(self, data: dict) -> None:
        email = str(data.get("email", "")).strip().lower()
        if not EMAIL_RE.match(email) or len(email) > 120:
            self._json(400, {"message": "请输入有效的邮箱地址"})
            return

        now = int(time.time())
        with db_lock:
            conn = get_db()
            try:
                recent = conn.execute(
                    "SELECT created_at FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1",
                    (email,),
                ).fetchone()
                if recent and now - recent["created_at"] < SEND_COOLDOWN_SECONDS:
                    wait = SEND_COOLDOWN_SECONDS - (now - recent["created_at"])
                    self._json(429, {"message": f"发送太频繁，请 {wait} 秒后再试"})
                    return

                hourly_cnt = conn.execute(
                    "SELECT COUNT(*) AS cnt FROM email_otps WHERE email = ? AND created_at > ?",
                    (email, now - 3600),
                ).fetchone()["cnt"]
                if hourly_cnt >= MAX_HOURLY_PER_EMAIL:
                    self._json(429, {"message": "该邮箱当前小时获取次数已达上限，请稍后再试"})
                    return
            finally:
                conn.close()

        code = f"{secrets.randbelow(900000) + 100000}"
        try:
            send_otp_email(email, code)
        except Exception as exc:
            print(f"[SMTP ERROR] email={email} err={exc}", flush=True)
            self._json(502, {"message": "验证码邮件发送失败，请检查邮箱地址是否正确后重试"})
            return

        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    "INSERT INTO email_otps (email, code, expires_at, created_at) VALUES (?, ?, ?, ?)",
                    (email, code, now + OTP_TTL_SECONDS, now),
                )
                conn.commit()
            finally:
                conn.close()

        self._json(200, {"ok": True, "message": "验证码已发送，请查收邮箱（如未看到可检查垃圾箱）"})

    def _handle_verify_email(self, data: dict) -> None:
        email = str(data.get("email", "")).strip().lower()
        code = str(data.get("code", "")).strip()
        nickname_input = str(data.get("nickname", "") or "").strip()[:16]

        if not EMAIL_RE.match(email):
            self._json(400, {"message": "邮箱格式不正确"})
            return
        if not re.match(r"^\d{6}$", code):
            self._json(400, {"message": "请输入 6 位数字验证码"})
            return

        now = int(time.time())
        with db_lock:
            conn = get_db()
            try:
                otp = conn.execute(
                    """
                    SELECT * FROM email_otps
                    WHERE email = ? AND used = 0
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (email,),
                ).fetchone()

                if not otp:
                    self._json(400, {"message": "请先获取验证码"})
                    return
                if now > otp["expires_at"]:
                    self._json(400, {"message": "验证码已过期，请重新发送"})
                    return
                if otp["attempts"] >= 5:
                    self._json(400, {"message": "错误次数过多，请重新获取验证码"})
                    return
                if otp["code"] != code:
                    conn.execute(
                        "UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?",
                        (otp["id"],),
                    )
                    conn.commit()
                    self._json(400, {"message": "验证码不正确，请重新输入"})
                    return

                conn.execute("UPDATE email_otps SET used = 1 WHERE id = ?", (otp["id"],))

                user_row = conn.execute(
                    "SELECT * FROM users WHERE lower(email) = ?", (email,)
                ).fetchone()

                grant_row = conn.execute(
                    "SELECT * FROM admin_email_grants WHERE lower(email) = ?", (email,)
                ).fetchone()

                iso_now = now_iso()
                if not user_row:
                    uid = "u_" + secrets.token_hex(6)
                    prefix = email.split("@")[0][:12]
                    avatar = PRESET_AVATARS[sum(ord(c) for c in email) % len(PRESET_AVATARS)]
                    nickname = nickname_input or prefix
                    if email in SUPER_ADMIN_EMAILS:
                        init_role = "super_admin"
                    elif grant_row:
                        init_role = "admin"
                    else:
                        init_role = "user"
                    conn.execute(
                        """
                        INSERT INTO users (uid, email, nickname, avatar_url, auth_provider, school_name, role, created_at, updated_at)
                        VALUES (?, ?, ?, ?, 'email', ?, ?, ?, ?)
                        """,
                        (uid, email, nickname, avatar, DEFAULT_SCHOOL, init_role, iso_now, iso_now),
                    )
                    if grant_row:
                        conn.execute(
                            "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                        )
                    user_row = conn.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
                else:
                    next_role = user_row["role"] or "user"
                    if email in SUPER_ADMIN_EMAILS:
                        next_role = "super_admin"
                    elif grant_row and next_role == "user":
                        next_role = "admin"
                        conn.execute(
                            "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                        )
                    next_nick = nickname_input or user_row["nickname"]
                    if next_nick != user_row["nickname"] or next_role != user_row["role"]:
                        conn.execute(
                            "UPDATE users SET nickname = ?, role = ?, updated_at = ? WHERE uid = ?",
                            (next_nick, next_role, iso_now, user_row["uid"]),
                        )
                        user_row = conn.execute(
                            "SELECT * FROM users WHERE uid = ?", (user_row["uid"],)
                        ).fetchone()

                token = secrets.token_urlsafe(32)
                conn.execute(
                    "INSERT INTO sessions (token, uid, created_at, expires_at) VALUES (?, ?, ?, ?)",
                    (token, user_row["uid"], now, now + 30 * 86400),
                )
                conn.commit()
                self._json(200, {"ok": True, "token": token, "user": row_to_user(user_row)})
            finally:
                conn.close()

    def _handle_update_profile(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return

        nickname = str(data.get("nickname") or user_row["nickname"]).strip()[:20]
        avatar_url = str(data.get("avatarUrl") or user_row["avatar_url"]).strip()
        school_name = str(data.get("schoolName") or user_row["school_name"]).strip()[:36]

        if not nickname:
            self._json(400, {"message": "昵称不能为空"})
            return
        if len(avatar_url) > 600_000:
            self._json(400, {"message": "头像文件过大，请换一张小一点的图片"})
            return

        iso_now = now_iso()
        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    "UPDATE users SET nickname = ?, avatar_url = ?, school_name = ?, updated_at = ? WHERE uid = ?",
                    (nickname, avatar_url, school_name, iso_now, user_row["uid"]),
                )
                conn.commit()
                updated = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (user_row["uid"],)
                ).fetchone()
                self._json(200, {"ok": True, "user": row_to_user(updated)})
            finally:
                conn.close()

    def _handle_upload_avatar(self, data: dict) -> None:
        fname, err = _decode_and_save_image(
            data.get("base64", ""), AVATAR_DIR, "av", 1_500_000
        )
        if err or not fname:
            self._json(400, {"message": err or "头像上传失败"})
            return

        avatar_url = f"{PUBLIC_API_BASE.rstrip('/')}/avatars/{fname}"

        user_row = self._get_auth_user()
        if user_row:
            iso_now = now_iso()
            with db_lock:
                conn = get_db()
                try:
                    conn.execute(
                        "UPDATE users SET avatar_url = ?, updated_at = ? WHERE uid = ?",
                        (avatar_url, iso_now, user_row["uid"]),
                    )
                    conn.commit()
                finally:
                    conn.close()

        self._json(200, {"ok": True, "avatarUrl": avatar_url})

    def _handle_upload_image(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        fname, err = _decode_and_save_image(
            data.get("base64", ""), UPLOAD_DIR, "spot", 2_500_000
        )
        if err or not fname:
            self._json(400, {"message": err or "图片上传失败"})
            return
        image_url = f"{PUBLIC_API_BASE.rstrip('/')}/uploads/{fname}"
        self._json(200, {"ok": True, "url": image_url})

    def _exchange_wechat_code(self, wx_code: str) -> tuple[dict | None, int, str]:
        if not WECHAT_APPID or not WECHAT_SECRET:
            return (
                None,
                501,
                "微信小程序登录接口已预留，配置 WECHAT_APPID 和 WECHAT_SECRET 后即可启用",
            )
        if not wx_code:
            return None, 400, "缺少 wxCode 参数"

        qs = urllib.parse.urlencode(
            {
                "appid": WECHAT_APPID,
                "secret": WECHAT_SECRET,
                "js_code": wx_code,
                "grant_type": "authorization_code",
            }
        )
        url = f"https://api.weixin.qq.com/sns/jscode2session?{qs}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                wx_res = json.loads(resp.read().decode("utf-8"))
        except Exception:
            return None, 502, "请求微信授权服务失败"

        if not wx_res.get("openid"):
            return None, 400, wx_res.get("errmsg", "微信登录凭证无效")
        return wx_res, 200, ""

    def _handle_wechat_login(self, data: dict) -> None:
        wx_code = str(data.get("wxCode", "")).strip()
        nick_name = str(data.get("nickName", "") or "").strip()[:20]
        avatar_url = str(data.get("avatarUrl", "") or "").strip()
        if avatar_url.startswith("wxfile://") or avatar_url.startswith("http://tmp/"):
            avatar_url = ""

        wx_res, status, err_msg = self._exchange_wechat_code(wx_code)
        if not wx_res:
            self._json(status, {"message": err_msg})
            return

        openid = wx_res.get("openid")
        unionid = wx_res.get("unionid")

        now = int(time.time())
        iso_now = now_iso()
        is_new_user = False
        with db_lock:
            conn = get_db()
            try:
                user_row = conn.execute(
                    "SELECT * FROM users WHERE wx_openid = ?", (openid,)
                ).fetchone()
                if not user_row:
                    is_new_user = True
                    uid = "wx_" + secrets.token_hex(6)
                    nickname = nick_name or f"五合同学_{uid[-4:]}"
                    avatar = avatar_url or "/assets/avatars/avatar-1.png"
                    conn.execute(
                        """
                        INSERT INTO users (uid, nickname, avatar_url, auth_provider, wx_openid, wx_unionid, school_name, role, created_at, updated_at)
                        VALUES (?, ?, ?, 'wechat_miniprogram', ?, ?, ?, 'user', ?, ?)
                        """,
                        (uid, nickname, avatar, openid, unionid, DEFAULT_SCHOOL, iso_now, iso_now),
                    )
                    user_row = conn.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
                else:
                    # 同步绑定邮箱对应的超管/预授权管理员角色，确保微信一键登录即刻带回管理权限
                    email = (user_row["email"] or "").strip().lower()
                    next_role = user_row["role"] or "user"
                    if email and email in SUPER_ADMIN_EMAILS:
                        next_role = "super_admin"
                    elif email:
                        grant = conn.execute(
                            "SELECT 1 FROM admin_email_grants WHERE lower(email) = ?", (email,)
                        ).fetchone()
                        if grant and next_role == "user":
                            next_role = "admin"
                            conn.execute(
                                "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                            )
                    next_nick = nick_name or user_row["nickname"]
                    next_avatar = avatar_url or user_row["avatar_url"]
                    if (
                        next_nick != user_row["nickname"]
                        or next_avatar != user_row["avatar_url"]
                        or next_role != user_row["role"]
                    ):
                        conn.execute(
                            "UPDATE users SET nickname = ?, avatar_url = ?, role = ?, updated_at = ? WHERE uid = ?",
                            (next_nick, next_avatar, next_role, iso_now, user_row["uid"]),
                        )
                        user_row = conn.execute(
                            "SELECT * FROM users WHERE uid = ?", (user_row["uid"],)
                        ).fetchone()

                token = secrets.token_urlsafe(32)
                conn.execute(
                    "INSERT INTO sessions (token, uid, created_at, expires_at) VALUES (?, ?, ?, ?)",
                    (token, user_row["uid"], now, now + 30 * 86400),
                )
                conn.commit()
                user_dict = row_to_user(user_row)
                needs_profile = (
                    is_new_user
                    or user_dict["nickname"].startswith("五合同学_")
                    or user_dict["nickname"].startswith("微信同学_")
                )
                self._json(
                    200,
                    {
                        "ok": True,
                        "token": token,
                        "user": user_dict,
                        "isNewUser": is_new_user,
                        "needsProfile": needs_profile,
                    },
                )
            finally:
                conn.close()

    def _handle_bind_wechat(self, data: dict) -> None:
        """已登录账号（如邮箱超级管理员/管理员）一键绑定当前微信，支持自动合并此前未绑邮箱的微信临时账号"""
        actor = self._require_user()
        if not actor:
            return
        wx_code = str(data.get("wxCode", "") or "").strip()
        wx_res, status, err_msg = self._exchange_wechat_code(wx_code)
        if not wx_res:
            self._json(status, {"message": err_msg})
            return

        openid = wx_res.get("openid")
        unionid = wx_res.get("unionid")
        iso = now_iso()

        with db_lock:
            conn = get_db()
            try:
                current = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (actor["uid"],)
                ).fetchone()
                if not current:
                    self._json(401, {"message": "账号状态已失效，请重新登录"})
                    return

                if current["wx_openid"]:
                    if current["wx_openid"] == openid:
                        self._json(
                            200,
                            {
                                "ok": True,
                                "alreadyBound": True,
                                "message": "当前账号已绑定此微信，可直接微信一键登录",
                                "user": row_to_user(current),
                            },
                        )
                        return
                    self._json(400, {"message": "当前账号已绑定其他微信，请先解绑后再更换"})
                    return

                existing_wx = conn.execute(
                    "SELECT * FROM users WHERE wx_openid = ?", (openid,)
                ).fetchone()

                merged = False
                if existing_wx and existing_wx["uid"] != current["uid"]:
                    existing_email = (existing_wx["email"] or "").strip().lower()
                    current_email = (current["email"] or "").strip().lower()
                    if existing_email and existing_email != current_email:
                        self._json(
                            409,
                            {"message": f"该微信号已绑定其他邮箱账号（{existing_email}），请先在对应账号解绑后再试"},
                        )
                        return

                    # 该微信之前单独一键登录过且未绑定邮箱：自动合并其内容与最高权限到当前账号！
                    next_role = merge_roles(
                        current["role"], existing_wx["role"], current["email"], existing_wx["email"]
                    )
                    merge_user_records(conn, current["uid"], existing_wx["uid"])
                    conn.execute(
                        "UPDATE users SET wx_openid = ?, wx_unionid = ?, role = ?, updated_at = ? WHERE uid = ?",
                        (openid, unionid, next_role, iso, current["uid"]),
                    )
                    merged = True
                else:
                    next_role = merge_roles(current["role"], "user", current["email"], None)
                    conn.execute(
                        "UPDATE users SET wx_openid = ?, wx_unionid = ?, role = ?, updated_at = ? WHERE uid = ?",
                        (openid, unionid, next_role, iso, current["uid"]),
                    )

                conn.commit()
                updated = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (current["uid"],)
                ).fetchone()
                msg = (
                    "已合并并绑定当前微信！下次可直接用微信一键登录管理员账号 ✨"
                    if merged
                    else "微信账号绑定成功！下次可直接用微信一键登录 ✨"
                )
                self._json(200, {"ok": True, "merged": merged, "message": msg, "user": row_to_user(updated)})
            finally:
                conn.close()

    def _handle_unbind_wechat(self) -> None:
        """解除当前账号的微信绑定（仅在已绑定邮箱时允许解绑，防止账号锁死）"""
        actor = self._require_user()
        if not actor:
            return
        iso = now_iso()
        with db_lock:
            conn = get_db()
            try:
                current = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (actor["uid"],)
                ).fetchone()
                if not current:
                    self._json(401, {"message": "请先登录"})
                    return
                if not current["wx_openid"]:
                    self._json(400, {"message": "当前账号尚未绑定微信"})
                    return
                if not (current["email"] or "").strip():
                    self._json(400, {"message": "请先绑定邮箱后再解绑微信，以免无法登录"})
                    return
                conn.execute(
                    "UPDATE users SET wx_openid = NULL, wx_unionid = NULL, updated_at = ? WHERE uid = ?",
                    (iso, current["uid"]),
                )
                conn.commit()
                updated = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (current["uid"],)
                ).fetchone()
                self._json(200, {"ok": True, "message": "已解除微信绑定", "user": row_to_user(updated)})
            finally:
                conn.close()

    def _handle_bind_email(self, data: dict) -> None:
        """已用微信一键登录的用户通过 6 位邮箱验证码绑定邮箱（若绑定超管/管理员邮箱则自动合并并继承权限）"""
        actor = self._require_user()
        if not actor:
            return

        email = str(data.get("email", "") or "").strip().lower()
        code = str(data.get("code", "") or "").strip()
        if not EMAIL_RE.match(email) or len(email) > 120:
            self._json(400, {"message": "请输入有效的邮箱地址"})
            return
        if not re.match(r"^\d{6}$", code):
            self._json(400, {"message": "请输入 6 位数字验证码"})
            return

        now = int(time.time())
        iso = now_iso()
        with db_lock:
            conn = get_db()
            try:
                otp = conn.execute(
                    """
                    SELECT * FROM email_otps
                    WHERE email = ? AND used = 0
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (email,),
                ).fetchone()
                if not otp:
                    self._json(400, {"message": "请先获取验证码"})
                    return
                if now > otp["expires_at"]:
                    self._json(400, {"message": "验证码已过期，请重新发送"})
                    return
                if otp["attempts"] >= 5:
                    self._json(400, {"message": "错误次数过多，请重新获取验证码"})
                    return
                if otp["code"] != code:
                    conn.execute(
                        "UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?",
                        (otp["id"],),
                    )
                    conn.commit()
                    self._json(400, {"message": "验证码不正确，请重新输入"})
                    return

                current = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (actor["uid"],)
                ).fetchone()
                if not current:
                    self._json(401, {"message": "登录状态已失效，请重新登录"})
                    return

                current_email = (current["email"] or "").strip().lower()
                if current_email:
                    if current_email == email:
                        conn.execute("UPDATE email_otps SET used = 1 WHERE id = ?", (otp["id"],))
                        conn.commit()
                        self._json(
                            200,
                            {
                                "ok": True,
                                "alreadyBound": True,
                                "message": "当前账号已绑定该邮箱",
                                "user": row_to_user(current),
                            },
                        )
                        return
                    self._json(400, {"message": f"当前账号已绑定邮箱 {current_email}"})
                    return

                existing_email = conn.execute(
                    "SELECT * FROM users WHERE lower(email) = ?", (email,)
                ).fetchone()
                grant_row = conn.execute(
                    "SELECT * FROM admin_email_grants WHERE lower(email) = ?", (email,)
                ).fetchone()

                if existing_email and existing_email["uid"] != current["uid"]:
                    if existing_email["wx_openid"] and existing_email["wx_openid"] != current["wx_openid"]:
                        self._json(
                            409,
                            {"message": "该邮箱已绑定其他微信号，请先用邮箱登录解绑原微信后再试"},
                        )
                        return

                    # 验证码消费 + 合并微信与已存在的邮箱账号（保留邮箱账号为主体，迁移当前微信 token 与内容）
                    conn.execute("UPDATE email_otps SET used = 1 WHERE id = ?", (otp["id"],))
                    wx_openid = current["wx_openid"]
                    wx_unionid = current["wx_unionid"]
                    merged_role = merge_roles(
                        existing_email["role"], current["role"], existing_email["email"], None
                    )
                    if grant_row:
                        merged_role = merge_roles(merged_role, "admin", existing_email["email"], None)
                        conn.execute(
                            "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                        )

                    merge_user_records(conn, existing_email["uid"], current["uid"])
                    conn.execute(
                        "UPDATE users SET wx_openid = ?, wx_unionid = ?, role = ?, updated_at = ? WHERE uid = ?",
                        (wx_openid, wx_unionid, merged_role, iso, existing_email["uid"]),
                    )
                    conn.commit()
                    updated = conn.execute(
                        "SELECT * FROM users WHERE uid = ?", (existing_email["uid"],)
                    ).fetchone()
                    self._json(
                        200,
                        {
                            "ok": True,
                            "merged": True,
                            "message": f"已将当前微信与 {email} 合并绑定 ✨",
                            "user": row_to_user(updated),
                        },
                    )
                    return

                conn.execute("UPDATE email_otps SET used = 1 WHERE id = ?", (otp["id"],))
                next_role = merge_roles(current["role"], "user", email, None)
                if grant_row:
                    next_role = merge_roles(next_role, "admin", email, None)
                    conn.execute(
                        "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                    )

                conn.execute(
                    "UPDATE users SET email = ?, role = ?, updated_at = ? WHERE uid = ?",
                    (email, next_role, iso, current["uid"]),
                )
                conn.commit()
                updated = conn.execute(
                    "SELECT * FROM users WHERE uid = ?", (current["uid"],)
                ).fetchone()
                self._json(
                    200,
                    {
                        "ok": True,
                        "merged": False,
                        "message": f"已成功绑定邮箱 {email} ✨",
                        "user": row_to_user(updated),
                    },
                )
            finally:
                conn.close()

    # ==================== 超级管理员与管理员管理 ====================

    def _handle_admin_overview(self) -> None:
        user_row = self._require_admin()
        if not user_row:
            return
        with db_lock:
            conn = get_db()
            try:
                stats = {
                    "spotsCount": conn.execute("SELECT COUNT(*) AS c FROM spots").fetchone()["c"],
                    "reviewsCount": conn.execute("SELECT COUNT(*) AS c FROM spot_reviews").fetchone()["c"],
                    "bubblesCount": conn.execute("SELECT COUNT(*) AS c FROM vent_bubbles").fetchone()["c"],
                    "buddiesCount": conn.execute("SELECT COUNT(*) AS c FROM buddies").fetchone()["c"],
                    "messagesCount": conn.execute("SELECT COUNT(*) AS c FROM buddy_messages").fetchone()["c"],
                    "usersCount": conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"],
                    "adminsCount": conn.execute(
                        "SELECT COUNT(*) AS c FROM users WHERE role IN ('super_admin', 'admin')"
                    ).fetchone()["c"],
                    "pendingAdminGrantsCount": conn.execute(
                        "SELECT COUNT(*) AS c FROM admin_email_grants"
                    ).fetchone()["c"],
                }
                self._json(200, {"ok": True, "stats": stats, "me": row_to_user(user_row)})
            finally:
                conn.close()

    def _handle_list_admins(self, query_text: str) -> None:
        user_row = self._require_super_admin()
        if not user_row:
            return
        with db_lock:
            conn = get_db()
            try:
                admin_rows = conn.execute(
                    """
                    SELECT * FROM users
                    WHERE role IN ('super_admin', 'admin')
                    ORDER BY CASE role WHEN 'super_admin' THEN 0 ELSE 1 END, updated_at DESC
                    """
                ).fetchall()
                grants_rows = conn.execute(
                    "SELECT * FROM admin_email_grants ORDER BY created_at DESC"
                ).fetchall()

                if query_text:
                    like = f"%{query_text.lower()}%"
                    user_rows = conn.execute(
                        """
                        SELECT * FROM users
                        WHERE lower(nickname) LIKE ? OR lower(COALESCE(email, '')) LIKE ? OR lower(uid) LIKE ?
                        ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at DESC
                        LIMIT 80
                        """,
                        (like, like, like),
                    ).fetchall()
                else:
                    user_rows = conn.execute(
                        """
                        SELECT * FROM users
                        ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at DESC
                        LIMIT 80
                        """
                    ).fetchall()

                self._json(
                    200,
                    {
                        "ok": True,
                        "superAdminEmails": sorted(SUPER_ADMIN_EMAILS),
                        "admins": [row_to_user(r, include_sensitive=False) for r in admin_rows],
                        "pendingGrants": [
                            {
                                "email": g["email"],
                                "note": g["note"],
                                "grantedBy": g["granted_by"],
                                "createdAt": g["created_at"],
                            }
                            for g in grants_rows
                        ],
                        "users": [row_to_user(r, include_sensitive=False) for r in user_rows],
                    },
                )
            finally:
                conn.close()

    def _handle_add_admin(self, data: dict) -> None:
        actor = self._require_super_admin()
        if not actor:
            return

        uid = str(data.get("uid", "") or "").strip()
        email = str(data.get("email", "") or "").strip().lower()
        note = str(data.get("note", "") or "").strip()[:40]

        if not uid and not email:
            self._json(400, {"message": "请输入要设为管理员的邮箱或选择用户"})
            return

        iso = now_iso()
        with db_lock:
            conn = get_db()
            try:
                if uid:
                    target = conn.execute(
                        "SELECT * FROM users WHERE uid = ?", (uid,)
                    ).fetchone()
                    if not target:
                        self._json(404, {"message": "未找到该用户"})
                        return
                    if resolve_user_role(target) == "super_admin":
                        self._json(400, {"message": "该用户已是超级管理员，无需重复设置"})
                        return
                    conn.execute(
                        "UPDATE users SET role = 'admin', updated_at = ? WHERE uid = ?",
                        (iso, uid),
                    )
                    if target["email"]:
                        conn.execute(
                            "DELETE FROM admin_email_grants WHERE lower(email) = ?",
                            (target["email"].strip().lower(),),
                        )
                    conn.commit()
                    updated = conn.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
                    self._json(
                        200,
                        {
                            "ok": True,
                            "mode": "upgraded",
                            "message": f"已将「{updated['nickname']}」设为管理员",
                            "user": row_to_user(updated),
                        },
                    )
                    return

                if not EMAIL_RE.match(email) or len(email) > 120:
                    self._json(400, {"message": "请输入有效的邮箱地址"})
                    return
                if email in SUPER_ADMIN_EMAILS:
                    self._json(400, {"message": "该邮箱已是超级管理员，无需重复添加"})
                    return

                target = conn.execute(
                    "SELECT * FROM users WHERE lower(email) = ?", (email,)
                ).fetchone()
                if target:
                    if resolve_user_role(target) == "super_admin":
                        self._json(400, {"message": "该用户已是超级管理员"})
                        return
                    conn.execute(
                        "UPDATE users SET role = 'admin', updated_at = ? WHERE uid = ?",
                        (iso, target["uid"]),
                    )
                    conn.execute(
                        "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                    )
                    conn.commit()
                    updated = conn.execute(
                        "SELECT * FROM users WHERE uid = ?", (target["uid"],)
                    ).fetchone()
                    self._json(
                        200,
                        {
                            "ok": True,
                            "mode": "upgraded",
                            "message": f"已将 {email} 设为管理员",
                            "user": row_to_user(updated),
                        },
                    )
                    return

                conn.execute(
                    """
                    INSERT INTO admin_email_grants (email, note, granted_by, created_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(email) DO UPDATE SET note = excluded.note, granted_by = excluded.granted_by, created_at = excluded.created_at
                    """,
                    (email, note, actor["email"] or actor["nickname"], iso),
                )
                conn.commit()
                self._json(
                    200,
                    {
                        "ok": True,
                        "mode": "pregranted",
                        "message": f"已预授权 {email} 为管理员，首次邮箱登录自动生效",
                        "grant": {
                            "email": email,
                            "note": note,
                            "grantedBy": actor["email"] or actor["nickname"],
                            "createdAt": iso,
                        },
                    },
                )
            finally:
                conn.close()

    def _handle_remove_admin(self, data: dict) -> None:
        actor = self._require_super_admin()
        if not actor:
            return

        uid = str(data.get("uid", "") or "").strip()
        email = str(data.get("email", "") or "").strip().lower()
        if not uid and not email:
            self._json(400, {"message": "缺少目标用户参数"})
            return

        iso = now_iso()
        with db_lock:
            conn = get_db()
            try:
                if uid:
                    target = conn.execute(
                        "SELECT * FROM users WHERE uid = ?", (uid,)
                    ).fetchone()
                    if not target:
                        self._json(404, {"message": "未找到该用户"})
                        return
                    if resolve_user_role(target) == "super_admin" or target["uid"] == actor["uid"]:
                        self._json(400, {"message": "不能撤销超级管理员权限"})
                        return
                    conn.execute(
                        "UPDATE users SET role = 'user', updated_at = ? WHERE uid = ?",
                        (iso, uid),
                    )
                    if target["email"]:
                        conn.execute(
                            "DELETE FROM admin_email_grants WHERE lower(email) = ?",
                            (target["email"].strip().lower(),),
                        )
                    conn.commit()
                    self._json(200, {"ok": True, "message": "已撤销该用户的管理员权限"})
                    return

                if email in SUPER_ADMIN_EMAILS:
                    self._json(400, {"message": "不能撤销超级管理员权限"})
                    return
                conn.execute(
                    "DELETE FROM admin_email_grants WHERE lower(email) = ?", (email,)
                )
                target = conn.execute(
                    "SELECT * FROM users WHERE lower(email) = ?", (email,)
                ).fetchone()
                if target:
                    if resolve_user_role(target) == "super_admin":
                        self._json(400, {"message": "不能撤销超级管理员权限"})
                        return
                    conn.execute(
                        "UPDATE users SET role = 'user', updated_at = ? WHERE uid = ?",
                        (iso, target["uid"]),
                    )
                conn.commit()
                self._json(200, {"ok": True, "message": "已移除管理员授权"})
            finally:
                conn.close()

    # ==================== 治愈地图：地点与打卡评论 ====================

    def _load_all_spots(self, conn: sqlite3.Connection) -> list[dict]:
        spot_rows = conn.execute(
            "SELECT * FROM spots ORDER BY created_at DESC, marker_id ASC"
        ).fetchall()
        rev_rows = conn.execute(
            "SELECT * FROM spot_reviews ORDER BY updated_at DESC, rowid DESC"
        ).fetchall()
        rev_map: dict[str, list[dict]] = {}
        for r in rev_rows:
            rev_map.setdefault(r["spot_id"], []).append(row_to_review(r))
        return [row_to_spot(s, rev_map.get(s["id"], [])) for s in spot_rows]

    def _handle_list_spots(self) -> None:
        with db_lock:
            conn = get_db()
            try:
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    def _handle_create_spot(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return

        name = str(data.get("name", "") or "").strip()[:36]
        recommendation = str(data.get("recommendation", "") or "").strip()[:200]
        category = str(data.get("category", "sunset") or "sunset").strip()
        if category not in VALID_SPOT_CATEGORIES:
            category = "sunset"
        try:
            longitude = float(data.get("longitude"))
            latitude = float(data.get("latitude"))
        except Exception:
            self._json(400, {"message": "请提供有效的地图经纬度坐标"})
            return
        if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
            self._json(400, {"message": "地图坐标超出有效范围"})
            return
        if not name or not recommendation:
            self._json(400, {"message": "请填写地点名称和安利理由"})
            return

        try:
            rating = max(1.0, min(5.0, float(data.get("rating", 5))))
        except Exception:
            rating = 5.0

        cover_url = str(data.get("coverUrl", "") or "").strip() or "/assets/spots/sunset.png"
        quiet_status = str(data.get("quietStatus", "") or "").strip()
        if quiet_status not in VALID_QUIET_STATUSES:
            quiet_status = "very_quiet" if rating >= 4 else ("moderate" if rating >= 3 else "crowded")

        raw_tags = data.get("tags")
        if isinstance(raw_tags, list) and raw_tags:
            tags = [str(t).strip()[:16] for t in raw_tags if str(t).strip()][:6]
        else:
            tags = ["五合私藏", "极度安静" if rating >= 4 else "轻松放空", "同学标记"]

        iso = now_iso()
        spot_id = f"spot-{int(time.time() * 1000)}-{secrets.token_hex(3)}"
        rev_id = f"rev-{int(time.time() * 1000)}-{secrets.token_hex(2)}"
        author_name = user_row["nickname"] or "五合探索者"

        with db_lock:
            conn = get_db()
            try:
                max_row = conn.execute(
                    "SELECT COALESCE(MAX(marker_id), 10) AS m FROM spots"
                ).fetchone()
                marker_id = int(max_row["m"]) + 1
                conn.execute(
                    """
                    INSERT INTO spots (
                        id, marker_id, name, category, longitude, latitude, cover_url,
                        quiet_status, quiet_updated_at, rating, recommendation, likes,
                        tags_json, author_uid, author_name, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '刚刚标记', ?, ?, 1, ?, ?, ?, ?, ?)
                    """,
                    (
                        spot_id,
                        marker_id,
                        name,
                        category,
                        longitude,
                        latitude,
                        cover_url,
                        quiet_status,
                        rating,
                        recommendation,
                        json.dumps(tags, ensure_ascii=False),
                        user_row["uid"],
                        author_name,
                        iso,
                        iso,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO spot_reviews (
                        id, spot_id, author_uid, author, content, mood_tag, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, '新发现秘境', ?, ?)
                    """,
                    (rev_id, spot_id, user_row["uid"], author_name, recommendation, format_short_time(), iso),
                )
                conn.commit()
                spots = self._load_all_spots(conn)
                created = next((s for s in spots if s["id"] == spot_id), None)
                self._json(200, {"ok": True, "spot": created, "spots": spots})
            finally:
                conn.close()

    def _handle_update_spot(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return

        spot_id = str(data.get("id", "") or "").strip()
        if not spot_id:
            self._json(400, {"message": "缺少地点 ID"})
            return

        with db_lock:
            conn = get_db()
            try:
                existing = conn.execute(
                    "SELECT * FROM spots WHERE id = ?", (spot_id,)
                ).fetchone()
                if not existing:
                    self._json(404, {"message": "未找到该地图地点"})
                    return

                name = str(data.get("name", existing["name"]) or "").strip()[:36]
                recommendation = str(
                    data.get("recommendation", existing["recommendation"]) or ""
                ).strip()[:200]
                if not name or not recommendation:
                    self._json(400, {"message": "地点名称和安利理由不能为空"})
                    return

                category = str(data.get("category", existing["category"]) or existing["category"]).strip()
                if category not in VALID_SPOT_CATEGORIES:
                    category = existing["category"]

                try:
                    longitude = float(data.get("longitude", existing["longitude"]))
                    latitude = float(data.get("latitude", existing["latitude"]))
                except Exception:
                    self._json(400, {"message": "经纬度格式无效"})
                    return
                if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
                    self._json(400, {"message": "经纬度超出有效范围"})
                    return

                try:
                    rating = max(1.0, min(5.0, float(data.get("rating", existing["rating"]))))
                except Exception:
                    rating = float(existing["rating"])

                quiet_status = str(
                    data.get("quietStatus", existing["quiet_status"]) or existing["quiet_status"]
                ).strip()
                if quiet_status not in VALID_QUIET_STATUSES:
                    quiet_status = existing["quiet_status"]

                cover_url = (
                    str(data.get("coverUrl", existing["cover_url"]) or "").strip()
                    or existing["cover_url"]
                )
                author_name = (
                    str(data.get("authorName", existing["author_name"]) or "").strip()[:24]
                    or existing["author_name"]
                )

                if "tags" in data:
                    raw_tags = data.get("tags")
                    if isinstance(raw_tags, list):
                        tags = [str(t).strip()[:16] for t in raw_tags if str(t).strip()][:8]
                    elif isinstance(raw_tags, str):
                        tags = [
                            t.strip()[:16]
                            for t in re.split(r"[,，、\s]+", raw_tags)
                            if t.strip()
                        ][:8]
                    else:
                        tags = _safe_json_list(existing["tags_json"])
                else:
                    tags = _safe_json_list(existing["tags_json"])

                iso = now_iso()
                conn.execute(
                    """
                    UPDATE spots
                    SET name = ?, category = ?, longitude = ?, latitude = ?, cover_url = ?,
                        quiet_status = ?, rating = ?, recommendation = ?, tags_json = ?,
                        author_name = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        name,
                        category,
                        longitude,
                        latitude,
                        cover_url,
                        quiet_status,
                        rating,
                        recommendation,
                        json.dumps(tags, ensure_ascii=False),
                        author_name,
                        iso,
                        spot_id,
                    ),
                )
                conn.commit()
                spots = self._load_all_spots(conn)
                updated = next((s for s in spots if s["id"] == spot_id), None)
                self._json(200, {"ok": True, "spot": updated, "spots": spots})
            finally:
                conn.close()

    def _handle_delete_spot(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        spot_id = str(data.get("id", "") or "").strip()
        if not spot_id:
            self._json(400, {"message": "缺少地点 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                conn.execute("DELETE FROM spot_reviews WHERE spot_id = ?", (spot_id,))
                cur = conn.execute("DELETE FROM spots WHERE id = ?", (spot_id,))
                conn.commit()
                if cur.rowcount == 0:
                    self._json(404, {"message": "未找到该地点"})
                    return
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    def _handle_like_spot(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        spot_id = str(data.get("id", "") or "").strip()
        delta = 1 if data.get("liked", True) else -1
        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    "UPDATE spots SET likes = MAX(0, likes + ?) WHERE id = ?",
                    (delta, spot_id),
                )
                conn.commit()
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    def _handle_quiet_spot(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        spot_id = str(data.get("id", "") or "").strip()
        status = str(data.get("quietStatus", "") or "").strip()
        if status not in VALID_QUIET_STATUSES:
            self._json(400, {"message": "无效的安静度状态"})
            return
        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    "UPDATE spots SET quiet_status = ?, quiet_updated_at = '刚刚更新', updated_at = ? WHERE id = ?",
                    (status, now_iso(), spot_id),
                )
                conn.commit()
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    def _handle_create_review(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        spot_id = str(data.get("spotId", "") or "").strip()
        content = str(data.get("content", "") or "").strip()[:240]
        mood_tag = str(data.get("moodTag", "被治愈到了") or "被治愈到了").strip()[:20]
        if not spot_id or not content:
            self._json(400, {"message": "请输入打卡内容"})
            return
        iso = now_iso()
        rev_id = f"rev-{int(time.time() * 1000)}-{secrets.token_hex(2)}"
        with db_lock:
            conn = get_db()
            try:
                if not conn.execute("SELECT 1 FROM spots WHERE id = ?", (spot_id,)).fetchone():
                    self._json(404, {"message": "目标地点不存在"})
                    return
                conn.execute(
                    """
                    INSERT INTO spot_reviews (id, spot_id, author_uid, author, content, mood_tag, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rev_id,
                        spot_id,
                        user_row["uid"],
                        user_row["nickname"] or "五合同学",
                        content,
                        mood_tag,
                        format_short_time(),
                        iso,
                    ),
                )
                conn.commit()
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    def _handle_update_review(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        rev_id = str(data.get("id", "") or "").strip()
        content = str(data.get("content", "") or "").strip()[:240]
        if not rev_id or not content:
            self._json(400, {"message": "打卡内容不能为空"})
            return
        with db_lock:
            conn = get_db()
            try:
                existing = conn.execute(
                    "SELECT * FROM spot_reviews WHERE id = ?", (rev_id,)
                ).fetchone()
                if not existing:
                    self._json(404, {"message": "未找到该打卡记录"})
                    return
                mood_tag = (
                    str(data.get("moodTag", existing["mood_tag"]) or "").strip()[:20]
                    or existing["mood_tag"]
                )
                author = (
                    str(data.get("author", existing["author"]) or "").strip()[:24]
                    or existing["author"]
                )
                conn.execute(
                    "UPDATE spot_reviews SET content = ?, mood_tag = ?, author = ?, updated_at = ? WHERE id = ?",
                    (content, mood_tag, author, now_iso(), rev_id),
                )
                conn.commit()
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    def _handle_delete_review(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        rev_id = str(data.get("id", "") or "").strip()
        if not rev_id:
            self._json(400, {"message": "缺少打卡记录 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                cur = conn.execute("DELETE FROM spot_reviews WHERE id = ?", (rev_id,))
                conn.commit()
                if cur.rowcount == 0:
                    self._json(404, {"message": "未找到该打卡记录"})
                    return
                spots = self._load_all_spots(conn)
                self._json(200, {"ok": True, "spots": spots})
            finally:
                conn.close()

    # ==================== 同校悬浮共鸣泡泡 ====================

    def _load_all_bubbles(self, conn: sqlite3.Connection) -> list[dict]:
        rows = conn.execute(
            "SELECT * FROM vent_bubbles ORDER BY updated_at DESC, rowid DESC"
        ).fetchall()
        return [row_to_bubble(r) for r in rows]

    def _handle_list_bubbles(self) -> None:
        with db_lock:
            conn = get_db()
            try:
                self._json(200, {"ok": True, "bubbles": self._load_all_bubbles(conn)})
            finally:
                conn.close()

    def _handle_create_bubble(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        content = str(data.get("content", "") or "").strip()[:240]
        tag = str(data.get("tag", "低电量时刻") or "低电量时刻").strip()[:20]
        tone = str(data.get("tone", "lavender") or "lavender").strip()
        if tone not in VALID_BUBBLE_TONES:
            tone = "lavender"
        if not content:
            self._json(400, {"message": "泡泡内容不能为空"})
            return
        author_name = (
            str(data.get("authorName", "") or "").strip()[:20] or "五合匿名泡泡"
        )
        bid = f"vb-{int(time.time() * 1000)}-{secrets.token_hex(2)}"
        iso = now_iso()
        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    """
                    INSERT INTO vent_bubbles (id, content, tag, tone, hugs, empathy, author_uid, author_name, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
                    """,
                    (bid, content, tag, tone, user_row["uid"], author_name, format_short_time(), iso),
                )
                conn.commit()
                bubbles = self._load_all_bubbles(conn)
                created = next((b for b in bubbles if b["id"] == bid), None)
                self._json(200, {"ok": True, "bubble": created, "bubbles": bubbles})
            finally:
                conn.close()

    def _handle_react_bubble(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        bid = str(data.get("id", "") or "").strip()
        field = str(data.get("field", "") or "").strip()
        delta = 1 if int(data.get("delta", 1) or 1) >= 0 else -1
        if field not in ("hugs", "empathy"):
            self._json(400, {"message": "无效的互动类型"})
            return
        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    f"UPDATE vent_bubbles SET {field} = MAX(0, {field} + ?) WHERE id = ?",
                    (delta, bid),
                )
                conn.commit()
                self._json(200, {"ok": True, "bubbles": self._load_all_bubbles(conn)})
            finally:
                conn.close()

    def _handle_update_bubble(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        bid = str(data.get("id", "") or "").strip()
        content = str(data.get("content", "") or "").strip()[:240]
        if not bid or not content:
            self._json(400, {"message": "泡泡内容不能为空"})
            return
        with db_lock:
            conn = get_db()
            try:
                existing = conn.execute(
                    "SELECT * FROM vent_bubbles WHERE id = ?", (bid,)
                ).fetchone()
                if not existing:
                    self._json(404, {"message": "未找到该共鸣泡泡"})
                    return
                tag = str(data.get("tag", existing["tag"]) or "").strip()[:20] or existing["tag"]
                tone = str(data.get("tone", existing["tone"]) or existing["tone"]).strip()
                if tone not in VALID_BUBBLE_TONES:
                    tone = existing["tone"]
                author_name = (
                    str(data.get("authorName", existing["author_name"]) or "").strip()[:20]
                    or existing["author_name"]
                )
                conn.execute(
                    "UPDATE vent_bubbles SET content = ?, tag = ?, tone = ?, author_name = ?, updated_at = ? WHERE id = ?",
                    (content, tag, tone, author_name, now_iso(), bid),
                )
                conn.commit()
                bubbles = self._load_all_bubbles(conn)
                updated = next((b for b in bubbles if b["id"] == bid), None)
                self._json(200, {"ok": True, "bubble": updated, "bubbles": bubbles})
            finally:
                conn.close()

    def _handle_delete_bubble(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        bid = str(data.get("id", "") or "").strip()
        if not bid:
            self._json(400, {"message": "缺少泡泡 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                cur = conn.execute("DELETE FROM vent_bubbles WHERE id = ?", (bid,))
                conn.commit()
                if cur.rowcount == 0:
                    self._json(404, {"message": "未找到该共鸣泡泡"})
                    return
                self._json(200, {"ok": True, "bubbles": self._load_all_bubbles(conn)})
            finally:
                conn.close()

    # ==================== 无负担限时搭子与频道消息 ====================

    def _load_all_buddies(
        self, conn: sqlite3.Connection, viewer_uid: str = "", refresh_if_all_expired: bool = True
    ) -> list[dict]:
        rows = conn.execute(
            "SELECT * FROM buddies ORDER BY created_at DESC, rowid DESC"
        ).fetchall()
        now_ms = int(time.time() * 1000)
        if refresh_if_all_expired and rows and not any(int(r["expires_at"]) > now_ms + 60_000 for r in rows):
            for idx, r in enumerate(rows):
                new_exp = now_ms + (18 + ((idx * 4) % 12)) * 60 * 1000
                conn.execute(
                    "UPDATE buddies SET expires_at = ? WHERE id = ?", (new_exp, r["id"])
                )
            conn.commit()
            rows = conn.execute(
                "SELECT * FROM buddies ORDER BY created_at DESC, rowid DESC"
            ).fetchall()

        msg_rows = conn.execute(
            "SELECT * FROM buddy_messages ORDER BY created_at ASC, rowid ASC"
        ).fetchall()
        msg_map: dict[str, list[dict]] = {}
        for m in msg_rows:
            msg_map.setdefault(m["buddy_id"], []).append(
                row_to_buddy_message(m, viewer_uid)
            )
        return [row_to_buddy(b, msg_map.get(b["id"], []), viewer_uid) for b in rows]

    def _handle_list_buddies(self) -> None:
        viewer = self._get_auth_user()
        viewer_uid = viewer["uid"] if viewer else ""
        with db_lock:
            conn = get_db()
            try:
                buddies = self._load_all_buddies(conn, viewer_uid)
                self._json(200, {"ok": True, "buddies": buddies})
            finally:
                conn.close()

    def _handle_create_buddy(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return

        title = str(data.get("title", "") or "").strip()[:40]
        location = str(data.get("location", "") or "").strip()[:50]
        if not title or not location:
            self._json(400, {"message": "请填写活动名称和集合点"})
            return

        category = str(data.get("category", "walk") or "walk").strip()
        if category not in VALID_BUDDY_CATEGORIES:
            category = "walk"
        try:
            duration = max(10, min(180, int(data.get("durationMinutes", 30))))
        except Exception:
            duration = 30
        try:
            max_people = max(2, min(12, int(data.get("maxPeople", 2))))
        except Exception:
            max_people = 2

        cipher = str(data.get("cipher", "") or "").strip()[:40] or "挥挥手机亮屏示意"
        vibe_note = (
            str(data.get("vibeNote", "") or "").strip()[:120]
            or "主打轻松无压，30分钟一起充个电，到点自由散场。"
        )
        is_silent = 1 if data.get("isSilent", True) else 0
        host_alias = user_row["nickname"] or "五合同学"

        bid = f"buddy-{int(time.time() * 1000)}-{secrets.token_hex(3)}"
        mid = f"qm-{int(time.time() * 1000)}-{secrets.token_hex(2)}"
        expires_at = int(time.time() * 1000) + duration * 60 * 1000
        iso = now_iso()

        with db_lock:
            conn = get_db()
            try:
                conn.execute(
                    """
                    INSERT INTO buddies (
                        id, title, category, location, duration_minutes, expires_at,
                        max_people, joined_count, joined_uids_json, host_uid, host_alias,
                        cipher, vibe_note, boundary_tag, is_silent, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, '活动结束自动解散 · 不强制加微信', ?, ?, ?)
                    """,
                    (
                        bid,
                        title,
                        category,
                        location,
                        duration,
                        expires_at,
                        max_people,
                        json.dumps([user_row["uid"]]),
                        user_row["uid"],
                        host_alias,
                        cipher,
                        vibe_note,
                        is_silent,
                        iso,
                        iso,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO buddy_messages (id, buddy_id, sender_uid, sender, text, time_label, created_at)
                    VALUES (?, ?, ?, ?, ?, '刚刚', ?)
                    """,
                    (
                        mid,
                        bid,
                        user_row["uid"],
                        host_alias,
                        f"临时频道已开启，暗号：{cipher}",
                        iso,
                    ),
                )
                conn.commit()
                buddies = self._load_all_buddies(conn, user_row["uid"], refresh_if_all_expired=False)
                created = next((b for b in buddies if b["id"] == bid), None)
                self._json(200, {"ok": True, "buddy": created, "buddies": buddies})
            finally:
                conn.close()

    def _handle_join_buddy(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        bid = str(data.get("id", "") or "").strip()
        if not bid:
            self._json(400, {"message": "缺少搭子 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                row = conn.execute("SELECT * FROM buddies WHERE id = ?", (bid,)).fetchone()
                if not row:
                    self._json(404, {"message": "未找到该限时搭子"})
                    return
                joined_uids = _safe_json_list(row["joined_uids_json"])
                joined_count = int(row["joined_count"])
                max_people = int(row["max_people"])
                uid = user_row["uid"]

                if uid in joined_uids:
                    joined_uids = [u for u in joined_uids if u != uid]
                    joined_count = max(1, joined_count - 1)
                else:
                    if joined_count >= max_people:
                        self._json(400, {"message": "这个搭子已经满员啦～"})
                        return
                    joined_uids.append(uid)
                    joined_count = min(max_people, joined_count + 1)

                conn.execute(
                    "UPDATE buddies SET joined_uids_json = ?, joined_count = ?, updated_at = ? WHERE id = ?",
                    (json.dumps(joined_uids), joined_count, now_iso(), bid),
                )
                conn.commit()
                buddies = self._load_all_buddies(conn, uid, refresh_if_all_expired=False)
                self._json(200, {"ok": True, "buddies": buddies})
            finally:
                conn.close()

    def _handle_update_buddy(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        bid = str(data.get("id", "") or "").strip()
        if not bid:
            self._json(400, {"message": "缺少搭子 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                existing = conn.execute("SELECT * FROM buddies WHERE id = ?", (bid,)).fetchone()
                if not existing:
                    self._json(404, {"message": "未找到该限时搭子"})
                    return

                title = str(data.get("title", existing["title"]) or "").strip()[:40]
                location = str(data.get("location", existing["location"]) or "").strip()[:50]
                if not title or not location:
                    self._json(400, {"message": "活动名称和集合点不能为空"})
                    return

                category = str(data.get("category", existing["category"]) or existing["category"]).strip()
                if category not in VALID_BUDDY_CATEGORIES:
                    category = existing["category"]
                try:
                    duration = max(10, min(180, int(data.get("durationMinutes", existing["duration_minutes"]))))
                except Exception:
                    duration = int(existing["duration_minutes"])
                try:
                    max_people = max(2, min(12, int(data.get("maxPeople", existing["max_people"]))))
                except Exception:
                    max_people = int(existing["max_people"])

                host_alias = (
                    str(data.get("hostAlias", existing["host_alias"]) or "").strip()[:24]
                    or existing["host_alias"]
                )
                cipher = (
                    str(data.get("cipher", existing["cipher"]) or "").strip()[:40]
                    or existing["cipher"]
                )
                vibe_note = str(data.get("vibeNote", existing["vibe_note"]) or "").strip()[:140]
                boundary_tag = (
                    str(data.get("boundaryTag", existing["boundary_tag"]) or "").strip()[:40]
                    or existing["boundary_tag"]
                )
                is_silent = 1 if data.get("isSilent", bool(existing["is_silent"])) else 0

                expires_at = int(existing["expires_at"])
                if data.get("resetCountdown"):
                    expires_at = int(time.time() * 1000) + duration * 60 * 1000

                conn.execute(
                    """
                    UPDATE buddies
                    SET title = ?, category = ?, location = ?, duration_minutes = ?, expires_at = ?,
                        max_people = ?, host_alias = ?, cipher = ?, vibe_note = ?, boundary_tag = ?,
                        is_silent = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        title,
                        category,
                        location,
                        duration,
                        expires_at,
                        max_people,
                        host_alias,
                        cipher,
                        vibe_note,
                        boundary_tag,
                        is_silent,
                        now_iso(),
                        bid,
                    ),
                )
                conn.commit()
                buddies = self._load_all_buddies(conn, admin_row["uid"], refresh_if_all_expired=False)
                updated = next((b for b in buddies if b["id"] == bid), None)
                self._json(200, {"ok": True, "buddy": updated, "buddies": buddies})
            finally:
                conn.close()

    def _handle_delete_buddy(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        bid = str(data.get("id", "") or "").strip()
        if not bid:
            self._json(400, {"message": "缺少搭子 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                conn.execute("DELETE FROM buddy_messages WHERE buddy_id = ?", (bid,))
                cur = conn.execute("DELETE FROM buddies WHERE id = ?", (bid,))
                conn.commit()
                if cur.rowcount == 0:
                    self._json(404, {"message": "未找到该限时搭子"})
                    return
                buddies = self._load_all_buddies(conn, admin_row["uid"], refresh_if_all_expired=False)
                self._json(200, {"ok": True, "buddies": buddies})
            finally:
                conn.close()

    def _handle_create_buddy_message(self, data: dict) -> None:
        user_row = self._require_user()
        if not user_row:
            return
        bid = str(data.get("buddyId", "") or "").strip()
        text = str(data.get("text", "") or "").strip()[:160]
        if not bid or not text:
            self._json(400, {"message": "消息内容不能为空"})
            return
        mid = f"qm-{int(time.time() * 1000)}-{secrets.token_hex(2)}"
        with db_lock:
            conn = get_db()
            try:
                if not conn.execute("SELECT 1 FROM buddies WHERE id = ?", (bid,)).fetchone():
                    self._json(404, {"message": "目标搭子不存在"})
                    return
                conn.execute(
                    """
                    INSERT INTO buddy_messages (id, buddy_id, sender_uid, sender, text, time_label, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        mid,
                        bid,
                        user_row["uid"],
                        user_row["nickname"] or "五合同学",
                        text,
                        format_short_time(),
                        now_iso(),
                    ),
                )
                conn.commit()
                buddies = self._load_all_buddies(conn, user_row["uid"], refresh_if_all_expired=False)
                self._json(200, {"ok": True, "buddies": buddies})
            finally:
                conn.close()

    def _handle_update_buddy_message(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        mid = str(data.get("id", "") or "").strip()
        text = str(data.get("text", "") or "").strip()[:160]
        if not mid or not text:
            self._json(400, {"message": "消息内容不能为空"})
            return
        with db_lock:
            conn = get_db()
            try:
                existing = conn.execute(
                    "SELECT * FROM buddy_messages WHERE id = ?", (mid,)
                ).fetchone()
                if not existing:
                    self._json(404, {"message": "未找到该频道消息"})
                    return
                sender = (
                    str(data.get("sender", existing["sender"]) or "").strip()[:24]
                    or existing["sender"]
                )
                conn.execute(
                    "UPDATE buddy_messages SET text = ?, sender = ? WHERE id = ?",
                    (text, sender, mid),
                )
                conn.commit()
                buddies = self._load_all_buddies(conn, admin_row["uid"], refresh_if_all_expired=False)
                self._json(200, {"ok": True, "buddies": buddies})
            finally:
                conn.close()

    def _handle_delete_buddy_message(self, data: dict) -> None:
        admin_row = self._require_admin()
        if not admin_row:
            return
        mid = str(data.get("id", "") or "").strip()
        if not mid:
            self._json(400, {"message": "缺少消息 ID"})
            return
        with db_lock:
            conn = get_db()
            try:
                cur = conn.execute("DELETE FROM buddy_messages WHERE id = ?", (mid,))
                conn.commit()
                if cur.rowcount == 0:
                    self._json(404, {"message": "未找到该频道消息"})
                    return
                buddies = self._load_all_buddies(conn, admin_row["uid"], refresh_if_all_expired=False)
                self._json(200, {"ok": True, "buddies": buddies})
            finally:
                conn.close()


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AuthHandler)
    print(f"Campus Pause API v2 listening on http://{HOST}:{PORT}", flush=True)
    server.serve_forever()

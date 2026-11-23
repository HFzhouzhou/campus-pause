#!/usr/bin/env python3
"""
校园暂停键 (Campus Pause) 轻量独立认证与邮箱验证码微服务
- 零第三方依赖（仅 Python 3 标准库 + SQLite3）
- 仅监听 127.0.0.1:3088，由 Nginx 反代 /campus-pause-api/
- 已预留微信小程序 wx.login (jscode2session) 与微信头像昵称同步接口
"""

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
PUBLIC_API_BASE = os.environ.get("PUBLIC_API_BASE", "https://pause.jingshutech.top/campus-pause-api")

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.163.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "校园暂停键 Campus Pause")

# 预留：后续接入微信小程序一键登录时在 /etc/campus-pause/api.env 中配置
WECHAT_APPID = os.environ.get("WECHAT_APPID", "")
WECHAT_SECRET = os.environ.get("WECHAT_SECRET", "")

DEFAULT_SCHOOL = "广西外国语学院（五合校区）"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
OTP_TTL_SECONDS = 5 * 60
SEND_COOLDOWN_SECONDS = 55
MAX_HOURLY_PER_EMAIL = 8

PRESET_AVATARS = [
    "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Luna&backgroundColor=e0f2fe",
    "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Milo&backgroundColor=dcfce7",
    "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Sora&backgroundColor=f3e8ff",
    "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Yuki&backgroundColor=fef3c7",
    "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Leo&backgroundColor=ffe4e6",
]

db_lock = threading.Lock()


def get_db() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db_lock:
        conn = get_db()
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    uid TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    nickname TEXT NOT NULL,
                    avatar_url TEXT NOT NULL,
                    auth_provider TEXT NOT NULL DEFAULT 'email',
                    wx_openid TEXT UNIQUE,
                    wx_unionid TEXT,
                    school_name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
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
                """
            )
            conn.commit()
        finally:
            conn.close()


def row_to_user(row: sqlite3.Row) -> dict:
    return {
        "uid": row["uid"],
        "email": row["email"] or None,
        "nickname": row["nickname"],
        "avatarUrl": row["avatar_url"],
        "authProvider": row["auth_provider"],
        "wxOpenId": row["wx_openid"] or None,
        "wxUnionId": row["wx_unionid"] or None,
        "schoolName": row["school_name"],
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


class AuthHandler(BaseHTTPRequestHandler):
    server_version = "CampusPauseAuth/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {self.address_string()} {fmt % args}", flush=True)

    def _send_cors(self) -> None:
        origin = self.headers.get("Origin", "*")
        self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
        if length <= 0 or length > 2 * 1024 * 1024:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
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
                return row
            finally:
                conn.close()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_HEAD(self) -> None:
        self._serve_get(head_only=True)

    def do_GET(self) -> None:
        self._serve_get(head_only=False)

    def _serve_get(self, head_only: bool = False) -> None:
        path = urllib.parse.urlparse(self.path).path.rstrip("/") or "/"
        if path == "/health":
            if head_only:
                self.send_response(200)
                self._send_cors()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                return
            self._json(200, {"ok": True, "service": "campus-pause-auth"})
            return
        if path == "/auth/me":
            user_row = self._get_auth_user()
            if not user_row:
                self._json(401, {"message": "登录已过期，请重新登录"})
                return
            self._json(200, {"user": row_to_user(user_row)})
            return
        if path.startswith("/avatars/"):
            fname = os.path.basename(path[len("/avatars/"):])
            if not re.match(r"^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$", fname):
                self._json(404, {"message": "Not Found"})
                return
            fpath = os.path.join(AVATAR_DIR, fname)
            if not os.path.isfile(fpath):
                self._json(404, {"message": "Avatar Not Found"})
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
            return
        self._json(404, {"message": "Not Found"})

    def do_POST(self) -> None:
        path = urllib.parse.urlparse(self.path).path.rstrip("/") or "/"
        data = self._read_json()

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

        self._json(404, {"message": "Not Found"})

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

                # 标记验证码已使用
                conn.execute("UPDATE email_otps SET used = 1 WHERE id = ?", (otp["id"],))

                user_row = conn.execute(
                    "SELECT * FROM users WHERE email = ?", (email,)
                ).fetchone()

                iso_now = datetime.now(timezone.utc).isoformat()
                if not user_row:
                    uid = "u_" + secrets.token_hex(6)
                    prefix = email.split("@")[0][:12]
                    avatar = PRESET_AVATARS[sum(ord(c) for c in email) % len(PRESET_AVATARS)]
                    nickname = nickname_input or prefix
                    conn.execute(
                        """
                        INSERT INTO users (uid, email, nickname, avatar_url, auth_provider, school_name, created_at, updated_at)
                        VALUES (?, ?, ?, ?, 'email', ?, ?, ?)
                        """,
                        (uid, email, nickname, avatar, DEFAULT_SCHOOL, iso_now, iso_now),
                    )
                    user_row = conn.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
                elif nickname_input:
                    conn.execute(
                        "UPDATE users SET nickname = ?, updated_at = ? WHERE uid = ?",
                        (nickname_input, iso_now, user_row["uid"]),
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
        user_row = self._get_auth_user()
        if not user_row:
            self._json(401, {"message": "请先登录"})
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

        iso_now = datetime.now(timezone.utc).isoformat()
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
        """接收小程序 chooseAvatar 选择的本地临时头像 base64，持久化存储并返回永久 HTTPS 头像链接"""
        raw_b64 = str(data.get("base64", "") or "").strip()
        if not raw_b64:
            self._json(400, {"message": "缺少头像数据"})
            return
        if "," in raw_b64 and raw_b64.startswith("data:"):
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(raw_b64, validate=True)
        except Exception:
            self._json(400, {"message": "头像数据格式无效"})
            return
        if len(img_bytes) < 64 or len(img_bytes) > 1_500_000:
            self._json(400, {"message": "头像文件大小需小于 1.5MB"})
            return

        ext = "jpg"
        if img_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            ext = "png"
        elif img_bytes[:4] == b"RIFF" and img_bytes[8:12] == b"WEBP":
            ext = "webp"
        elif img_bytes[:2] == b"\xff\xd8":
            ext = "jpg"
        else:
            self._json(400, {"message": "仅支持 JPG / PNG / WebP 图片"})
            return

        os.makedirs(AVATAR_DIR, exist_ok=True)
        fname = f"av_{int(time.time())}_{secrets.token_hex(6)}.{ext}"
        with open(os.path.join(AVATAR_DIR, fname), "wb") as fp:
            fp.write(img_bytes)

        avatar_url = f"{PUBLIC_API_BASE.rstrip('/')}/avatars/{fname}"

        # 若携带了有效登录 token，顺手直接更新数据库里的头像字段
        user_row = self._get_auth_user()
        if user_row:
            iso_now = datetime.now(timezone.utc).isoformat()
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

    def _handle_wechat_login(self, data: dict) -> None:
        """微信小程序 wx.login(code) + 头像昵称直接授权落库接口"""
        wx_code = str(data.get("wxCode", "")).strip()
        nick_name = str(data.get("nickName", "") or "").strip()[:20]
        avatar_url = str(data.get("avatarUrl", "") or "").strip()
        if avatar_url.startswith("wxfile://") or avatar_url.startswith("http://tmp/"):
            avatar_url = ""

        if not WECHAT_APPID or not WECHAT_SECRET:
            self._json(
                501,
                {"message": "微信小程序登录接口已预留，配置 WECHAT_APPID 和 WECHAT_SECRET 后即可启用"},
            )
            return
        if not wx_code:
            self._json(400, {"message": "缺少 wxCode 参数"})
            return

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
            self._json(502, {"message": "请求微信授权服务失败"})
            return

        openid = wx_res.get("openid")
        unionid = wx_res.get("unionid")
        if not openid:
            self._json(400, {"message": wx_res.get("errmsg", "微信登录凭证无效")})
            return

        now = int(time.time())
        iso_now = datetime.now(timezone.utc).isoformat()
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
                        INSERT INTO users (uid, nickname, avatar_url, auth_provider, wx_openid, wx_unionid, school_name, created_at, updated_at)
                        VALUES (?, ?, ?, 'wechat_miniprogram', ?, ?, ?, ?, ?)
                        """,
                        (uid, nickname, avatar, openid, unionid, DEFAULT_SCHOOL, iso_now, iso_now),
                    )
                    user_row = conn.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
                elif nick_name or avatar_url:
                    conn.execute(
                        "UPDATE users SET nickname = ?, avatar_url = ?, updated_at = ? WHERE uid = ?",
                        (
                            nick_name or user_row["nickname"],
                            avatar_url or user_row["avatar_url"],
                            iso_now,
                            user_row["uid"],
                        ),
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


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AuthHandler)
    print(f"Campus Pause Auth API listening on http://{HOST}:{PORT}", flush=True)
    server.serve_forever()

import { UserProfile, WeChatProfilePayload } from '../types';
import { readStorage, writeStorage } from './storage';
import { CAMPUS_INFO } from '../utils/geo';

const USER_KEY = 'auth_user_profile';
const TOKEN_KEY = 'auth_session_token';
const OTP_KEY = 'auth_pending_otp';

interface StoredOtp {
  email: string;
  code: string;
  expiresAt: number;
}

export const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Luna&backgroundColor=e0f2fe',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Milo&backgroundColor=dcfce7',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Sora&backgroundColor=f3e8ff',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Yuki&backgroundColor=fef3c7',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Leo&backgroundColor=ffe4e6',
];

function getAuthApiBase(): string {
  const configured = (import.meta.env.VITE_AUTH_API_BASE || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  // 线上部署在 https://8.148.11.126/campus-pause/ 时默认自动走同源 /campus-pause-api
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/campus-pause')
  ) {
    return '/campus-pause-api';
  }
  return '';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isRealEmailBackendConfigured(): boolean {
  return Boolean(getAuthApiBase());
}

export const authService = {
  getCurrentUser(): UserProfile | null {
    return readStorage<UserProfile | null>(USER_KEY, null);
  },

  getToken(): string | null {
    return readStorage<string | null>(TOKEN_KEY, null);
  },

  /**
   * 发送邮箱 6 位验证码（真实 163 SMTP 发信接口优先）
   */
  async sendEmailCode(
    rawEmail: string
  ): Promise<{ mode: 'api' | 'demo'; demoCode?: string }> {
    const email = rawEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new Error('请输入正确的邮箱地址');
    }

    const apiBase = getAuthApiBase();
    if (apiBase) {
      const res = await fetch(`${apiBase}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || '验证码发送失败，请稍后重试');
      }
      return { mode: 'api' };
    }

    // 未配置后端时的体验模式兜底
    await new Promise((r) => setTimeout(r, 450));
    const code = String(Math.floor(100000 + Math.random() * 900000));
    writeStorage<StoredOtp>(OTP_KEY, {
      email,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return { mode: 'demo', demoCode: code };
  },

  /**
   * 校验邮箱 6 位验证码并完成登录/注册
   */
  async verifyEmailAndLogin(
    rawEmail: string,
    rawCode: string,
    optionalNickname?: string
  ): Promise<UserProfile> {
    const email = rawEmail.trim().toLowerCase();
    const code = rawCode.trim();
    if (!isValidEmail(email)) {
      throw new Error('邮箱格式不正确');
    }
    if (!/^\d{6}$/.test(code)) {
      throw new Error('请输入 6 位数字验证码');
    }

    const apiBase = getAuthApiBase();
    if (apiBase) {
      const res = await fetch(`${apiBase}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, nickname: optionalNickname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || '验证码无效或已过期');
      }
      if (data.token) {
        writeStorage(TOKEN_KEY, data.token);
      }
      writeStorage(USER_KEY, data.user);
      return data.user as UserProfile;
    }

    // 体验模式本地核验
    await new Promise((r) => setTimeout(r, 380));
    const pending = readStorage<StoredOtp | null>(OTP_KEY, null);
    if (!pending || pending.email !== email) {
      throw new Error('请先获取该邮箱的验证码');
    }
    if (Date.now() > pending.expiresAt) {
      throw new Error('验证码已过期，请重新发送');
    }
    if (pending.code !== code) {
      throw new Error('验证码不正确，请检查后再试');
    }

    const prefix = email.split('@')[0].slice(0, 12);
    const avatarIndex =
      email.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
      PRESET_AVATARS.length;

    const user: UserProfile = {
      uid: `u_${Date.now().toString(36)}`,
      email,
      nickname: optionalNickname?.trim() || `${prefix}`,
      avatarUrl: PRESET_AVATARS[avatarIndex],
      authProvider: 'email',
      schoolName: CAMPUS_INFO.name,
      createdAt: new Date().toISOString(),
    };
    writeStorage(USER_KEY, user);
    return user;
  },

  /**
   * 更新昵称或头像（同步至本地与后端 SQLite，也供微信小程序头像昵称授权落库）
   */
  updateProfile(
    patch: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl' | 'schoolName'>>
  ): UserProfile | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated: UserProfile = {
      ...current,
      nickname: patch.nickname?.trim() || current.nickname,
      avatarUrl: patch.avatarUrl || current.avatarUrl,
      schoolName: patch.schoolName || current.schoolName,
    };
    writeStorage(USER_KEY, updated);

    const apiBase = getAuthApiBase();
    const token = this.getToken();
    if (apiBase && token) {
      fetch(`${apiBase}/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: updated.nickname,
          avatarUrl: updated.avatarUrl,
          schoolName: updated.schoolName,
        }),
      }).catch(() => {});
    }

    return updated;
  },

  /**
   * 【预留接口】微信小程序一键登录 (wx.login -> POST /auth/wechat-miniprogram)
   */
  async loginWithWeChatMiniProgram(
    payload: WeChatProfilePayload
  ): Promise<UserProfile> {
    const apiBase = getAuthApiBase();
    if (apiBase && payload.wxCode) {
      const res = await fetch(`${apiBase}/auth/wechat-miniprogram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || '微信授权登录失败');
      }
      if (data.token) writeStorage(TOKEN_KEY, data.token);
      writeStorage(USER_KEY, data.user);
      return data.user as UserProfile;
    }

    throw new Error('当前为 Web 浏览器环境，请在微信小程序内使用微信一键登录');
  },

  /**
   * 【预留接口】微信小程序头像昵称授权同步
   */
  syncWeChatProfile(
    payload: Pick<WeChatProfilePayload, 'nickName' | 'avatarUrl'>
  ): UserProfile | null {
    return this.updateProfile({
      nickname: payload.nickName,
      avatarUrl: payload.avatarUrl,
    });
  },

  logout(): void {
    try {
      window.localStorage.removeItem('campus_pause_gxufl_v2_' + USER_KEY);
      window.localStorage.removeItem('campus_pause_gxufl_v2_' + TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

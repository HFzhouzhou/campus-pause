import { UserProfile, WeChatProfilePayload } from '../types';
import { readStorage, writeStorage } from './storage';
import { CAMPUS_INFO } from '../utils/geo';

const USER_KEY = 'auth_user_profile';
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
  return (import.meta.env.VITE_AUTH_API_BASE || '').trim().replace(/\/$/, '');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isRealEmailBackendConfigured(): boolean {
  return Boolean(getAuthApiBase());
}

export const authService = {
  /** 获取当前登录用户（未登录返回 null，支持游客先浏览） */
  getCurrentUser(): UserProfile | null {
    return readStorage<UserProfile | null>(USER_KEY, null);
  },

  /**
   * 发送邮箱 6 位验证码
   * - 配置了 VITE_AUTH_API_BASE 时：调用真实后端 POST /auth/send-code 触发 SMTP 真实发信
   * - 未配置后端发信服务时：自动降级为前端体验验证码模式，返回 demoCode 供立即测试完整流程
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '验证码发送失败，请稍后重试');
      }
      return { mode: 'api' };
    }

    // 体验模式：生成 6 位数字验证码并设置 5 分钟有效期
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
   * 校验邮箱验证码并完成注册/登录（未注册自动注册，已注册直接登录）
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '验证码无效或已过期');
      }
      const data = (await res.json()) as { user: UserProfile };
      writeStorage(USER_KEY, data.user);
      return data.user;
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
   * 更新用户昵称或头像（Web 端个人资料修改 & 微信小程序头像昵称授权通用落库入口）
   */
  updateProfile(patch: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl' | 'schoolName'>>): UserProfile | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated: UserProfile = {
      ...current,
      nickname: patch.nickname?.trim() || current.nickname,
      avatarUrl: patch.avatarUrl || current.avatarUrl,
      schoolName: patch.schoolName || current.schoolName,
    };
    writeStorage(USER_KEY, updated);
    return updated;
  },

  /**
   * 【预留接口】微信小程序一键登录（供后续迁移至微信小程序时对接）
   * 调用流程：
   * 1) 小程序端调用 wx.login() 获取临时登录凭证 code
   * 2) 将 code 传给后端 POST /auth/wechat-miniprogram，后端调微信 jscode2session 换取 openid / unionid
   * 3) 返回标准 UserProfile 并持久化登录态
   */
  async loginWithWeChatMiniProgram(payload: WeChatProfilePayload): Promise<UserProfile> {
    const apiBase = getAuthApiBase();
    if (apiBase && payload.wxCode) {
      const res = await fetch(`${apiBase}/auth/wechat-miniprogram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('微信授权登录失败');
      }
      const data = (await res.json()) as { user: UserProfile };
      writeStorage(USER_KEY, data.user);
      return data.user;
    }

    throw new Error('当前为 Web 浏览器环境，请在微信小程序内使用微信一键登录');
  },

  /**
   * 【预留接口】同步微信授权头像与昵称
   * 小程序端通过 <button open-type="chooseAvatar" bindchooseavatar> 和 <input type="nickname">
   * 获取到的临时头像/昵称上传至云存储后，直接调用本方法写入当前用户资料。
   */
  syncWeChatProfile(payload: Pick<WeChatProfilePayload, 'nickName' | 'avatarUrl'>): UserProfile | null {
    return this.updateProfile({
      nickname: payload.nickName,
      avatarUrl: payload.avatarUrl,
    });
  },

  logout(): void {
    try {
      window.localStorage.removeItem('campus_pause_gxufl_v2_' + USER_KEY);
    } catch {
      // ignore
    }
  },
};

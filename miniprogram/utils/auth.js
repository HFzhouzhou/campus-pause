const { requestApi } = require('./api');

const USER_KEY = 'cp_mp_user_v2';
const TOKEN_KEY = 'cp_mp_token_v2';
const SUPER_ADMIN_EMAIL = 'm7736097132@163.com';

// 5 款本地高清 PNG 浅色柔和头像（零外链失效风险，秒加载）
const PRESET_AVATARS = [
  '/assets/avatars/avatar-1.png',
  '/assets/avatars/avatar-2.png',
  '/assets/avatars/avatar-3.png',
  '/assets/avatars/avatar-4.png',
  '/assets/avatars/avatar-5.png',
];

let _lastRefreshAt = 0;

function sanitizeAvatar(url, seedStr = '') {
  if (!url) return PRESET_AVATARS[0];
  if (url.includes('dicebear.com') || url.endsWith('.svg')) {
    const str = String(seedStr || url);
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash + str.charCodeAt(i)) % PRESET_AVATARS.length;
    }
    return PRESET_AVATARS[hash];
  }
  return url;
}

function getUserRole(user) {
  if (!user) return 'user';
  const email = String(user.email || '').trim().toLowerCase();
  if (email && email === SUPER_ADMIN_EMAIL) return 'super_admin';
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'super_admin' || role === 'admin') return role;
  return 'user';
}

function isSuperAdmin(user) {
  return getUserRole(user) === 'super_admin';
}

function isAdmin(user) {
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'admin';
}

function getRoleLabel(user) {
  const role = getUserRole(user);
  if (role === 'super_admin') return '超级管理员';
  if (role === 'admin') return '管理员';
  return '普通用户';
}

function getShortRoleBadge(user) {
  const role = getUserRole(user);
  if (role === 'super_admin') return '超管';
  if (role === 'admin') return '管理';
  return '';
}

function normalizeUser(user) {
  if (!user) return null;
  const role = getUserRole(user);
  const wxBound =
    typeof user.wxBound === 'boolean'
      ? user.wxBound
      : Boolean(user.wxOpenId || user.authProvider === 'wechat_miniprogram');
  return {
    ...user,
    role,
    isAdmin: role === 'super_admin' || role === 'admin',
    isSuperAdmin: role === 'super_admin',
    wxBound,
    emailBound: Boolean(user.email),
    roleLabel: role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : '普通用户',
    shortRoleBadge: role === 'super_admin' ? '超管' : role === 'admin' ? '管理' : '',
    avatarUrl: sanitizeAvatar(user.avatarUrl, user.uid || user.email || user.nickname),
  };
}

function getCurrentUser() {
  try {
    return normalizeUser(wx.getStorageSync(USER_KEY) || null);
  } catch (e) {
    return null;
  }
}

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

function saveSession(user, token) {
  const clean = normalizeUser(user);
  if (clean) {
    wx.setStorageSync(USER_KEY, clean);
    const app = getApp();
    if (app && app.globalData) app.globalData.user = clean;
  }
  if (token) {
    wx.setStorageSync(TOKEN_KEY, token);
  }
  return clean;
}

function logout() {
  wx.removeStorageSync(USER_KEY);
  wx.removeStorageSync(TOKEN_KEY);
  _lastRefreshAt = 0;
  const app = getApp();
  if (app && app.globalData) app.globalData.user = null;
}

/** 从服务器同步最新用户信息、角色权限与微信/邮箱绑定状态 */
async function refreshCurrentUser(force = false) {
  const cached = getCurrentUser();
  const token = getToken();
  if (!token) return cached;

  const now = Date.now();
  if (!force && now - _lastRefreshAt < 8000) {
    return cached;
  }
  _lastRefreshAt = now;

  try {
    const res = await requestApi('/auth/me', 'GET', {}, token);
    if (res && res.user) {
      return saveSession(res.user, '');
    }
  } catch (e) {
    // 保留本地缓存，避免弱网闪退
  }
  return cached;
}

function uploadLocalAvatar(tempFilePath) {
  return new Promise((resolve) => {
    if (
      !tempFilePath ||
      tempFilePath.startsWith('/assets/') ||
      tempFilePath.startsWith('https://')
    ) {
      resolve(tempFilePath || PRESET_AVATARS[0]);
      return;
    }
    try {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        async success(res) {
          try {
            const uploaded = await requestApi(
              '/auth/upload-avatar',
              'POST',
              { base64: res.data },
              getToken()
            );
            resolve((uploaded && uploaded.avatarUrl) || tempFilePath);
          } catch (e) {
            resolve(tempFilePath);
          }
        },
        fail() {
          resolve(tempFilePath);
        },
      });
    } catch (e) {
      resolve(tempFilePath);
    }
  });
}

/** 1. 发送真实 163 邮箱 6 位验证码 */
function sendEmailCode(email) {
  return requestApi('/auth/send-code', 'POST', { email });
}

/** 2. 校验邮箱验证码并登录/注册 */
async function verifyEmailAndLogin(email, code, nickname = '') {
  const res = await requestApi('/auth/verify-email', 'POST', {
    email,
    code,
    nickname,
  });
  _lastRefreshAt = Date.now();
  return saveSession(res.user, res.token);
}

/** 3. 微信小程序一键登录 */
function loginWithWeChat({ nickName = '', avatarUrl = '' } = {}) {
  return new Promise((resolve, reject) => {
    wx.login({
      async success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('获取微信登录凭证失败'));
          return;
        }
        try {
          let finalAvatar = avatarUrl;
          if (
            finalAvatar &&
            !finalAvatar.startsWith('/assets/') &&
            !finalAvatar.startsWith('https://')
          ) {
            finalAvatar = await uploadLocalAvatar(finalAvatar);
          }
          const res = await requestApi('/auth/wechat-miniprogram', 'POST', {
            wxCode: loginRes.code,
            nickName,
            avatarUrl: finalAvatar,
          });
          _lastRefreshAt = Date.now();
          const saved = saveSession(res.user, res.token);
          resolve({
            user: saved,
            isNewUser: Boolean(res.isNewUser),
            needsProfile: Boolean(res.needsProfile),
          });
        } catch (err) {
          reject(err);
        }
      },
      fail() {
        reject(new Error('调用 wx.login 失败'));
      },
    });
  });
}

/** 4. 已登录账号（如邮箱超级管理员/管理员）一键绑定当前微信 */
function bindWeChat() {
  return new Promise((resolve, reject) => {
    const token = getToken();
    if (!token) {
      reject(new Error('请先登录后再绑定微信'));
      return;
    }
    wx.login({
      async success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('获取微信凭证失败，请重试'));
          return;
        }
        try {
          const res = await requestApi(
            '/auth/bind-wechat',
            'POST',
            { wxCode: loginRes.code },
            token
          );
          _lastRefreshAt = Date.now();
          const saved = saveSession(res.user, '');
          resolve({
            user: saved,
            merged: Boolean(res.merged),
            message: res.message || '微信账号绑定成功 ✨',
          });
        } catch (err) {
          if (err && err.statusCode === 404) {
            reject(new Error('服务端尚未部署最新绑定接口，请先更新并重启 server/auth_api.py'));
            return;
          }
          reject(err);
        }
      },
      fail() {
        reject(new Error('调用 wx.login 失败，请在微信小程序环境中重试'));
      },
    });
  });
}

/** 5. 解除当前账号的微信绑定（需已绑定邮箱） */
async function unbindWeChat() {
  const token = getToken();
  if (!token) throw new Error('请先登录');
  try {
    const res = await requestApi('/auth/unbind-wechat', 'POST', {}, token);
    _lastRefreshAt = Date.now();
    const saved = saveSession(res.user, '');
    return { user: saved, message: res.message || '已解除微信绑定' };
  } catch (err) {
    if (err && err.statusCode === 404) {
      throw new Error('服务端尚未部署最新绑定接口，请先更新并重启 server/auth_api.py');
    }
    throw err;
  }
}

/** 6. 微信登录用户绑定邮箱账号（绑定超管/管理员邮箱将自动合并并继承权限） */
async function bindEmail(email, code) {
  const token = getToken();
  if (!token) throw new Error('请先登录');
  try {
    const res = await requestApi(
      '/auth/bind-email',
      'POST',
      { email: String(email || '').trim().toLowerCase(), code: String(code || '').trim() },
      token
    );
    _lastRefreshAt = Date.now();
    const saved = saveSession(res.user, '');
    return {
      user: saved,
      merged: Boolean(res.merged),
      message: res.message || '邮箱绑定成功 ✨',
    };
  } catch (err) {
    if (err && err.statusCode === 404) {
      throw new Error('服务端尚未部署最新绑定接口，请先更新并重启 server/auth_api.py');
    }
    throw err;
  }
}

/** 7. 更新个人昵称与头像 */
async function updateProfile({ nickname, avatarUrl, schoolName }) {
  const current = getCurrentUser();
  if (!current) return null;

  let finalAvatar = avatarUrl || current.avatarUrl;
  if (
    finalAvatar &&
    !finalAvatar.startsWith('/assets/') &&
    !finalAvatar.startsWith('https://')
  ) {
    finalAvatar = await uploadLocalAvatar(finalAvatar);
  }

  const updated = saveSession(
    {
      ...current,
      nickname: (nickname || current.nickname || '').trim(),
      avatarUrl: finalAvatar,
      schoolName: schoolName || current.schoolName,
    },
    ''
  );

  const token = getToken();
  if (token) {
    try {
      const res = await requestApi(
        '/auth/profile',
        'POST',
        {
          nickname: updated.nickname,
          avatarUrl: updated.avatarUrl,
          schoolName: updated.schoolName,
        },
        token
      );
      if (res && res.user) {
        return saveSession(res.user, '');
      }
    } catch (e) {
      // 保留本地更新
    }
  }
  return updated;
}

module.exports = {
  SUPER_ADMIN_EMAIL,
  PRESET_AVATARS,
  getUserRole,
  isSuperAdmin,
  isAdmin,
  getRoleLabel,
  getShortRoleBadge,
  normalizeUser,
  getCurrentUser,
  getToken,
  saveSession,
  logout,
  refreshCurrentUser,
  uploadLocalAvatar,
  sendEmailCode,
  verifyEmailAndLogin,
  loginWithWeChat,
  bindWeChat,
  unbindWeChat,
  bindEmail,
  updateProfile,
};

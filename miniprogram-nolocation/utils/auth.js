const { requestApi } = require('./api');

const USER_KEY = 'cp_mp_user_v2';
const TOKEN_KEY = 'cp_mp_token_v2';

// 5 款本地高清 PNG 浅色柔和头像（零外链失效风险，秒加载）
const PRESET_AVATARS = [
  '/assets/avatars/avatar-1.png',
  '/assets/avatars/avatar-2.png',
  '/assets/avatars/avatar-3.png',
  '/assets/avatars/avatar-4.png',
  '/assets/avatars/avatar-5.png',
];

function sanitizeAvatar(url, seedStr = '') {
  if (!url) return PRESET_AVATARS[0];
  // 替换早期无法在小程序可靠加载的外部 SVG 头像链接，按 uid 稳定分配 5 款本地浅色头像
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

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
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
  const app = getApp();
  if (app && app.globalData) app.globalData.user = null;
}

/**
 * 将微信 chooseAvatar 返回的临时本地头像上传到服务器持久化，换取永久 HTTPS 链接
 */
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
  return saveSession(res.user, res.token);
}

/**
 * 3. 微信小程序一键登录 (wx.login -> POST /auth/wechat-miniprogram)
 * 返回 { user, isNewUser, needsProfile }
 * - 老用户：直接带回已保存的真实微信头像与昵称完成登录
 * - 新用户：引导至同弹窗 Step 2（1 键点微信头像 + 1 键填微信昵称，自动持久化上传服务器）
 */
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
          if (finalAvatar && !finalAvatar.startsWith('/assets/') && !finalAvatar.startsWith('https://')) {
            finalAvatar = await uploadLocalAvatar(finalAvatar);
          }
          const res = await requestApi('/auth/wechat-miniprogram', 'POST', {
            wxCode: loginRes.code,
            nickName,
            avatarUrl: finalAvatar,
          });
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

/** 4. 更新个人昵称与头像（若为微信临时头像则自动上传服务器持久化） */
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
  PRESET_AVATARS,
  getCurrentUser,
  getToken,
  saveSession,
  logout,
  uploadLocalAvatar,
  sendEmailCode,
  verifyEmailAndLogin,
  loginWithWeChat,
  updateProfile,
};

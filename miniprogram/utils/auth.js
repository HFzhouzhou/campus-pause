const { requestApi } = require('./api');

const USER_KEY = 'cp_mp_user_v1';
const TOKEN_KEY = 'cp_mp_token_v1';

const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Luna&backgroundColor=e0f2fe',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Milo&backgroundColor=dcfce7',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Sora&backgroundColor=f3e8ff',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Yuki&backgroundColor=fef3c7',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Leo&backgroundColor=ffe4e6',
];

function getCurrentUser() {
  try {
    return wx.getStorageSync(USER_KEY) || null;
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
  if (user) {
    wx.setStorageSync(USER_KEY, user);
    const app = getApp();
    if (app && app.globalData) app.globalData.user = user;
  }
  if (token) {
    wx.setStorageSync(TOKEN_KEY, token);
  }
}

function logout() {
  wx.removeStorageSync(USER_KEY);
  wx.removeStorageSync(TOKEN_KEY);
  const app = getApp();
  if (app && app.globalData) app.globalData.user = null;
}

/** 1. 发送真实 163 邮箱 6 位验证码（连接线上服务器） */
function sendEmailCode(email) {
  return requestApi('/auth/send-code', 'POST', { email });
}

/** 2. 校验邮箱验证码并完成注册/登录 */
async function verifyEmailAndLogin(email, code, nickname = '') {
  const res = await requestApi('/auth/verify-email', 'POST', {
    email,
    code,
    nickname,
  });
  saveSession(res.user, res.token);
  return res.user;
}

/**
 * 3. 微信小程序一键登录 (wx.login -> POST /auth/wechat-miniprogram)
 * 传入用户通过 <button open-type="chooseAvatar"> 和 <input type="nickname"> 选择的头像昵称
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
          const res = await requestApi('/auth/wechat-miniprogram', 'POST', {
            wxCode: loginRes.code,
            nickName,
            avatarUrl,
          });
          saveSession(res.user, res.token);
          resolve(res.user);
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

/** 4. 更新个人昵称与头像（支持微信头像/昵称直接同步到线上 SQLite 数据库） */
async function updateProfile({ nickname, avatarUrl, schoolName }) {
  const current = getCurrentUser();
  if (!current) return null;
  const updated = {
    ...current,
    nickname: (nickname || current.nickname || '').trim(),
    avatarUrl: avatarUrl || current.avatarUrl,
    schoolName: schoolName || current.schoolName,
  };
  saveSession(updated, '');

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
        saveSession(res.user, '');
        return res.user;
      }
    } catch (e) {
      // 本地保留最新资料
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
  sendEmailCode,
  verifyEmailAndLogin,
  loginWithWeChat,
  updateProfile,
};

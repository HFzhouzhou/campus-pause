const { requestApi, isFallbackableError } = require('./api');
const auth = require('./auth');
const spotsStore = require('./spotsStore');
const ventStore = require('./ventStore');
const buddyStore = require('./buddyStore');

const LOCAL_GRANTS_KEY = 'cp_mp_admin_grants_local_v1';

function readLocalGrants() {
  try {
    const list = wx.getStorageSync(LOCAL_GRANTS_KEY);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveLocalGrants(list) {
  wx.setStorageSync(LOCAL_GRANTS_KEY, list);
  return list;
}

function buildLocalAdminState() {
  const me = auth.getCurrentUser();
  const grants = readLocalGrants();
  const superAdminObj = {
    uid: (me && me.email === auth.SUPER_ADMIN_EMAIL && me.uid) || 'super_admin_default',
    email: auth.SUPER_ADMIN_EMAIL,
    nickname: (me && me.email === auth.SUPER_ADMIN_EMAIL && me.nickname) || '超级管理员',
    avatarUrl:
      (me && me.email === auth.SUPER_ADMIN_EMAIL && me.avatarUrl) || auth.PRESET_AVATARS[0],
    authProvider: 'email',
    role: 'super_admin',
    isAdmin: true,
    isSuperAdmin: true,
    isProtected: true,
  };
  return {
    offlineMode: true,
    superAdminEmails: [auth.SUPER_ADMIN_EMAIL],
    admins: [superAdminObj],
    pendingGrants: grants,
    users: [superAdminObj],
  };
}

async function fetchOverview() {
  const token = auth.getToken();
  try {
    const res = await requestApi('/admin/overview', 'GET', {}, token);
    if (res && res.stats) {
      return { stats: res.stats, offlineMode: false };
    }
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
  }

  const spots = spotsStore.getAll();
  const bubbles = ventStore.getBubbles();
  const buddies = buddyStore.getAll();
  const reviewsCount = spots.reduce((sum, s) => sum + ((s.reviews && s.reviews.length) || 0), 0);
  const messagesCount = buddies.reduce(
    (sum, b) => sum + ((b.quickMessages && b.quickMessages.length) || 0),
    0
  );
  return {
    offlineMode: true,
    stats: {
      spotsCount: spots.length,
      reviewsCount,
      bubblesCount: bubbles.length,
      buddiesCount: buddies.length,
      messagesCount,
      usersCount: 1,
      adminsCount: 1,
      pendingAdminGrantsCount: readLocalGrants().length,
    },
  };
}

async function fetchAdmins(query = '') {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isSuperAdmin(me)) {
    throw new Error('仅超级管理员可查看和管理管理员列表');
  }

  const qParam = query ? `?q=${encodeURIComponent(query.trim())}` : '';
  try {
    const res = await requestApi(`/admin/admins${qParam}`, 'GET', {}, token);
    return {
      offlineMode: false,
      superAdminEmails: res.superAdminEmails || [auth.SUPER_ADMIN_EMAIL],
      admins: (res.admins || []).map((u) => auth.normalizeUser(u)),
      pendingGrants: res.pendingGrants || [],
      users: (res.users || []).map((u) => auth.normalizeUser(u)),
    };
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
    return buildLocalAdminState();
  }
}

async function addAdmin({ email = '', uid = '', note = '' }) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isSuperAdmin(me)) {
    throw new Error('仅超级管理员可新增管理员');
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanNote = String(note || '').trim().slice(0, 40);

  try {
    const res = await requestApi(
      '/admin/admins/add',
      'POST',
      { email: cleanEmail, uid, note: cleanNote },
      token
    );
    return { ...res, offlineMode: false };
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('请输入有效的邮箱地址');
    }
    if (cleanEmail === auth.SUPER_ADMIN_EMAIL) {
      throw new Error('该邮箱已是超级管理员，无需重复添加');
    }
    const list = readLocalGrants().filter((g) => g.email !== cleanEmail);
    const grant = {
      email: cleanEmail,
      note: cleanNote,
      grantedBy: (me && (me.email || me.nickname)) || auth.SUPER_ADMIN_EMAIL,
      createdAt: new Date().toISOString(),
    };
    saveLocalGrants([grant, ...list]);
    return {
      ok: true,
      mode: 'pregranted',
      offlineMode: true,
      message: `已本地预添加 ${cleanEmail}（部署最新后端后同步生效）`,
      grant,
    };
  }
}

async function removeAdmin({ uid = '', email = '' }) {
  const token = auth.getToken();
  const me = auth.getCurrentUser();
  if (!auth.isSuperAdmin(me)) {
    throw new Error('仅超级管理员可撤销管理员权限');
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanEmail === auth.SUPER_ADMIN_EMAIL) {
    throw new Error('不能撤销超级管理员权限');
  }

  try {
    const res = await requestApi(
      '/admin/admins/remove',
      'POST',
      { uid, email: cleanEmail },
      token
    );
    return { ...res, offlineMode: false };
  } catch (err) {
    if (!isFallbackableError(err)) throw err;
    const next = readLocalGrants().filter((g) => g.email !== cleanEmail);
    saveLocalGrants(next);
    return { ok: true, offlineMode: true, message: '已移除管理员授权' };
  }
}

module.exports = {
  fetchOverview,
  fetchAdmins,
  addAdmin,
  removeAdmin,
};

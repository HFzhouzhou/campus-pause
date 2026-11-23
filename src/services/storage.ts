/**
 * 统一本地持久化存储层
 *
 * 【后续迁移至后端 / 微信云开发接口说明】
 * 迁移至微信小程序时，可将以下 localStorage 替换为微信云开发数据库调用，
 * 并结合 .env.local 中预留的 VITE_AMAP_WX_KEY 接入高德微信小程序 SDK (amap-wx.js)：
 *   - 微信云开发: wx.cloud.database().collection('healing_spots').get() / .add() / .doc(id).update()
 *   - REST API:  fetch(`${API_BASE}/api/spots`, { method: 'GET' | 'POST' })
 */

const PREFIX = 'campus_pause_gxufl_v2_';

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('[CampusPause Storage] 写入 localStorage 失败（可能超出配额）:', err);
  }
}

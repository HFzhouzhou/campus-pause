/**
 * 统一本地持久化存储层
 *
 * 【后续迁移至后端 / 微信云开发接口说明】
 * 迁移至微信小程序或独立后端时，只需将各 *Service.ts 中的 readStorage / writeStorage
 * 替换为对应的云数据库调用：
 *   - 微信云开发: wx.cloud.database().collection('healing_spots').get() / .add() / .doc(id).update()
 *   - REST API:  fetch(`${API_BASE}/api/spots`, { method: 'GET' | 'POST' })
 */

const PREFIX = 'campus_pause_v1_';

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

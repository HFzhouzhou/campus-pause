// 广西外国语学院五合校区（广西南宁市青秀区五合大道19号）高德 GCJ-02 实测坐标
export const CAMPUS_INFO = {
  name: '广西外国语学院（五合校区）',
  shortName: '广外·五合校区',
  address: '广西南宁市青秀区五合大道19号',
};

export const CAMPUS_CENTER = {
  lng: 108.515971,
  lat: 22.800697,
};

/** 计算两点经纬度球面距离（米） */
export function calculateDistanceMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatCoord(val: number): string {
  return val.toFixed(5);
}

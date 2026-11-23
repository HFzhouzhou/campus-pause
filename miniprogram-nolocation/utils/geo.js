const CAMPUS_INFO = {
  name: '广西外国语学院（五合校区）',
  shortName: '广外·五合校区',
  address: '广西南宁市青秀区五合大道19号',
};

const CAMPUS_CENTER = {
  longitude: 108.515971,
  latitude: 22.800697,
};

// 免定位接口审核版：校内 6 大快捷地标参考点（一键切区 + 实时测算各治愈点步行距离）
const CAMPUS_LANDMARKS = [
  {
    id: 'center',
    name: '五合校区中心',
    shortName: '校中心',
    desc: '全校治愈点全景视角',
    emoji: '🏫',
    longitude: 108.515971,
    latitude: 22.800697,
    scale: 16.5,
  },
  {
    id: 'library',
    name: '五合图书馆',
    shortName: '图书馆',
    desc: '北侧静区与自习楼附近',
    emoji: '📚',
    longitude: 108.51624,
    latitude: 22.80205,
    scale: 17.5,
  },
  {
    id: 'mingde',
    name: '明德楼教学区',
    shortName: '明德楼',
    desc: '西侧观景连廊与教学楼',
    emoji: '🏛️',
    longitude: 108.51512,
    latitude: 22.80088,
    scale: 17.5,
  },
  {
    id: 'lake',
    name: '化龙池 · 天鹅湖',
    shortName: '天鹅湖',
    desc: '湖畔绿草坪与校猫基地',
    emoji: '🌿',
    longitude: 108.51562,
    latitude: 22.80045,
    scale: 17.5,
  },
  {
    id: 'track',
    name: '田径场 · 致达楼',
    shortName: '田径场',
    desc: '东侧操场看台与观风露台',
    emoji: '🏃',
    longitude: 108.51735,
    latitude: 22.80115,
    scale: 17.5,
  },
  {
    id: 'south_gate',
    name: '五合南门钟楼',
    shortName: '南门钟楼',
    desc: '欧式城堡大门与林荫道',
    emoji: '🏰',
    longitude: 108.51586,
    latitude: 22.79758,
    scale: 17.5,
  },
];

function calculateDistanceMeters(lng1, lat1, lng2, lat2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
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

function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatCoord(val) {
  return Number(val || 0).toFixed(5);
}

module.exports = {
  CAMPUS_INFO,
  CAMPUS_CENTER,
  CAMPUS_LANDMARKS,
  calculateDistanceMeters,
  formatDistance,
  formatCoord,
};

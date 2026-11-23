const CAMPUS_INFO = {
  name: '广西外国语学院（五合校区）',
  shortName: '广外·五合校区',
  address: '广西南宁市青秀区五合大道19号',
};

const CAMPUS_CENTER = {
  longitude: 108.515971,
  latitude: 22.800697,
};

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
  calculateDistanceMeters,
  formatDistance,
  formatCoord,
};

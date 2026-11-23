const { API_BASE, AMAP_WX_KEY } = require('./config');
const { CAMPUS_CENTER } = require('./geo');

function requestApi(path, method = 'GET', data = {}, token = '') {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' };
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header,
      timeout: 15000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data || {});
        } else {
          const msg = (res.data && res.data.message) || `请求失败 (${res.statusCode})`;
          reject(new Error(msg));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络连接失败，请检查网络或合法域名配置'));
      },
    });
  });
}

/**
 * 使用高德小程序 Key (AMAP_WX_KEY) 搜索广西外国语学院五合校区周边建筑
 * 关键参数：platform=WXJS&s=rsx&sdkversion=1.2.0 必须携带，否则高德会返回 USERKEY_PLAT_NOMATCH
 */
function searchCampusPoi(keyword) {
  return new Promise((resolve) => {
    if (!AMAP_WX_KEY || !keyword || !keyword.trim()) {
      resolve([]);
      return;
    }
    wx.request({
      url: 'https://restapi.amap.com/v3/place/around',
      method: 'GET',
      data: {
        key: AMAP_WX_KEY,
        platform: 'WXJS',
        s: 'rsx',
        sdkversion: '1.2.0',
        location: `${CAMPUS_CENTER.longitude},${CAMPUS_CENTER.latitude}`,
        keywords: keyword.trim(),
        radius: 4000,
        offset: 6,
        page: 1,
        extensions: 'base',
      },
      timeout: 8000,
      success(res) {
        const pois = (res.data && res.data.pois) || [];
        const list = pois.map((p) => {
          const [lngStr, latStr] = (p.location || '108.515971,22.800697').split(',');
          return {
            id: p.id || p.name,
            name: p.name,
            address:
              typeof p.address === 'string' && p.address
                ? p.address
                : '广西外国语学院五合校区附近',
            longitude: parseFloat(lngStr),
            latitude: parseFloat(latStr),
          };
        });
        resolve(list);
      },
      fail() {
        resolve([]);
      },
    });
  });
}

/** 使用高德小程序 Key 逆地理编码反查选点建筑名 */
function reverseGeocode(longitude, latitude) {
  return new Promise((resolve) => {
    if (!AMAP_WX_KEY) {
      resolve(null);
      return;
    }
    wx.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      method: 'GET',
      data: {
        key: AMAP_WX_KEY,
        platform: 'WXJS',
        s: 'rsx',
        sdkversion: '1.2.0',
        location: `${longitude},${latitude}`,
        radius: 250,
        extensions: 'all',
      },
      timeout: 8000,
      success(res) {
        const re = res.data && res.data.regeocode;
        if (!re) {
          resolve(null);
          return;
        }
        const poiName = re.pois && re.pois[0] && re.pois[0].name;
        const aoiName = re.aois && re.aois[0] && re.aois[0].name;
        const street =
          re.addressComponent &&
          re.addressComponent.streetNumber &&
          re.addressComponent.streetNumber.street;
        resolve({
          name: poiName || aoiName || street || '五合校区治愈角落',
          address: re.formatted_address || '广西外国语学院五合校区',
        });
      },
      fail() {
        resolve(null);
      },
    });
  });
}

module.exports = {
  requestApi,
  searchCampusPoi,
  reverseGeocode,
};

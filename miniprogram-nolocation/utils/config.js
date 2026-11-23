let localCfg = {};
try {
  localCfg = require('./config.local.js');
} catch (e) {
  localCfg = require('./config.example.js');
}

module.exports = {
  API_BASE: localCfg.API_BASE || 'https://pause.jingshutech.top/campus-pause-api',
  AMAP_WX_KEY: localCfg.AMAP_WX_KEY || '',
};

let localCfg = {};
try {
  localCfg = require('./config.local.js');
} catch (e) {
  localCfg = require('./config.example.js');
}

module.exports = {
  API_BASE: localCfg.API_BASE || 'https://8.148.11.126/campus-pause-api',
  AMAP_WX_KEY: localCfg.AMAP_WX_KEY || '',
};

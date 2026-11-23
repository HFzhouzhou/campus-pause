# 校园暂停键 (Campus Pause) — 免定位接口审核版微信小程序

本目录为 **方案一独立版本**（未改动原始 `miniprogram/` 目录），专门面向**未开通或无需申请 `wx.getLocation` 地理位置接口**的小程序提审场景。

## 与原版 `miniprogram/` 的差异

1. **零定位隐私接口（100% 免 `wx.getLocation` 审核）**
   - `app.json` 已彻底移除 `permission["scope.userLocation"]` 与 `requiredPrivateInfos: ["getLocation"]`。
   - 地图组件不调用 `wx.getLocation`，不开启 `show-location`。
2. **新增「校园区域快捷切区」定位体验**
   - 点击左上角校区胶囊或右侧「切区」按钮，可一键选择当前所在楼宇（五合校区中心 / 五合图书馆 / 明德楼 / 化龙池天鹅湖 / 田径场致达楼 / 五合南门钟楼），地图自动跳转并实时计算各治愈点到所选地标的步行距离。
3. **其余核心体验 100% 完整保留**
   - 「微信地图导航去这里」继续使用免审核的 `wx.openLocation`，点击直接拉起微信原生地图实时导航。
   - 「+ 标记治愈点」继续支持拖动准星 + 高德逆地理编码自动识别建筑名。
   - 情绪粉碎机、微步拆解（含流式打字机动画、纯本地规则零大模型备案风险）、无负担限时搭子、微信一键登录与头像昵称云端持久化同步均与主版本完全同步。

## 导入方式

在微信开发者工具中直接导入本目录 `/Users/puppymie/campus-pause/miniprogram-nolocation` 即可独立预览与上传提审，与原版 `miniprogram/` 互不干扰。

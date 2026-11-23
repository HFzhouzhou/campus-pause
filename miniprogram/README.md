# 校园暂停键 · 原生微信小程序 (`miniprogram/`)

## 快速在微信开发者工具中导入运行

1. 打开 **微信开发者工具** → 点击 **导入项目**。
2. 项目目录选择：`/Users/puppymie/campus-pause/miniprogram`
3. 填入你的正式小程序 **AppID**（会写入 `project.config.json`）。
4. 调试阶段请在右上角 **详情 → 本地设置** 中勾选 **「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**，即可直接连接线上服务器 `https://8.148.11.126/campus-pause-api` 进行真实邮箱验证码登录与高德五合校区 POI 检索。

## 开启微信一键登录（`wx.login` + 微信头像/昵称授权）

将你的正式小程序 `AppID` 与 `AppSecret` 填入服务器 `/etc/campus-pause/api.env` 的 `WECHAT_APPID` 与 `WECHAT_SECRET` 后重启 `campus-pause-api.service`，小程序登录弹窗中的 **「微信一键授权登录」** 即可直接生效。

## 正式发布上线前域名配置

在微信公众平台 → 开发管理 → 服务器域名中配置：
- **request 合法域名**：
  - `https://restapi.amap.com`（高德小程序建筑检索与逆地理编码）
  - 你的已 ICP 备案 HTTPS 域名（如将服务器 `/campus-pause-api/` 挂到 `https://www.jingshutech.top/campus-pause-api` 或独立子域名）

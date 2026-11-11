# TickTick Web Clipper

一键剪藏当前网页至 [滴答清单 (Dida365)](https://dida365.com) / [TickTick](https://ticktick.com)。

## ✨ 功能

- **一键剪藏** — 点击工具栏图标，将当前页面标题 + 链接保存为任务
- **右键菜单** — 发送整个页面或选中文本到滴答清单
- **正文提取** — 自动提取网页主体内容并转换为 Markdown
- **弹出面板** — 可选开启，点击图标时先预览编辑再保存
- **页内通知** — 任务创建成功/失败后在页面右上角显示 toast 通知
- **双域名支持** — 同时支持国内版 (dida365.com) 和国际版 (ticktick.com)
- **丰富配置** — 目标清单、优先级、截止日期、标签等均可自定义

## 📦 安装

### 从源码加载

1. 克隆本仓库

   ```bash
   git clone https://github.com/ifryan-work/ticktick-web-clipper.git
   ```

2. 打开 Chrome，进入 `chrome://extensions`

3. 开启右上角 **开发者模式**

4. 点击 **加载已解压的扩展程序**，选择 `src/` 目录

### 登录授权

国内版和国际版均已预置插件的 OAuth 应用配置。打开扩展的「选项」，选择服务版本后点击登录，在滴答清单 / TickTick 页面确认授权。插件自动生成回调地址。

两版分别保存登录状态、自建应用配置和目标清单。切换版本后会读取该版本的设置，登出当前版本后可继续使用另一版的登录状态。旧版共用的授权和清单配置会迁移到升级时选中的服务版本。

### 开发者配置

使用自建应用时，展开「高级授权设置」：

1. 前往开发者平台注册应用：
   - 国内版：[developer.dida365.com](https://developer.dida365.com)
   - 国际版：[developer.ticktick.com](https://developer.ticktick.com)

2. 创建应用时，将 **OAuth 回调地址** 设置为扩展显示的 Redirect URI（在设置页可以看到）

3. 获取应用的 `Client ID`，并确认该应用允许 PKCE（S256）公共客户端授权

4. 选择对应的服务版本，填写自建应用的 `Client ID` 后点击登录

插件通过 `code_challenge` 和 `code_verifier` 完成授权码交换。国内版及普通开发者应用的 PKCE 支持情况需要通过实际授权确认，授权失败时设置页会显示服务端返回的错误。

## 🏗 项目结构

```
src/
├── manifest.json          # MV3 扩展清单
├── service-worker.js      # 后台 Service Worker
├── js/
│   ├── store.js           # Chrome Storage 封装
│   ├── ticktick-api.js    # TickTick/Dida365 API 封装
│   ├── clipper.js         # 核心剪藏逻辑 + 页内 Toast
│   └── content-script.js  # 正文提取脚本
├── lib/
│   ├── readability.js     # Mozilla Readability
│   └── turndown.js        # Turndown (HTML → Markdown)
├── options/               # 设置页面
│   ├── options.html
│   ├── options.css
│   └── options.js
├── popup/                 # 弹出面板（可选）
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/                 # 扩展图标
```

## 🙏 致谢

本项目的灵感和部分设计参考了以下开源项目：

- **[nickytonline/ticktick-web-clipper](https://github.com/nickytonline/ticktick-web-clipper)** — 原始 TickTick Web Clipper 实现，为本项目提供了核心架构思路和 API 交互方式的参考

感谢所有开源贡献者的无私奉献 🎉

## 📄 License

MIT

## 🤖 Co-author

- Antigravity
- Claude
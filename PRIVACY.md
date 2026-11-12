# Privacy Policy / 隐私政策

Last updated / 更新日期: 2026-11-12

**Web Clipper for TickTick & Dida365** is an unofficial, open-source browser extension. It is not made, endorsed, or supported by TickTick or Dida365 (滴答清单) or their owners.

[English](#english) · [简体中文](#简体中文)

## English

### What the extension handles

Only when you trigger a clip (toolbar button, context menu, or the popup's Save button), the extension reads the following from the current tab:

- page title and URL;
- selected text, converted to Markdown, when you clip a selection;
- the page's main article content, converted to Markdown, when **Include page content** is enabled.

It combines this with your task options (list, priority, due date, tags, edited title) and sends it as a new task **directly to the service you selected**: `api.ticktick.com` for TickTick or `api.dida365.com` for Dida365. No other website receives it.

### Sign-in

You sign in through the selected service's own OAuth page (`ticktick.com` or `dida365.com`). The extension never sees your password. The resulting access token is stored in `chrome.storage.local` on this device, limited to the extension's own pages and background worker, and is not synced. To show which account is connected, the extension requests your profile name or email from the selected service. It displays that value but does not store it.

### Settings

Preferences (selected service, default list, task defaults, interface language, and an OAuth Client ID saved by older versions, if any) are stored in `chrome.storage.sync`. If browser sync is on, your browser vendor syncs them between your devices.

### What the extension does not do

- No analytics, tracking, advertising, or crash reporting.
- No servers run by the developer. Data goes only from your browser to the service you chose.
- Data is not sold, transferred to third parties, or used for anything other than creating tasks you asked for.
- No pages are read in the background; content is accessed only for the tab you clip, at the moment you clip it.

Your use of TickTick or Dida365 is governed by that service's own privacy policy.

### Removing your data

Sign out in the extension's settings to delete the stored token for that service. Uninstalling the extension deletes all of its local and synced data. Tasks you created stay in your TickTick or Dida365 account until you delete them there.

### Contact

Questions or concerns: <https://github.com/ifryan/ticktick-web-clipper/issues>

Changes to this policy are published in this file with a new date.

## 简体中文

### 扩展处理的数据

仅当你主动剪藏（点击工具栏图标、使用右键菜单或在弹窗中点击保存）时，扩展才会读取当前标签页的：

- 页面标题和网址；
- 剪藏选区时的选中文字（转换为 Markdown）；
- 开启「包含页面正文」时提取的正文（转换为 Markdown）。

这些内容与任务选项（清单、优先级、截止日期、标签、编辑后的标题）一起，作为新任务**直接发送到你选择的服务**：国际版为 `api.ticktick.com`，国内版为 `api.dida365.com`，不发送给其他任何网站。

### 登录

登录通过所选服务自己的 OAuth 页面（`ticktick.com` 或 `dida365.com`）完成，扩展不会接触你的密码。获得的访问令牌保存在本设备的 `chrome.storage.local` 中，仅扩展自身页面和后台可读取，不会同步。为显示当前登录账号，扩展会向所选服务请求用户名或邮箱，仅用于显示，不做保存。

### 设置

偏好设置（所选服务、默认清单、任务默认值、界面语言，以及旧版本保存的 OAuth Client ID（如有））保存在 `chrome.storage.sync` 中。开启浏览器同步时，会由浏览器厂商在你的设备之间同步。

### 扩展不会做的事

- 不包含任何统计、追踪、广告或崩溃上报。
- 开发者不运营任何服务器，数据只从你的浏览器发往你选择的服务。
- 不出售数据，不转移给第三方，也不用于创建你所请求任务之外的任何用途。
- 不在后台读取网页；仅在你剪藏的那一刻访问被剪藏的标签页。

你对滴答清单或 TickTick 的使用受该服务自身隐私政策约束。

### 删除数据

在扩展设置中退出登录即可删除对应服务的令牌。卸载扩展会删除其全部本地与同步数据。已创建的任务保留在你的滴答清单或 TickTick 账号中，需在对应服务内删除。

### 联系方式

问题与反馈：<https://github.com/ifryan/ticktick-web-clipper/issues>

本政策如有变更，将在本文件中更新并修改日期。

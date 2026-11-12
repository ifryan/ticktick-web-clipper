# TickTick Web Clipper

[简体中文](README.md) · [English](README.en.md)

将网页链接、选中文本和页面正文保存到滴答清单或 TickTick 的社区浏览器扩展，使用 Manifest V3、原生 JavaScript 和 HTML/CSS。

当前通过源码加载使用。公开发布前仍需完成发行身份与授权回调配置、隐私政策和商店资料，以及两版服务的实际联调。源码审查记录与修复进展见开源审查报告。

[审查报告](docs/open-source-review.md) · [反馈问题](https://github.com/ifryan/ticktick-web-clipper/issues) · [作者网站](https://ryanhuang.space)

## 功能

- 点击工具栏图标，将当前网页标题和链接保存为任务。
- 使用右键菜单剪藏整个页面或选中文字，选区支持保留链接、加粗、列表等 Markdown 格式。
- 使用 Readability 提取正文，再通过 Turndown 转换为 Markdown。
- 配置目标清单、优先级、截止日期、正文提取、页内通知和保存后关闭标签页。
- 开启弹窗模式，在保存前查看并调整标题、清单、优先级和日期。
- 切换国内版与国际版，分别保存授权和目标清单，并显示服务版本与登录账号。
- 界面支持简体中文和英文，可在设置页切换语言或跟随浏览器；其他浏览器语言回退到英文。

标签设置会在任务正文末尾附加标签文字。

## 安装

适用于支持 Manifest V3 和 `chrome.identity` 的 Chromium 浏览器。当前以 Chrome 的源码加载方式为开发入口。

```bash
git clone https://github.com/ifryan/ticktick-web-clipper.git
cd ticktick-web-clipper
```

1. 在 Chrome 打开 `chrome://extensions`。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择仓库中的 `src/` 目录。
4. 打开扩展的「选项」，选择国内版或国际版。
5. 点击「登录」，在对应服务的页面完成授权。
6. 点击刷新清单按钮，选择默认保存位置。

项目源码可以直接加载。修改文件后，在扩展管理页点击重新加载，再重新打开设置页或弹窗。

### OAuth 应用与回调地址

仓库包含国内版和国际版的公共 Client ID。OAuth 回调地址由浏览器为实际安装的扩展生成，必须与开发者平台登记的地址一致。自行克隆、移动源码路径或重新打包时，需要核对实际扩展 ID 和回调地址。当前源码加载方式需要完成这项配置才能用于不同安装环境。

维护自己的 OAuth 应用时，可按以下步骤配置。

1. 在对应服务的开发者平台注册应用。
2. 在 `chrome://extensions` 中找到扩展，打开 Service Worker 检查窗口，在控制台执行以下命令。

   ```js
   chrome.identity.getRedirectURL()
   ```

3. 将返回的完整地址登记到该应用，例如 `https://<extension-id>.chromiumapp.org/`。
4. 在 `src/js/store.js` 的 `DEFAULT_CLIENT_IDS` 中设置对应服务的 Client ID。
5. 重新加载扩展，选择服务版本后登录。

已保存的自定义 Client ID 优先于源码默认值。维护旧安装配置时，可在扩展 Service Worker 控制台删除对应的 `dida365.clientId` 或 `ticktick.clientId` 键，再重新登录。

插件使用带 S256 PKCE 的授权码流程，请求 `tasks:read tasks:write` 权限。Client ID 是应用标识，应用的 Client Secret 和打包私钥应由维护者单独保管。

[滴答清单开发者平台](https://developer.dida365.com) · [TickTick 开发者平台](https://developer.ticktick.com) · [Chrome Identity 文档](https://developer.chrome.com/docs/extensions/reference/api/identity)

## 使用

默认模式下，点击工具栏图标直接保存当前网页。右键菜单可以保存页面或选区；同一网页的不同选区会在标题中附加不同的摘要。

开启「弹出面板模式」后，点击图标先打开弹窗。标题、清单、优先级、日期和正文开关仅用于本次剪藏；默认设置在选项页修改。创建成功后关闭弹窗，网络或接口错误会显示错误并保留重试入口；未登录或授权过期时打开设置页重新登录。成功提示显示在当前网页中，可从提示打开已创建的任务。

国内版和国际版分别保留登录状态与默认清单。切换版本后会读取该版本的账户设置。页脚包含插件版本、作者网站及社交链接。

### 语言与默认服务

在设置页标题行右侧的三段式切换中选择「自动」「中文」或「EN」，分别对应跟随浏览器、简体中文和英文。选择自动保存到浏览器同步设置，当前设置页立即切换，随后打开的弹窗、工具栏提示、右键菜单、页内通知和插件自身的错误文案使用同一语言。切换语言会保留当前服务、账号、清单和表单内容。

默认跟随浏览器：简体中文浏览器显示中文，英文和暂不支持的语言显示英文。此模式使用 Chrome 原生 i18n，手动指定语言时读取同一套本地语言资源。浏览器扩展管理页中的名称与描述始终由 Chrome 按浏览器语言显示。服务端和浏览器返回的错误详情保留原文，页面标题、正文、清单名称和用户标签不翻译。

全新安装时，根据浏览器语言确定默认服务：简体中文默认使用滴答清单，其他语言默认使用 TickTick；可以随时在设置页切换服务。已有安装保留原有服务与账号设置，旧安装未明确保存服务时沿用原先的滴答清单。首次确定的默认服务会保存，之后更改界面或浏览器语言不会自动切换服务。

## 隐私与权限

网页正文和选区在当前浏览器中提取，再将任务标题、来源链接、所选正文和配置发送到用户选择的滴答清单或 TickTick API。授权请求也直接发送到相应服务。

设置和目标清单保存在 `chrome.storage.sync` 中，启用 Chrome 同步时可能同步到同一浏览器账号的其他设备。OAuth 访问令牌按服务保存在 `chrome.storage.local` 中，访问范围限定为扩展自身上下文，重启浏览器后仍可保留登录，不再通过 Chrome 同步。升级时会先将旧版同步区中的令牌迁入本地，再删除同步区副本。账号名称通过当前服务的用户信息接口读取并显示在界面中。

| 权限 | 当前用途 |
| --- | --- |
| `activeTab` | 在用户触发剪藏时访问当前标签页 |
| `scripting` | 注入正文提取、选区提取和页内通知脚本 |
| `contextMenus` | 提供页面与选区的右键菜单 |
| `storage` | 保存设置和授权状态 |
| `identity` | 发起 OAuth 授权并生成回调地址 |
| 服务域名访问权限 | 请求国内版或国际版的 OAuth 与 Open API |

关闭「包含页面正文」可以仅保存网页引用。退出登录会清除当前服务在扩展中保存的访问令牌。

[Chrome Storage 文档](https://developer.chrome.com/docs/extensions/reference/api/storage)

## 已知限制

- **授权分发** — 内置应用的回调登记需要与安装环境匹配，面向普通用户的稳定安装包和发布流程仍待完善。
- **账号信息** — `GET /open/v1/user/info` 未列入本次核对的官方 Open API 文档，两版兼容性仍待真实联调。读取失败时显示账号信息暂不可用。
- **页面支持** — 浏览器内部页面、扩展商店等受限页面可能无法注入脚本；正文提取失败时可能只保留网页引用。
- **Markdown 链接** — 全文提取中的标签符号替换可能影响带 `#` 的锚点链接。

审查报告还包含通知 DOM、依赖溯源、权限和发布验证方面的改进建议。已修复项目前完成源码核对，运行时验证仍待进行。

## 开发与贡献

```text
src/
├── manifest.json             扩展配置与权限
├── service-worker.js         工具栏、右键菜单与页面消息入口
├── _locales/                 英文与简体中文的 Chrome i18n 语言资源
├── js/
│   ├── i18n.js               翻译、界面属性与账户显示
│   ├── store.js              设置及分服务账户存储
│   ├── ticktick-api.js       OAuth、账户与任务 API
│   ├── clipper.js            剪藏流程和页内通知
│   ├── content-script.js     正文提取
│   └── selection-script.js   选区提取
├── styles/ui.css             设置页与弹窗共用样式
├── options/                  设置页
├── popup/                    剪藏弹窗
├── lib/                      随扩展分发的第三方库与许可证
└── icons/                    扩展图标
```

项目采用原生 ES modules，当前开发流程为修改源码、重新加载扩展和手动验证。仓库尚未建立自动化测试与 CI。

新增文案时，在 `src/_locales/en/messages.json` 和 `src/_locales/zh_CN/messages.json` 同步添加同名键；动态值使用命名占位符。HTML 使用 `data-i18n` 或 `data-i18n-placeholder`、`data-i18n-title`、`data-i18n-aria-label`，JavaScript 使用 `src/js/i18n.js` 的 `t()`。添加新语言时，以英文资源为基准创建对应的 Chrome locale 目录，保留占位符名称和参数顺序。`localeCode` 表示实际翻译语言的 BCP 47 代码。

提交问题时，请提供浏览器版本、所选服务、复现步骤和期望结果。涉及账号或授权的日志需要先移除令牌、授权码与私人内容。涉及凭证泄露的问题可先通过作者网站联系维护者。

提交 PR 时，使用英文描述改动和验证结果。建议围绕一个问题提交，并注明实际完成的检查。涉及剪藏流程时，应覆盖工具栏、右键选区、弹窗三种入口，以及成功、授权过期和请求失败的结果。两版服务的实际联调结果请分别记录。

## 许可与来源

本项目自有代码使用 MIT 许可证。随扩展分发的 Readability 使用 Apache-2.0，Turndown 使用 MIT，完整许可和已知来源记录随源码提供。

早期 README 记录了对 `nickytonline/ticktick-web-clipper` 的参考，本次核对时该仓库地址返回 404。历史引用范围与图标来源仍需维护者补充确认。界面采用本项目编写的原生 HTML/CSS，分组布局参考 Arc UI Pro Settings Page。

[MIT 许可证](LICENSE) · [第三方许可与来源](src/lib/THIRD_PARTY_NOTICES.md) · [开源审查报告](docs/open-source-review.md)

## 作者

[@ifryanx](https://ryanhuang.space) · [X](https://x.com/ryanhuangcn) · [GitHub](https://github.com/ifryan)

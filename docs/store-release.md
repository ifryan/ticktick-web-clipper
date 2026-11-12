# Store release guide

Everything needed to submit to the Chrome Web Store (and Microsoft Edge Add-ons for users in mainland China, where the Chrome Web Store is unreachable). Items marked **manual** can only be done in a dashboard or developer console.

## 1. Extension ID and OAuth callbacks (manual, blocker)

Sign-in uses `chrome.identity.getRedirectURL()`, which is `https://<extension-id>.chromiumapp.org/`. Each store assigns its own ID, so each one needs its callback registered with **both** providers before users can sign in.

1. Run `scripts/package.sh` and upload `dist/web-clipper-v<version>.zip` to the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole) as a draft. Do not publish yet.
2. Copy the item ID from the dashboard. The callback is `https://<id>.chromiumapp.org/`.
3. Add that callback to the TickTick app at <https://developer.ticktick.com/manage> (Client ID `NsXrQ7s86K757MKy7a`) and the Dida365 app at <https://developer.dida365.com/manage> (Client ID `0Ece5vu6cI93KzPUax`). Keep the existing development callbacks.
4. Repeat steps 1–3 for [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview), which assigns a different ID.
5. Optional: to give unpacked development builds the store ID, copy the public key from the dashboard's **Package** tab into a local manifest `"key"`. `scripts/package.sh` refuses to build while that field is present, because stores reject it.

## 2. Live sign-in check (manual, blocker)

The token request sends PKCE (`code_verifier`) without a client secret. Confirm both providers accept this for the registered apps. Install the store build with **Trusted testers** visibility (or a private Edge listing) and check, for **each** service:

- sign in, sign out, cancel the sign-in window;
- clip from the toolbar, the page context menu, a selection, and the popup;
- a task opens via **View task** in the toast;
- an expired/revoked token shows the sign-in-again message (HTTP 401 path);
- the account name appears (the `user/info` endpoint is undocumented; a fallback is shown if it fails).

If the token exchange returns `invalid_client`, the providers require a client secret. A secret cannot be shipped safely in an extension, so that case needs a small token-exchange backend and a privacy-policy update before release.

## 3. Listing

**Name** (from `_locales`): `Web Clipper for TickTick & Dida365` / `网页剪藏 · 适用于滴答清单与 TickTick`. Don't use "TickTick" as the leading word, the TickTick logo, or its brand colours in screenshots or promo images.

**Summary**: taken from `extensionDescription`; it already states the extension is unofficial.

**Description (English)**

> Save the page you're reading to TickTick or Dida365 as a task, in one click.
>
> • Toolbar button or right-click menu to save the current page or a selection
> • Selections keep links, bold text, and lists as Markdown
> • Optionally extracts the article body into the task description
> • Choose list, priority, due date, and tags, or adjust each clip in a popup
> • Works with both TickTick (international) and Dida365 (China)
> • English and Simplified Chinese interface
>
> Data goes straight from your browser to the service you select. No analytics, no developer servers.
>
> This is an unofficial, open-source project and is not affiliated with or endorsed by TickTick or Dida365. Source: https://github.com/ifryan/ticktick-web-clipper

**Description (简体中文)**

> 一键把正在阅读的网页保存为滴答清单或 TickTick 任务。
>
> • 通过工具栏按钮或右键菜单保存当前网页或选中文字
> • 选区保留链接、加粗、列表等 Markdown 格式
> • 可选提取网页正文写入任务描述
> • 设置清单、优先级、截止日期和标签，或在弹窗中逐次调整
> • 同时支持滴答清单（国内版）与 TickTick（国际版）
> • 界面支持简体中文与英文
>
> 数据直接从浏览器发送到你选择的服务，不含统计，开发者不运营任何服务器。
>
> 本扩展为非官方开源项目，与滴答清单 / TickTick 官方无关联，也未获其认可。源码：https://github.com/ifryan/ticktick-web-clipper

**Category**: Productivity (Workflow & planning). **Languages**: English, Chinese (Simplified).

**Images (manual)**: 128×128 icon (in `src/icons`, regenerate with `scripts/make-icons.py`); at least one 1280×800 screenshot per language (settings page, popup, toast on a real page); 440×280 small promo tile.

## 4. Privacy tab

- **Privacy policy URL**: `https://github.com/ifryan/ticktick-web-clipper/blob/main/PRIVACY.md`
- **Single purpose**: Save the current web page, selection, or article to the user's TickTick or Dida365 account as a task.
- **Remote code**: No. All scripts are packaged; Readability and Turndown are bundled in `lib/`.

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `activeTab` | Read the title, URL, selection, and article of the tab the user is clipping, only after the user clicks the toolbar button, context menu, or popup Save. |
| `scripting` | Inject the bundled Readability/Turndown scripts into the clipped tab to extract content, and show the in-page result notification. |
| `contextMenus` | Provide "save page" and "save selection" right-click actions. |
| `storage` | Store preferences (synced) and the OAuth access token (local only). |
| `identity` | Run the provider's OAuth sign-in with `launchWebAuthFlow`. |
| Host permissions (`ticktick.com/oauth`, `api.ticktick.com`, `dida365.com/oauth`, `api.dida365.com`) | Exchange the OAuth code for a token and call the provider's Open API to list projects and create tasks. No other hosts. |

**Data usage**: tick **Authentication information** (OAuth token), **Personally identifiable information** (account name/email shown in settings), and **Website content** (title, URL, selected text, article content). Leave the rest unticked. Certify all three Limited Use statements (no sale, no unrelated use, no creditworthiness use).

## 5. Submit

1. Bump `version` in `src/manifest.json` for every upload after the first.
2. `scripts/package.sh`, upload, fill in sections 3–4, submit for review.
3. Keep `ticktick-web-clipper.pem` and any store keys out of the repository (`*.pem` and `*.crx` are git-ignored).

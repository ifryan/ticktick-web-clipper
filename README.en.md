# TickTick Web Clipper

[简体中文](README.md) · [English](README.en.md)

A community browser extension for saving web links, selected text, and articles to TickTick or Dida365. Built with Manifest V3, native JavaScript, and HTML/CSS.

Install from source for now. Public distribution still requires a stable extension identity, registered OAuth callbacks, a privacy policy, store materials, and live integration checks for both services. See the [source review and progress report (Chinese)](docs/open-source-review.md).

## Features

- Save the current page title and link from the toolbar.
- Save a page or selection from the context menu, preserving links, emphasis, and lists as Markdown.
- Extract article content with Readability and convert it with Turndown.
- Choose a default list, priority, due date, tags, notifications, and whether to close the tab after saving.
- Enable a popup to edit the title, list, priority, date, and content option for each clipping.
- Keep separate accounts and default lists for TickTick (international) and Dida365 (China).
- Choose English, Simplified Chinese, or the browser's UI language in settings.

Tags are appended as text at the end of the task body.

## Install from source

Use a Chromium browser supporting Manifest V3 and `chrome.identity`. Chrome is the current development entry point.

```bash
git clone https://github.com/ifryan/ticktick-web-clipper.git
cd ticktick-web-clipper
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked** and choose the repository's `src/` directory.
3. Open the extension's **Options** and choose **TickTick — International** or **Dida365 — China**.
4. Select **Sign in** and complete authorization on that service's website.
5. Refresh the lists and choose your default destination.

After changing source files, reload the extension from `chrome://extensions` and reopen its settings or popup.

### OAuth application and callback

The repository includes public Client IDs for both services. The actual installation's callback must match the address registered with the provider. Cloning to another path or repackaging can change the extension ID, so an arbitrary source installation may require its own OAuth configuration.

To use your own application:

1. Register an application on the matching provider's developer platform.
2. Open the extension's Service Worker inspector from `chrome://extensions` and run:

   ```js
   chrome.identity.getRedirectURL()
   ```

3. Register the complete callback, for example `https://<extension-id>.chromiumapp.org/`, including the trailing slash.
4. Set the corresponding Client ID in `DEFAULT_CLIENT_IDS` in `src/js/store.js`.
5. Reload the extension, choose the service, and sign in.

Previously saved custom Client IDs override source defaults. To clear an old override, remove `dida365.clientId` or `ticktick.clientId` from `chrome.storage.sync` in the extension's Service Worker console, then sign in again.

Authorization uses the code flow with S256 PKCE and requests `tasks:read tasks:write`. Client IDs are public identifiers. Keep application Client Secrets and extension signing keys outside the repository.

[TickTick developer platform](https://developer.ticktick.com) · [Dida365 developer platform](https://developer.dida365.com) · [Chrome Identity documentation](https://developer.chrome.com/docs/extensions/reference/api/identity)

## Usage and language

By default, clicking the toolbar icon saves immediately. Enable **Preview before saving** to review the task in a popup. Popup edits apply only to that clipping; change persistent defaults in Options. A successful save closes the popup. Request failures keep a retry action available; missing or expired authorization opens settings.

Context menus save the page or selected text. Selection summaries distinguish excerpts from the same page. Successful in-page notifications include a link to the created task.

Use the three-part control at the far right of the Options title row: **Auto**, **中文**, or **EN** for the browser language, Simplified Chinese, or English. The choice is saved in synced preferences and applies immediately to the settings page, toolbar tooltip, context menus, subsequent notifications, and newly opened popups. Changing language preserves your selected service, account, lists, and form content.

The default **Follow browser** mode uses [Chrome's native i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n); unsupported browser languages fall back to English. Manual selection reads the same bundled language catalogs. Metadata on the browser's extension management page always follows Chrome's browser language. Provider/browser error details and user content, including titles, articles, list names, and tags, retain their original language.

Fresh installations choose a default service from the browser language: Dida365 for Simplified Chinese, TickTick otherwise. You can select either service in Options. Existing installations retain their service and account settings; legacy installations without an explicit service retain their previous Dida365 default. The initial choice is persisted, so changing the interface or browser language does not switch services.

## Privacy and permissions

Page content and selections are extracted in the browser. The task title, source link, selected content, and configured task fields are sent directly to the selected service's API. Authorization also goes directly to that service.

Preferences and default lists use `chrome.storage.sync` and may sync between devices using the same browser account. OAuth access tokens are stored separately for each service in `chrome.storage.local`, restricted to trusted extension contexts. Tokens persist across browser restarts and are not synced. Upgrades migrate older synced tokens locally before removing their synced copies. Signing out removes the selected service's local token. Account details are requested from the selected service for display.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Access the current tab when clipping is triggered |
| `scripting` | Extract articles/selections and display in-page notifications |
| `contextMenus` | Provide page and selection actions |
| `storage` | Store preferences and authorization |
| `identity` | Start OAuth and generate the callback address |
| Provider host permissions | Request OAuth and Open API endpoints for both services |

Disable **Include page content** to save only a page reference when clipping a full page.

## Known limitations

- **OAuth distribution:** registered callbacks must match the installation. A stable consumer installation package and release process are still pending.
- **Account information:** `GET /open/v1/user/info` was absent from the official API documentation consulted during review. Compatibility with both services needs live verification; the UI shows a fallback when details are unavailable.
- **Restricted pages:** internal browser pages and extension stores may block script injection. If article extraction fails, only the page reference may be saved.
- **Markdown links:** full-page extraction's tag-marker replacement may affect links containing `#` fragments.

The review report also records dependency provenance and release-verification work. Source review does not establish live service compatibility.

## Development and contributions

The extension uses native ES modules with no build step. There is currently no automated test suite or CI. Source lives in `src/`; shared controls use `src/styles/ui.css`.

Translations live in `src/_locales/en/messages.json` and `src/_locales/zh_CN/messages.json`. Add matching keys to both catalogs and use named placeholders for dynamic values. HTML uses `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`, and `data-i18n-aria-label`. JavaScript uses `t()` from `src/js/i18n.js`. To add a language, copy the English catalog into the appropriate Chrome locale directory and preserve placeholder names and argument positions. Set `localeCode` to the translation's BCP 47 language code.

When reporting a problem, include browser version, selected service, reproduction steps, and expected behavior. Remove tokens, authorization codes, and private content from logs. For credential disclosures, contact the maintainer through the author website first.

Use English commit and PR descriptions. State which checks actually ran. Clipping changes should be manually checked through toolbar, selection context menu, and popup flows, including success, expired authorization, and failed requests. Record live integration results separately for TickTick and Dida365.

## License and attribution

Project-owned code is MIT licensed. Bundled Readability uses Apache-2.0; Turndown uses MIT. Their license texts and known source records ship with the extension.

The earlier README referenced `nickytonline/ticktick-web-clipper`; that URL returned 404 during the source review. Historical reuse and icon provenance still need confirmation. The native HTML/CSS interface uses Arc UI Pro's Settings Page as a layout reference.

[MIT license](LICENSE) · [Third-party notices](src/lib/THIRD_PARTY_NOTICES.md) · [Source review (Chinese)](docs/open-source-review.md)

[@ifryanx](https://ryanhuang.space) · [X](https://x.com/ryanhuangcn) · [GitHub](https://github.com/ifryan)

/**
 * Chrome Storage Wrapper
 * Syncs preferences and keeps access tokens in trusted local storage
 */
const DEFAULT_CLIENT_IDS = {
  dida365: '0Ece5vu6cI93KzPUax',
  ticktick: 'NsXrQ7s86K757MKy7a'
};
const ACCOUNT_FIELDS = ['clientId', 'targetListId', 'targetListName'];
let tokenStorageReady;

export const storage = {
  location: chrome.storage.sync,

  defaults: {
    // API / Auth
    apiDomain: chrome.i18n.getMessage('localeCode') === 'zh-CN' ? 'dida365' : 'ticktick',
    clientId: '',

    // Task settings
    showNotification: true,
    taskTitle: 'tabTitle',         // 'tabTitle' | 'selectedText'
    autoClose: false,
    dueDate: -1,                   // -1 = no due date, 0 = today, 1 = tomorrow, etc.
    targetListId: '',
    targetListName: '',
    taskPriority: 0,               // 0=none, 1=low, 3=medium, 5=high
    tags: '',
    includePageContent: true,

    // UI
    language: 'auto',
    usePopup: false                // true = show popup panel before saving
  },

  /**
   * Get API domain URLs based on current setting
   */
  async getDomainConfig(apiDomain) {
    const opts = await this.loadOptions();
    const domain = apiDomain ?? opts.apiDomain;
    const clientIdKey = `${domain}.clientId`;
    const [account, token] = await Promise.all([
      this.get(clientIdKey),
      this.getToken(domain)
    ]);
    const isDida = domain === 'dida365';
    return {
      apiDomain: domain,
      clientId: account[clientIdKey] || DEFAULT_CLIENT_IDS[domain],
      token,
      oauthBase: isDida ? 'https://dida365.com/oauth' : 'https://ticktick.com/oauth',
      apiBase: isDida ? 'https://api.dida365.com/open/v1' : 'https://api.ticktick.com/open/v1',
      webBase: isDida ? 'https://dida365.com' : 'https://ticktick.com'
    };
  },

  set(obj) {
    return new Promise((resolve, reject) => {
      this.location.set(obj, () => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve();
      });
    });
  },

  get(obj) {
    return new Promise((resolve, reject) => {
      this.location.get(obj, (result) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(result);
      });
    });
  },

  remove(obj) {
    return new Promise((resolve, reject) => {
      this.location.remove(obj, (result) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(result);
      });
    });
  },

  async getToken(apiDomain) {
    await prepareTokenStorage();
    const key = `${apiDomain}.token`;
    const stored = await chrome.storage.local.get(key);
    return stored[key];
  },

  async setToken(apiDomain, token) {
    await prepareTokenStorage();
    await chrome.storage.local.set({ [`${apiDomain}.token`]: token });
  },

  async removeToken(apiDomain) {
    await prepareTokenStorage();
    await chrome.storage.local.remove(`${apiDomain}.token`);
  },

  async saveOptions(options) {
    const current = await this.loadOptions();
    const domain = options.apiDomain ?? current.apiDomain;
    const updates = Object.fromEntries(Object.entries(options).map(([key, value]) => [
      ACCOUNT_FIELDS.includes(key) ? `${domain}.${key}` : key,
      value
    ]));
    await this.set(updates);
  },

  async loadOptions() {
    await prepareTokenStorage();
    const accountKeys = Object.keys(DEFAULT_CLIENT_IDS).flatMap(domain =>
      ACCOUNT_FIELDS.map(key => `${domain}.${key}`)
    );
    const stored = await this.location.get([...Object.keys(this.defaults), ...accountKeys]);
    const domain = stored.apiDomain ?? this.defaults.apiDomain;
    await this.migrateLegacyAccount(stored, domain);

    return Object.fromEntries(Object.entries(this.defaults).map(([key, value]) => {
      const storedKey = ACCOUNT_FIELDS.includes(key) ? `${domain}.${key}` : key;
      return [key, stored[storedKey] ?? value];
    }));
  },

  async migrateLegacyAccount(stored, domain) {
    const legacyKeys = ACCOUNT_FIELDS.filter(key => stored[key] !== undefined);
    if (!legacyKeys.length) return;

    const updates = {};
    for (const key of legacyKeys) {
      const accountKey = `${domain}.${key}`;
      if (stored[accountKey] === undefined) {
        updates[accountKey] = stored[key];
        stored[accountKey] = stored[key];
      }
    }

    // Bind old account settings to the selected service before removing global keys.
    if (Object.keys(updates).length) await this.set(updates);
    await this.remove(legacyKeys);
  }
};

function prepareTokenStorage() {
  tokenStorageReady ??= migrateTokens();
  return tokenStorageReady;
}

async function migrateTokens() {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const tokenKeys = Object.keys(DEFAULT_CLIENT_IDS).map(domain => `${domain}.token`);
  const [synced, local] = await Promise.all([
    chrome.storage.sync.get(null),
    chrome.storage.local.get(tokenKeys)
  ]);
  // Older installs without an explicit service used Dida365. Choose a locale-based
  // default only for fresh installs, and persist it across browser language changes.
  const domain = synced.apiDomain ?? (
    Object.keys(synced).length || Object.keys(local).length ? 'dida365' : storage.defaults.apiDomain
  );
  if (synced.apiDomain === undefined) await chrome.storage.sync.set({ apiDomain: domain });
  const legacyKey = `${domain}.token`;
  const updates = {};
  for (const key of tokenKeys) {
    const token = synced[key] ?? (key === legacyKey ? synced.token : undefined);
    if (local[key] === undefined && token !== undefined) {
      updates[key] = token;
    }
  }

  // Save both services locally before deleting any synced credentials.
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
  const syncedKeys = ['token', ...tokenKeys].filter(key => synced[key] !== undefined);
  if (syncedKeys.length) await chrome.storage.sync.remove(syncedKeys);
}

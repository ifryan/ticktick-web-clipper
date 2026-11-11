/**
 * Chrome Storage Wrapper
 * Manages extension settings with chrome.storage.sync
 */
const DEFAULT_CLIENT_IDS = {
  dida365: '0Ece5vu6cI93KzPUax',
  ticktick: 'NsXrQ7s86K757MKy7a'
};
const ACCOUNT_FIELDS = ['clientId', 'token', 'targetListId', 'targetListName'];

export const storage = {
  location: chrome.storage.sync,

  defaults: {
    // API / Auth
    apiDomain: 'dida365',         // 'dida365' (国内版) or 'ticktick' (国际版)
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
    usePopup: false                // true = show popup panel before saving
  },

  /**
   * Get API domain URLs based on current setting
   */
  async getDomainConfig(apiDomain) {
    const opts = await this.loadOptions();
    const domain = apiDomain ?? opts.apiDomain;
    const clientIdKey = `${domain}.clientId`;
    const tokenKey = `${domain}.token`;
    const account = await this.get([clientIdKey, tokenKey]);
    const isDida = domain === 'dida365';
    return {
      apiDomain: domain,
      clientId: account[clientIdKey] || DEFAULT_CLIENT_IDS[domain],
      token: account[tokenKey],
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
    const accountKeys = Object.keys(DEFAULT_CLIENT_IDS).flatMap(domain =>
      ACCOUNT_FIELDS.map(key => `${domain}.${key}`)
    );
    const stored = await this.location.get([...Object.keys(this.defaults), 'token', ...accountKeys]);
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

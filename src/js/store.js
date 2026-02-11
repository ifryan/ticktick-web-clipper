/**
 * Chrome Storage Wrapper
 * Manages extension settings with chrome.storage.sync
 */
export const storage = {
  location: chrome.storage.sync,

  defaults: {
    // API / Auth
    apiDomain: 'dida365',         // 'dida365' (国内版) or 'ticktick' (国际版)
    clientId: '',
    clientSecret: '',

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
  async getDomainConfig() {
    const opts = await this.loadOptions();
    const isDida = opts.apiDomain === 'dida365';
    return {
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

  async loadOptions() {
    const storedOptions = await this.location.get(Object.keys(this.defaults));

    // Fill in defaults for any missing keys
    for (const [key, value] of Object.entries(this.defaults)) {
      if (storedOptions[key] === undefined) {
        storedOptions[key] = value;
      }
    }

    // Persist defaults back to storage
    await this.set(storedOptions);
    return storedOptions;
  }
};

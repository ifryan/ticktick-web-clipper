const catalogs = new Map();
let catalog;
let fallbackCatalog;
let initialization;

export function initializeI18n() {
    initialization ??= chrome.storage.sync.get({ language: 'auto' })
        .then(({ language }) => setLanguage(language));
    return initialization;
}

export async function setLanguage(language) {
    if (language === 'auto') {
        catalog = undefined;
        return;
    }
    const fallback = await loadCatalog('en');
    const selected = await loadCatalog(language);
    catalog = selected;
    fallbackCatalog = fallback;
}

export function t(key, substitutions) {
    if (!catalog) return chrome.i18n.getMessage(key, substitutions);
    const entry = catalog[key] ?? fallbackCatalog[key];
    return entry ? formatMessage(entry, substitutions) : '';
}

async function loadCatalog(language) {
    if (!catalogs.has(language)) {
        const response = await fetch(chrome.runtime.getURL(`_locales/${language}/messages.json`));
        if (!response.ok) throw new Error(t('loadLanguageFailed', String(response.status)));
        catalogs.set(language, await response.json());
    }
    return catalogs.get(language);
}

function formatMessage({ message, placeholders = {} }, substitutions = []) {
    const values = Array.isArray(substitutions) ? substitutions : [substitutions];
    return message.replace(/\$\$|\$([a-z0-9_]+)\$|\$([1-9])/gi, (match, name, index) => {
        if (match === '$$') return '$';
        if (index) return values[Number(index) - 1] ?? '';
        return placeholders[name.toLowerCase()].content.replace(/\$([1-9])/g,
            (_, position) => values[Number(position) - 1] ?? '');
    });
}

export function localizePage() {
    document.documentElement.lang = t('localeCode');
    for (const element of document.querySelectorAll('[data-i18n]')) {
        element.textContent = t(element.dataset.i18n);
    }
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
        for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
            element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
        }
    }
}

export function serviceName(apiDomain) {
    return t(apiDomain === 'dida365' ? 'serviceDida' : 'serviceTickTick');
}

export function accountLabel({ apiDomain, isLoggedIn, accountName }) {
    const status = isLoggedIn ? accountName || t('accountUnavailableSignedIn') : t('signedOut');
    return t('accountLabel', [serviceName(apiDomain), status]);
}

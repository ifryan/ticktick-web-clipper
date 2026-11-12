/**
 * Options Page Logic
 * Handles: load/save settings, login/logout, account info, refresh project lists
 */
import { t, initializeI18n, setLanguage, localizePage, serviceName, accountLabel } from '../js/i18n.js';

const $ = (id) => document.getElementById(id);
let currentAccount;

const elements = {
    language: $('language'),
    authStatus: $('auth-status'),
    authText: $('auth-text'),
    btnLogin: $('btn-login'),
    btnLogout: $('btn-logout'),

    apiDomain: $('api-domain'),

    taskTitleSource: $('task-title-source'),
    targetList: $('target-list'),
    btnRefreshLists: $('btn-refresh-lists'),
    taskPriority: $('task-priority'),
    dueDate: $('due-date'),
    tags: $('tags'),

    includeContent: $('include-content'),
    showNotification: $('show-notification'),
    autoClose: $('auto-close'),
    usePopup: $('use-popup')
};

// ─── Messaging Helper ────────────────────
function sendMessage(type, payload) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type, payload }, resolve);
    });
}

// ─── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await initializeI18n();
    localizePage();
    await loadOptions();
    await checkLoginStatus();
    bindEvents();
});

// ─── Load Options ────────────────────────
async function loadOptions() {
    const response = await sendMessage('getOptions');
    if (!response || !response.success) return;

    const opts = response.data;

    selectLanguage(opts.language);
    elements.apiDomain.value = opts.apiDomain;
    elements.taskTitleSource.value = opts.taskTitle || 'tabTitle';
    elements.taskPriority.value = String(opts.taskPriority || 0);
    elements.dueDate.value = String(opts.dueDate ?? -1);
    elements.tags.value = opts.tags || '';
    elements.includeContent.checked = opts.includePageContent !== false;
    elements.showNotification.checked = opts.showNotification !== false;
    elements.autoClose.checked = !!opts.autoClose;
    elements.usePopup.checked = !!opts.usePopup;

    // Set target list
    elements.targetList.replaceChildren(new Option(t('inboxDefault'), ''));
    if (opts.targetListId) {
        const option = document.createElement('option');
        option.value = opts.targetListId;
        option.textContent = opts.targetListName || opts.targetListId;
        option.selected = true;
        elements.targetList.appendChild(option);
    }
}

// ─── Check Login Status ──────────────────
async function checkLoginStatus() {
    const response = await sendMessage('isLoggedIn');
    const isLoggedIn = response && response.success && response.data;
    updateAuthUI(isLoggedIn);
    if (isLoggedIn) loadAccountInfo();
    return isLoggedIn;
}

function updateAuthUI(isLoggedIn) {
    currentAccount = { apiDomain: elements.apiDomain.value, isLoggedIn, loading: isLoggedIn };
    renderAuthUI();
}

function renderAuthUI() {
    const { isLoggedIn, apiDomain, loading } = currentAccount;
    elements.authText.textContent = loading
        ? t('accountLabel', [serviceName(apiDomain), t('loadingAccount')])
        : accountLabel(currentAccount);
    if (isLoggedIn) {
        elements.authStatus.className = 'auth-banner auth-logged-in';
        elements.btnLogin.style.display = 'none';
        elements.btnLogout.style.display = '';
    } else {
        elements.authStatus.className = 'auth-banner auth-logged-out';
        elements.btnLogin.style.display = '';
        elements.btnLogout.style.display = 'none';
    }
}

async function loadAccountInfo() {
    const domain = elements.apiDomain.value;
    const response = await sendMessage('getAccountInfo');
    if (domain !== elements.apiDomain.value || !elements.authStatus.classList.contains('auth-logged-in')) return;

    currentAccount = response?.success ? response.data : { apiDomain: domain, isLoggedIn: true };
    renderAuthUI();
}

// ─── Bind Events ─────────────────────────
function bindEvents() {
    elements.language.addEventListener('change', async (event) => {
        const language = event.target.value;
        elements.language.disabled = true;
        try {
            const response = await sendMessage('setOptions', { language });
            if (!response?.success) throw new Error(response?.error || t('unknownError'));
            await setLanguage(language);
            localizePage();
            elements.targetList.options[0].textContent = t('inboxDefault');
            renderAuthUI();
        } catch (error) {
            alert(t('switchLanguageFailed', error.message));
            const response = await sendMessage('getOptions');
            if (response?.success) selectLanguage(response.data.language);
        } finally {
            elements.language.disabled = false;
        }
    });

    // Login
    elements.btnLogin.addEventListener('click', async () => {
        setAccountBusy(true);
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        elements.btnLogin.replaceChildren(spinner, document.createTextNode(t('signingIn')));

        try {
            const saved = await saveOptions({
                apiDomain: elements.apiDomain.value
            });
            if (!saved?.success) {
                throw new Error(saved?.error || t('saveAuthFailed'));
            }

            const response = await sendMessage('login');
            if (!response?.success) {
                throw new Error(response?.error || t('unknownError'));
            }
            await checkLoginStatus();
            await loadProjectLists();
        } catch (error) {
            alert(t('signInFailed', error.message));
        } finally {
            setAccountBusy(false);
            elements.btnLogin.textContent = t('signIn');
        }
    });

    // Logout
    elements.btnLogout.addEventListener('click', async () => {
        setAccountBusy(true);
        try {
            const response = await sendMessage('logout');
            if (!response?.success) {
                throw new Error(response?.error || t('unknownError'));
            }
            updateAuthUI(false);
        } catch (error) {
            alert(t('signOutFailed', error.message));
        } finally {
            setAccountBusy(false);
        }
    });

    // Refresh project lists
    elements.btnRefreshLists.addEventListener('click', async () => {
        setAccountBusy(true);
        try {
            await loadProjectLists();
        } finally {
            setAccountBusy(false);
        }
    });

    // Auto-save on change
    elements.apiDomain.addEventListener('change', async () => {
        setAccountBusy(true);
        try {
            const response = await saveOption('apiDomain', elements.apiDomain.value);
            if (!response?.success) {
                throw new Error(response?.error || t('saveServiceFailed'));
            }
            await loadOptions();
            if (await checkLoginStatus()) {
                await loadProjectLists();
            }
        } catch (error) {
            alert(t('switchServiceFailed', error.message));
            await loadOptions();
            await checkLoginStatus();
        } finally {
            setAccountBusy(false);
        }
    });

    elements.taskTitleSource.addEventListener('change', () =>
        saveOption('taskTitle', elements.taskTitleSource.value));

    elements.targetList.addEventListener('change', () => {
        const selected = elements.targetList.selectedOptions[0];
        saveOptions({
            targetListId: selected.value,
            targetListName: selected.textContent
        });
    });

    elements.taskPriority.addEventListener('change', () =>
        saveOption('taskPriority', Number(elements.taskPriority.value)));

    elements.dueDate.addEventListener('change', () =>
        saveOption('dueDate', Number(elements.dueDate.value)));

    elements.tags.addEventListener('change', () =>
        saveOption('tags', elements.tags.value.trim()));

    elements.includeContent.addEventListener('change', () =>
        saveOption('includePageContent', elements.includeContent.checked));

    elements.showNotification.addEventListener('change', () =>
        saveOption('showNotification', elements.showNotification.checked));

    elements.autoClose.addEventListener('change', () =>
        saveOption('autoClose', elements.autoClose.checked));

    elements.usePopup.addEventListener('change', () =>
        saveOption('usePopup', elements.usePopup.checked));
}

// ─── Save Helpers ────────────────────────
function selectLanguage(language) {
    elements.language.querySelectorAll('input').forEach(input => {
        input.checked = input.value === language;
    });
}

function saveOption(key, value) {
    return saveOptions({ [key]: value });
}

function saveOptions(payload) {
    return sendMessage('setOptions', { apiDomain: elements.apiDomain.value, ...payload });
}

function setAccountBusy(busy) {
    [
        elements.language,
        elements.apiDomain,
        elements.btnLogin,
        elements.btnLogout,
        elements.btnRefreshLists,
        elements.targetList
    ].forEach(element => element.disabled = busy);
}

// ─── Load Project Lists ──────────────────
async function loadProjectLists() {
    elements.btnRefreshLists.disabled = true;
    elements.btnRefreshLists.textContent = '⏳';

    const response = await sendMessage('getProjects');

    elements.btnRefreshLists.disabled = false;
    elements.btnRefreshLists.textContent = '↻';

    if (!response || !response.success) {
        console.error('Failed to load project lists:', response?.error);
        return;
    }

    const projects = response.data;
    const currentValue = elements.targetList.value;

    elements.targetList.replaceChildren(new Option(t('inboxDefault'), ''));

    for (const project of projects) {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        if (project.id === currentValue) {
            option.selected = true;
        }
        elements.targetList.appendChild(option);
    }
}

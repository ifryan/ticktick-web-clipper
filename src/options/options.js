/**
 * Options Page Logic
 * Handles: load/save settings, login/logout, refresh project lists,
 * collapsible API config section
 */

const $ = (id) => document.getElementById(id);

const elements = {
    authStatus: $('auth-status'),
    authText: $('auth-text'),
    btnLogin: $('btn-login'),
    btnLogout: $('btn-logout'),

    apiConfigCard: $('api-config-card'),
    apiConfigToggle: $('api-config-toggle'),
    apiDomain: $('api-domain'),
    clientId: $('client-id'),
    clientSecret: $('client-secret'),
    devPortalLink: $('dev-portal-link'),
    redirectUri: $('redirect-uri'),

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
    // Show redirect URI
    if (chrome.identity && chrome.identity.getRedirectURL) {
        elements.redirectUri.textContent = chrome.identity.getRedirectURL();
    }

    await loadOptions();
    await checkLoginStatus();
    bindEvents();
});

// ─── Load Options ────────────────────────
async function loadOptions() {
    const response = await sendMessage('getOptions');
    if (!response || !response.success) return;

    const opts = response.data;

    elements.apiDomain.value = opts.apiDomain || 'dida365';
    elements.clientId.value = opts.clientId || '';
    elements.clientSecret.value = opts.clientSecret || '';
    elements.taskTitleSource.value = opts.taskTitle || 'tabTitle';
    elements.taskPriority.value = String(opts.taskPriority || 0);
    elements.dueDate.value = String(opts.dueDate ?? -1);
    elements.tags.value = opts.tags || '';
    elements.includeContent.checked = opts.includePageContent !== false;
    elements.showNotification.checked = opts.showNotification !== false;
    elements.autoClose.checked = !!opts.autoClose;
    elements.usePopup.checked = !!opts.usePopup;

    // Set target list
    if (opts.targetListId) {
        const option = document.createElement('option');
        option.value = opts.targetListId;
        option.textContent = opts.targetListName || opts.targetListId;
        option.selected = true;
        elements.targetList.appendChild(option);
    }

    updateDevPortalLink();
}

// ─── Check Login Status ──────────────────
async function checkLoginStatus() {
    const response = await sendMessage('isLoggedIn');
    const isLoggedIn = response && response.success && response.data;
    updateAuthUI(isLoggedIn);
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        elements.authStatus.className = 'auth-banner auth-logged-in';
        elements.authText.textContent = '已登录';
        elements.btnLogin.style.display = 'none';
        elements.btnLogout.style.display = 'inline-block';
        // Collapse API config when logged in
        elements.apiConfigCard.classList.add('collapsed');
    } else {
        elements.authStatus.className = 'auth-banner auth-logged-out';
        elements.authText.textContent = '未登录';
        elements.btnLogin.style.display = 'inline-block';
        elements.btnLogout.style.display = 'none';
        // Expand API config when not logged in
        elements.apiConfigCard.classList.remove('collapsed');
    }
}

// ─── Update Dev Portal Link ──────────────
function updateDevPortalLink() {
    const isDida = elements.apiDomain.value === 'dida365';
    elements.devPortalLink.href = isDida
        ? 'https://developer.dida365.com'
        : 'https://developer.ticktick.com';
    elements.devPortalLink.textContent = isDida
        ? 'developer.dida365.com'
        : 'developer.ticktick.com';
}

// ─── Bind Events ─────────────────────────
function bindEvents() {
    // Toggle API config section
    elements.apiConfigToggle.addEventListener('click', () => {
        elements.apiConfigCard.classList.toggle('collapsed');
    });

    // Login
    elements.btnLogin.addEventListener('click', async () => {
        await saveOption('clientId', elements.clientId.value.trim());
        await saveOption('clientSecret', elements.clientSecret.value.trim());

        elements.btnLogin.disabled = true;
        elements.btnLogin.innerHTML = '<span class="spinner"></span>登录中...';

        const response = await sendMessage('login');

        elements.btnLogin.disabled = false;
        elements.btnLogin.innerHTML = '登录';

        if (response && response.success) {
            updateAuthUI(true);
            loadProjectLists();
        } else {
            alert('登录失败: ' + (response?.error || '未知错误'));
        }
    });

    // Logout
    elements.btnLogout.addEventListener('click', async () => {
        await sendMessage('logout');
        updateAuthUI(false);
    });

    // Refresh project lists
    elements.btnRefreshLists.addEventListener('click', () => loadProjectLists());

    // Auto-save on change
    elements.apiDomain.addEventListener('change', () => {
        saveOption('apiDomain', elements.apiDomain.value);
        updateDevPortalLink();
    });

    elements.clientId.addEventListener('change', () =>
        saveOption('clientId', elements.clientId.value.trim()));

    elements.clientSecret.addEventListener('change', () =>
        saveOption('clientSecret', elements.clientSecret.value.trim()));

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
function saveOption(key, value) {
    return saveOptions({ [key]: value });
}

function saveOptions(payload) {
    return sendMessage('setOptions', payload);
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

    elements.targetList.innerHTML = '<option value="">收件箱（默认）</option>';

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

/**
 * Options Page Logic
 * Handles: load/save settings, login/logout, account info, refresh project lists
 */

const $ = (id) => document.getElementById(id);

const elements = {
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
    elements.taskTitleSource.value = opts.taskTitle || 'tabTitle';
    elements.taskPriority.value = String(opts.taskPriority || 0);
    elements.dueDate.value = String(opts.dueDate ?? -1);
    elements.tags.value = opts.tags || '';
    elements.includeContent.checked = opts.includePageContent !== false;
    elements.showNotification.checked = opts.showNotification !== false;
    elements.autoClose.checked = !!opts.autoClose;
    elements.usePopup.checked = !!opts.usePopup;

    // Set target list
    elements.targetList.innerHTML = '<option value="">收件箱（默认）</option>';
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
    const version = elements.apiDomain.value === 'dida365' ? '国内版' : '国际版';
    elements.authText.textContent = `${version} · ${isLoggedIn ? '正在读取账号…' : '未登录'}`;
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

    const version = domain === 'dida365' ? '国内版' : '国际版';
    elements.authText.textContent = response?.success
        ? response.data.label
        : `${version} · 已登录（账号信息暂不可用）`;
}

// ─── Bind Events ─────────────────────────
function bindEvents() {
    // Login
    elements.btnLogin.addEventListener('click', async () => {
        setAccountBusy(true);
        elements.btnLogin.innerHTML = '<span class="spinner"></span>登录中...';

        try {
            const saved = await saveOptions({
                apiDomain: elements.apiDomain.value
            });
            if (!saved?.success) {
                throw new Error(saved?.error || '保存授权配置失败');
            }

            const response = await sendMessage('login');
            if (!response?.success) {
                throw new Error(response?.error || '未知错误');
            }
            await checkLoginStatus();
            await loadProjectLists();
        } catch (error) {
            alert('登录失败: ' + error.message);
        } finally {
            setAccountBusy(false);
            elements.btnLogin.innerHTML = '登录';
        }
    });

    // Logout
    elements.btnLogout.addEventListener('click', async () => {
        setAccountBusy(true);
        try {
            const response = await sendMessage('logout');
            if (!response?.success) {
                throw new Error(response?.error || '未知错误');
            }
            updateAuthUI(false);
        } catch (error) {
            alert('登出失败: ' + error.message);
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
                throw new Error(response?.error || '保存服务版本失败');
            }
            await loadOptions();
            if (await checkLoginStatus()) {
                await loadProjectLists();
            }
        } catch (error) {
            alert('切换服务失败: ' + error.message);
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
function saveOption(key, value) {
    return saveOptions({ [key]: value });
}

function saveOptions(payload) {
    return sendMessage('setOptions', { apiDomain: elements.apiDomain.value, ...payload });
}

function setAccountBusy(busy) {
    [
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

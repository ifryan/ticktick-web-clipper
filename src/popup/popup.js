/**
 * Popup Page Logic
 * Shows a form to preview/edit task info before clipping
 */
import { t, initializeI18n, localizePage, serviceName, accountLabel } from '../js/i18n.js';

const $ = (id) => document.getElementById(id);

const views = {
    notLoggedIn: $('not-logged-in'),
    clipForm: $('clip-form'),
    clipSuccess: $('clip-success'),
    clipError: $('clip-error')
};

const els = {
    btnGoOptions: $('btn-go-options'),
    btnClip: $('btn-clip'),
    btnRetry: $('btn-retry'),
    popupTitle: $('popup-title'),
    popupList: $('popup-list'),
    popupPriority: $('popup-priority'),
    popupDue: $('popup-due'),
    popupContent: $('popup-content'),
    popupAccount: $('popup-account'),
    errorMessage: $('error-message')
};

function sendMessage(type, payload) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type, payload }, resolve);
    });
}

function showView(viewName) {
    Object.values(views).forEach(v => v.style.display = 'none');
    views[viewName].style.display = 'block';
}

// ─── Init ─────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await initializeI18n();
    localizePage();
    const accountInfo = sendMessage('getAccountInfo');
    accountInfo.then(response => {
        els.popupAccount.textContent = response?.success ? accountLabel(response.data) : t('accountUnavailable');
    });

    // Check login
    const authResponse = await sendMessage('isLoggedIn');
    if (!authResponse?.success || !authResponse.data) {
        showView('notLoggedIn');
        bindEvents();
        return;
    }

    // Load options and current tab info
    showView('clipForm');
    await initForm();
    bindEvents();
});

async function initForm() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    els.popupTitle.value = tab.title || '';

    // Load saved options
    const optResponse = await sendMessage('getOptions');
    if (optResponse?.success) {
        const opts = optResponse.data;
        els.btnClip.textContent = t('saveToService', serviceName(opts.apiDomain));
        els.popupPriority.value = String(opts.taskPriority || 0);
        els.popupDue.value = String(opts.dueDate ?? -1);
        els.popupContent.checked = opts.includePageContent !== false;
    }

    // Load project lists
    try {
        const projResponse = await sendMessage('getProjects');
        if (projResponse?.success && Array.isArray(projResponse.data)) {
            const currentList = (optResponse?.data?.targetListId) || '';
            els.popupList.replaceChildren(new Option(t('inbox'), ''));
            for (const proj of projResponse.data) {
                const opt = document.createElement('option');
                opt.value = proj.id;
                opt.textContent = proj.name;
                if (proj.id === currentList) opt.selected = true;
                els.popupList.appendChild(opt);
            }
        }
    } catch (e) {
        console.error('Failed to load projects:', e);
    }
}

function bindEvents() {
    // Go to options
    els.btnGoOptions.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    // Clip
    els.btnClip.addEventListener('click', handleClip);

    // Retry
    els.btnRetry.addEventListener('click', () => {
        showView('clipForm');
    });
}

async function handleClip() {
    const saveLabel = els.btnClip.textContent;
    els.btnClip.disabled = true;
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    els.btnClip.replaceChildren(spinner, document.createTextNode(t('saving')));

    try {
        const result = await sendMessage('clipTab', {
            title: els.popupTitle.value,
            targetListId: els.popupList.value,
            taskPriority: Number(els.popupPriority.value),
            dueDate: Number(els.popupDue.value),
            includePageContent: els.popupContent.checked
        });

        if (result?.success) {
            window.close();
        } else {
            throw new Error(result?.error || t('createTaskFailed'));
        }
    } catch (error) {
        els.errorMessage.textContent = error.message;
        showView('clipError');
    } finally {
        els.btnClip.disabled = false;
        els.btnClip.textContent = saveLabel;
    }
}

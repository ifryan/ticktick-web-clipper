/**
 * Popup Page Logic
 * Shows a form to preview/edit task info before clipping
 */

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
        els.popupPriority.value = String(opts.taskPriority || 0);
        els.popupDue.value = String(opts.dueDate ?? -1);
        els.popupContent.checked = opts.includePageContent !== false;
    }

    // Load project lists
    try {
        const projResponse = await sendMessage('getProjects');
        if (projResponse?.success && Array.isArray(projResponse.data)) {
            const currentList = (optResponse?.data?.targetListId) || '';
            els.popupList.innerHTML = '<option value="">收件箱</option>';
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
    els.btnClip.disabled = true;
    els.btnClip.innerHTML = '<span class="spinner"></span>保存中...';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Build overrides from the popup form
        const overrides = {
            popupTitle: els.popupTitle.value,
            projectId: els.popupList.value || undefined,
            priority: Number(els.popupPriority.value),
            dueDate: Number(els.popupDue.value),
            includePageContent: els.popupContent.checked
        };

        // Save the overrides temporarily and then clip
        await sendMessage('setOptions', {
            targetListId: overrides.projectId || '',
            taskPriority: overrides.priority,
            dueDate: overrides.dueDate,
            includePageContent: overrides.includePageContent
        });

        const result = await sendMessage('clipTab');

        if (result?.success) {
            // showView('clipSuccess');
            // Auto-close popup after 1.5s
            window.close()
        } else {
            throw new Error(result?.error || '创建任务失败');
        }
    } catch (error) {
        els.errorMessage.textContent = error.message;
        showView('clipError');
    } finally {
        els.btnClip.disabled = false;
        els.btnClip.innerHTML = '✨ 保存到滴答清单';
    }
}

/**
 * Core Clipping Logic
 * Handles the main workflow: check auth → build task data → call API → show in-page toast
 */
import { storage } from './store.js';
import { ticktickApi } from './ticktick-api.js';

/**
 * Extract page content as Markdown by injecting scripts into the active tab
 */
async function getTabContentAsMarkdown(tab) {
    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
                '/lib/readability.js',
                '/lib/turndown.js',
                '/js/content-script.js'
            ]
        });

        if (!Array.isArray(result) || result.length === 0) return '';
        return result[0].result || '';
    } catch (error) {
        console.error('Failed to extract page content:', error);
        return '';
    }
}

/**
 * Inject an in-page toast notification into the active tab
 */
async function showPageToast(tabId, { type, title, message, viewUrl, taskData }) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            args: [{ type, title, message, viewUrl, taskData }],
            func: (opts) => {
                // Remove any existing toast
                const existing = document.getElementById('__ticktick_clipper_toast');
                if (existing) existing.remove();

                // Inject styles
                const styleId = '__ticktick_clipper_toast_style';
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = `
                        #__ticktick_clipper_toast {
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            z-index: 2147483647;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
                            pointer-events: auto;
                            animation: __tt_slide_in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                        }
                        @keyframes __tt_slide_in {
                            from { opacity: 0; transform: translateX(40px); }
                            to { opacity: 1; transform: translateX(0); }
                        }
                        @keyframes __tt_slide_out {
                            from { opacity: 1; transform: translateX(0); }
                            to { opacity: 0; transform: translateX(40px); }
                        }
                        #__ticktick_clipper_toast .tt-toast-card {
                            width: 320px;
                            background: #fff;
                            border: 1px solid #eaeaea;
                            border-radius: 8px;
                            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                            overflow: hidden;
                        }
                        #__ticktick_clipper_toast .tt-toast-body {
                            padding: 14px 16px;
                            display: flex;
                            align-items: flex-start;
                            gap: 10px;
                        }
                        #__ticktick_clipper_toast .tt-toast-icon {
                            font-size: 18px;
                            line-height: 1;
                            flex-shrink: 0;
                            margin-top: 1px;
                        }
                        #__ticktick_clipper_toast .tt-toast-content {
                            flex: 1;
                            min-width: 0;
                        }
                        #__ticktick_clipper_toast .tt-toast-title {
                            font-size: 13px;
                            font-weight: 600;
                            color: #171717;
                            margin: 0 0 2px;
                            line-height: 1.4;
                        }
                        #__ticktick_clipper_toast .tt-toast-msg {
                            font-size: 12px;
                            color: #666;
                            margin: 0;
                            line-height: 1.4;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        #__ticktick_clipper_toast .tt-toast-close {
                            background: none;
                            border: none;
                            cursor: pointer;
                            color: #999;
                            font-size: 16px;
                            line-height: 1;
                            padding: 0;
                            flex-shrink: 0;
                            transition: color 0.15s;
                        }
                        #__ticktick_clipper_toast .tt-toast-close:hover {
                            color: #171717;
                        }
                        #__ticktick_clipper_toast .tt-toast-actions {
                            display: flex;
                            border-top: 1px solid #eaeaea;
                        }
                        #__ticktick_clipper_toast .tt-toast-actions a,
                        #__ticktick_clipper_toast .tt-toast-actions button {
                            flex: 1;
                            padding: 8px 0;
                            text-align: center;
                            font-size: 12px;
                            font-weight: 500;
                            color: #666;
                            text-decoration: none;
                            background: none;
                            border: none;
                            cursor: pointer;
                            transition: all 0.15s;
                            font-family: inherit;
                        }
                        #__ticktick_clipper_toast .tt-toast-actions a:hover,
                        #__ticktick_clipper_toast .tt-toast-actions button:hover {
                            color: #171717;
                            background: #fafafa;
                        }
                        #__ticktick_clipper_toast .tt-toast-actions a + button {
                            border-left: 1px solid #eaeaea;
                        }
                        #__ticktick_clipper_toast .tt-toast-progress {
                            height: 2px;
                            background: #eaeaea;
                            overflow: hidden;
                        }
                        #__ticktick_clipper_toast .tt-toast-progress-bar {
                            height: 100%;
                            background: #171717;
                            animation: __tt_progress 5s linear forwards;
                        }
                        @keyframes __tt_progress {
                            from { width: 100%; }
                            to { width: 0%; }
                        }
                        #__ticktick_clipper_toast.tt-loading .tt-toast-progress-bar {
                            animation: none;
                            width: 100%;
                            background: linear-gradient(90deg, #eee 0%, #171717 50%, #eee 100%);
                            background-size: 200% 100%;
                            animation: __tt_shimmer 1.5s infinite;
                        }
                        @keyframes __tt_shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }

                const iconMap = {
                    loading: '⏳',
                    success: '✅',
                    error: '❌'
                };

                const toast = document.createElement('div');
                toast.id = '__ticktick_clipper_toast';
                if (opts.type === 'loading') toast.classList.add('tt-loading');

                let actionsHtml = '';
                if (opts.type === 'success' && opts.viewUrl) {
                    actionsHtml = `
                        <div class="tt-toast-actions">
                            <a href="${opts.viewUrl}" target="_blank">查看任务</a>
                        </div>
                    `;
                }

                toast.innerHTML = `
                    <div class="tt-toast-card">
                        <div class="tt-toast-body">
                            <span class="tt-toast-icon">${iconMap[opts.type] || '📌'}</span>
                            <div class="tt-toast-content">
                                <p class="tt-toast-title">${opts.title}</p>
                                <p class="tt-toast-msg">${opts.message}</p>
                            </div>
                            <button class="tt-toast-close">×</button>
                        </div>
                        ${actionsHtml}
                        <div class="tt-toast-progress"><div class="tt-toast-progress-bar"></div></div>
                    </div>
                `;

                document.body.appendChild(toast);

                // Close button
                toast.querySelector('.tt-toast-close').addEventListener('click', () => {
                    toast.style.animation = '__tt_slide_out 0.2s ease forwards';
                    setTimeout(() => toast.remove(), 200);
                });

                // Auto dismiss (not for loading state)
                if (opts.type !== 'loading') {
                    setTimeout(() => {
                        if (document.getElementById('__ticktick_clipper_toast')) {
                            toast.style.animation = '__tt_slide_out 0.2s ease forwards';
                            setTimeout(() => toast.remove(), 200);
                        }
                    }, 8000);
                }
            }
        });
    } catch (e) {
        console.error('Failed to show page toast:', e);
    }
}

/**
 * Main one-click clipping function
 * @param {chrome.tabs.Tab} tab - The active tab
 * @param {object} [contextInfo] - Context menu info (optional)
 * @param {object} [overrides] - Options for this clipping only
 */
export async function clipToTickTick(tab, contextInfo, overrides = {}) {
    const options = { ...await storage.loadOptions(), ...overrides };
    const { apiDomain, webBase, token } = await storage.getDomainConfig(options.apiDomain);

    // Check authorization
    if (!token) {
        chrome.runtime.openOptionsPage();
        return { success: false, error: '请先登录后再剪藏' };
    }

    // Build task data
    let plainTitle = options.title?.trim() || tab.title;
    const titleLabel = plainTitle.replace(/[\\[\]]/g, '\\$&');
    const taskData = {
        title: `[${titleLabel}](${tab.url})`
    };

    // Handle selected text
    if (contextInfo && contextInfo.selectionText) {
        const selectionContent = contextInfo.selectionMarkdown || contextInfo.selectionText;
        if (options.taskTitle === 'selectedText') {
            if (options.includePageContent) {
                taskData.content = `${selectionContent}\n\n# ${taskData.title}\n\n${await getTabContentAsMarkdown(tab)}`;
            } else {
                taskData.content = `${selectionContent}\n\n${taskData.title}`;
            }
        } else {
            taskData.content = selectionContent;
        }

        const selectionText = contextInfo.selectionText.replace(/\s+/g, ' ').trim();
        const titleCharacters = Array.from(selectionText);
        const selectionSummary = titleCharacters.length > 80
            ? `${titleCharacters.slice(0, 80).join('')}…`
            : selectionText;
        plainTitle = options.taskTitle === 'selectedText'
            ? selectionSummary
            : `${tab.title} · ${selectionSummary}`;
        const titleLabel = plainTitle.replace(/[\\[\]]/g, '\\$&');
        taskData.title = `[${titleLabel}](${tab.url})`;
    } else if (options.includePageContent) {
        taskData.content = await getTabContentAsMarkdown(tab);
    }

    // Due date
    const dueDateNum = Number(options.dueDate);
    if (dueDateNum !== -1) {
        const dueDate = new Date();
        dueDate.setHours(0, 0, 0, 0);
        dueDate.setTime(dueDate.getTime() + dueDateNum * 24 * 60 * 60 * 1000);
        let dateStr = dueDate.toISOString();
        dateStr = dateStr.replace('Z', '+0000');
        taskData.dueDate = dateStr;
        taskData.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        taskData.isAllDay = true;
    }

    // Target list / project
    if (options.targetListId) {
        taskData.projectId = options.targetListId;
    }

    // Priority
    if (options.taskPriority) {
        taskData.priority = Number(options.taskPriority);
    }

    // Tags
    if (options.tags) {
        const tags = options.tags
            .split(' ')
            .filter(tag => tag.trim())
            .map(tag => `#${tag.trim()}`)
            .join(' ');

        taskData.content = taskData.content
            ? `${taskData.content}\n\nTags: ${tags}`
            : `Tags: ${tags}`;
    }

    // Show loading toast
    if (options.showNotification) {
        await showPageToast(tab.id, {
            type: 'loading',
            title: '正在创建任务...',
            message: plainTitle
        });
    }

    try {
        const response = await ticktickApi.task.create(taskData, apiDomain);

        if (!response.ok) {
            if (response.status === 401) {
                await ticktickApi.logout(apiDomain);
                chrome.runtime.openOptionsPage();
                throw new Error('登录已过期，请重新登录后重试');
            }
            throw new Error(`任务创建失败: HTTP ${response.status}`);
        }

        const data = await response.json();
        // console.log('Task created:', data);

        // Show success toast with action buttons
        if (options.showNotification) {
            const viewUrl = `${webBase}/webapp/#p/${data.projectId}/tasks/${data.id}`;
            await showPageToast(tab.id, {
                type: 'success',
                title: '任务已创建',
                message: plainTitle,
                viewUrl,
                taskData: { projectId: data.projectId, id: data.id }
            });
        }

        // Auto close tab
        if (options.autoClose) {
            setTimeout(() => chrome.tabs.remove(tab.id, () => { }), 1500);
        }
        return { success: true };
    } catch (error) {
        console.error('Task creation failed:', error);

        if (options.showNotification) {
            await showPageToast(tab.id, {
                type: 'error',
                title: '任务创建失败',
                message: error.message
            });
        }
        return { success: false, error: error.message };
    }
}

/**
 * Extract selected text and Markdown from the frame where the menu was opened.
 */
export function getSelectionInfo(info, tab, callback) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
        files: ['/lib/turndown.js', '/js/selection-script.js']
    }, (response) => {
        const selection = chrome.runtime.lastError ? null : response?.[0]?.result;
        const text = selection?.text || info.selectionText;

        callback({
            text: text.replace(/(\r\n|\n|\r)/gm, '\n\n'),
            markdown: selection?.markdown || ''
        });
    });
}

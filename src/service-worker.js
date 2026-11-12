/**
 * Service Worker — Extension background entry point
 * Handles: icon click, context menus, popup toggle, message passing
 */
import { storage } from './js/store.js';
import { ticktickApi } from './js/ticktick-api.js';
import { clipToTickTick, getSelectionInfo } from './js/clipper.js';
import { t, initializeI18n, setLanguage, serviceName } from './js/i18n.js';

// ─────────────────────────────────────────
// Context Menus
// ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
    await initializeI18n();
    const options = await storage.loadOptions();
    const service = serviceName(options.apiDomain);
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        id: 'TickTickWebClipperPage',
        title: t('contextClipPage', service),
        contexts: ['page', 'frame', 'link', 'editable', 'video', 'audio', 'image']
    });
    chrome.contextMenus.create({
        id: 'TickTickWebClipperSelection',
        title: t('contextClipSelection', service),
        contexts: ['selection']
    });

    await updateExtensionUI();
});

chrome.runtime.onStartup.addListener(updateExtensionUI);

// ─────────────────────────────────────────
// Extension Icon Click
// ─────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
    await initializeI18n();
    // This only fires when popup is NOT set (usePopup = false)
    clipToTickTick(tab);
});

// ─────────────────────────────────────────
// Context Menu Click
// ─────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    await initializeI18n();
    if (info.menuItemId === 'TickTickWebClipperSelection') {
        getSelectionInfo(info, tab, (selection) => {
            info.selectionText = selection.text;
            info.selectionMarkdown = selection.markdown;
            clipToTickTick(tab, info);
        });
    } else if (info.menuItemId === 'TickTickWebClipperPage') {
        clipToTickTick(tab, info);
    }
});

// ─────────────────────────────────────────
// Message Passing (Options / Popup pages)
// ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep the message channel open for async responses
});

async function handleMessage(message, sender, sendResponse) {
    try {
        await initializeI18n();
        switch (message.type) {
            case 'login':
                const loginResult = await ticktickApi.login();
                sendResponse({ success: true, data: loginResult });
                break;

            case 'logout':
                await ticktickApi.logout();
                sendResponse({ success: true });
                break;

            case 'isLoggedIn':
                const isLoggedIn = await ticktickApi.authorized();
                sendResponse({ success: true, data: isLoggedIn });
                break;

            case 'getAccountInfo':
                const accountInfo = await ticktickApi.getAccountInfo();
                sendResponse({ success: true, data: accountInfo });
                break;

            case 'getOptions':
                const opts = await storage.loadOptions();
                sendResponse({ success: true, data: opts });
                break;

            case 'setOptions':
                if ('language' in message.payload && !['auto', 'en', 'zh_CN'].includes(message.payload.language)) {
                    throw new Error(t('invalidLanguage'));
                }
                await storage.saveOptions(message.payload);
                if ('language' in message.payload) await setLanguage(message.payload.language);
                if ('usePopup' in message.payload || 'apiDomain' in message.payload || 'language' in message.payload) {
                    await updateExtensionUI();
                }
                sendResponse({ success: true });
                break;

            case 'getProjects':
                const projects = await ticktickApi.project.list();
                sendResponse({ success: true, data: projects });
                break;

            case 'clipTab':
                const overrides = readClipOptions(message.payload);
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                sendResponse(await clipToTickTick(tab, undefined, overrides));
                break;

            default:
                console.log('Unrecognized message:', message);
                sendResponse({ success: false, error: t('unknownMessage') });
        }
    } catch (error) {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// ─────────────────────────────────────────
// Toolbar and Context Menu State
// ─────────────────────────────────────────
async function updateExtensionUI() {
    await initializeI18n();
    const options = await storage.loadOptions();
    const service = serviceName(options.apiDomain);
    await Promise.all([
        chrome.action.setPopup({ popup: options.usePopup ? 'popup/popup.html' : '' }),
        chrome.action.setTitle({ title: t('actionTitleService', service) }),
        chrome.contextMenus.update('TickTickWebClipperPage', { title: t('contextClipPage', service) }),
        chrome.contextMenus.update('TickTickWebClipperSelection', { title: t('contextClipSelection', service) })
    ]);
}

function readClipOptions(payload) {
    if (!payload || typeof payload.title !== 'string' || typeof payload.targetListId !== 'string'
        || ![0, 1, 3, 5].includes(payload.taskPriority)
        || ![-1, 0, 1, 2, 7].includes(payload.dueDate)
        || typeof payload.includePageContent !== 'boolean') {
        throw new Error(t('invalidClipOptions'));
    }
    return {
        title: payload.title,
        targetListId: payload.targetListId,
        taskPriority: payload.taskPriority,
        dueDate: payload.dueDate,
        includePageContent: payload.includePageContent
    };
}

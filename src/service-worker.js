/**
 * Service Worker — Extension background entry point
 * Handles: icon click, context menus, popup toggle, message passing
 */
import { storage } from './js/store.js';
import { ticktickApi } from './js/ticktick-api.js';
import { clipToTickTick, getSelectionInfo } from './js/clipper.js';

// ─────────────────────────────────────────
// Context Menus
// ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'TickTickWebClipperPage',
        title: '发送页面到滴答清单',
        contexts: ['page', 'frame', 'link', 'editable', 'video', 'audio', 'image']
    });
    chrome.contextMenus.create({
        id: 'TickTickWebClipperSelection',
        title: '发送选中内容到滴答清单',
        contexts: ['selection']
    });

    // Initialize popup state based on stored settings
    updatePopupState();
});

// ─────────────────────────────────────────
// Extension Icon Click
// ─────────────────────────────────────────
chrome.action.onClicked.addListener((tab) => {
    // This only fires when popup is NOT set (usePopup = false)
    clipToTickTick(tab);
});

// ─────────────────────────────────────────
// Context Menu Click
// ─────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'TickTickWebClipperSelection') {
        getSelectionInfo(info, tab, (selection) => {
            info.selectionText = selection;
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

            case 'getOptions':
                const opts = await storage.loadOptions();
                sendResponse({ success: true, data: opts });
                break;

            case 'setOptions':
                await storage.set(message.payload);
                // Update popup state when usePopup setting changes
                if ('usePopup' in message.payload) {
                    updatePopupState();
                }
                sendResponse({ success: true });
                break;

            case 'getProjects':
                const projects = await ticktickApi.project.list();
                sendResponse({ success: true, data: projects });
                break;

            case 'clipTab':
                // From popup: clip the specified tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await clipToTickTick(tab);
                sendResponse({ success: true });
                break;

            default:
                console.log('Unrecognized message:', message);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// ─────────────────────────────────────────
// Popup State Management
// ─────────────────────────────────────────
async function updatePopupState() {
    const options = await storage.loadOptions();
    if (options.usePopup) {
        chrome.action.setPopup({ popup: 'popup/popup.html' });
    } else {
        chrome.action.setPopup({ popup: '' });
    }
}

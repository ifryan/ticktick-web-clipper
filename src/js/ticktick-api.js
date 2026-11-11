/**
 * TickTick / Dida365 Open API Wrapper
 * Supports both international (ticktick.com) and Chinese (dida365.com) versions
 * OAuth2 Authorization Code Flow with PKCE via chrome.identity
 */
import { storage } from './store.js';

export const ticktickApi = {

    /**
     * Check if user has a valid access token
     */
    async authorized() {
        const { token } = await storage.getDomainConfig();
        return !!token;
    },

    /**
     * Generic REST API call with Bearer token
     */
    async rest(method, path, data, apiDomain) {
        const { token, apiBase } = await storage.getDomainConfig(apiDomain);

        const config = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${apiBase}/${path}`, config);
        return response;
    },

    /**
     * Task operations
     */
    task: {
        create(data, apiDomain) {
            return ticktickApi.rest('POST', 'task', data, apiDomain);
        },
        delete(projectId, taskId) {
            return ticktickApi.rest('DELETE', `project/${projectId}/task/${taskId}`);
        }
    },

    /**
     * Project / List operations
     */
    project: {
        async list() {
            const response = await ticktickApi.rest('GET', 'project');
            if (response.ok) {
                return response.json();
            }
            throw new Error(`Failed to fetch projects: ${response.status}`);
        }
    },

    /**
     * Logout: clear stored token
     */
    async logout(apiDomain) {
        const domain = apiDomain ?? (await storage.loadOptions()).apiDomain;
        await storage.remove(`${domain}.token`);
        try {
            chrome.identity.clearAllCachedAuthTokens(() => { });
        } catch (e) {
            console.log('clearAllCachedAuthTokens error:', e);
        }
    },

    /**
     * Login: OAuth2 Authorization Code Flow with S256 PKCE
     */
    async login() {
        const { apiDomain, oauthBase, clientId } = await storage.getDomainConfig();

        if (!clientId) {
            throw new Error('当前服务版本尚未配置授权应用，请在高级授权设置中填写 Client ID');
        }

        const redirectUri = chrome.identity.getRedirectURL();
        const scope = 'tasks:read tasks:write';
        const state = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
        const { codeVerifier, codeChallenge } = await createPkceParameters();

        const authURL = new URL(`${oauthBase}/authorize`);
        authURL.searchParams.append('client_id', clientId);
        authURL.searchParams.append('scope', scope);
        authURL.searchParams.append('state', state);
        authURL.searchParams.append('redirect_uri', redirectUri);
        authURL.searchParams.append('response_type', 'code');
        authURL.searchParams.append('code_challenge', codeChallenge);
        authURL.searchParams.append('code_challenge_method', 'S256');

        const responseUrl = await launchAuthorization(authURL.href);
        const authCode = getAuthorizationCode(responseUrl, redirectUri, state);
        const tokenParams = new URLSearchParams({
            client_id: clientId,
            code: authCode,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
            scope,
            redirect_uri: redirectUri
        });
        const tokenData = await requestAccessToken(oauthBase, tokenParams);

        await storage.set({ [`${apiDomain}.token`]: tokenData.access_token });
        return tokenData;
    }
};

function toBase64Url(bytes) {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function createPkceParameters() {
    const codeVerifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return {
        codeVerifier,
        codeChallenge: toBase64Url(new Uint8Array(digest))
    };
}

function launchAuthorization(url) {
    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(responseUrl);
        });
    });
}

function getAuthorizationCode(responseUrl, redirectUri, state) {
    if (!responseUrl) {
        throw new Error('授权被取消');
    }

    const response = new URL(responseUrl);
    const expected = new URL(redirectUri);
    if (response.origin !== expected.origin || response.pathname !== expected.pathname) {
        throw new Error('授权回调地址不匹配，请重新登录');
    }
    if (response.searchParams.get('state') !== state) {
        throw new Error('授权校验失败，请重新登录');
    }

    const error = response.searchParams.get('error');
    if (error) {
        throw new Error(error === 'access_denied' ? '授权被取消' : `授权失败: ${error}`);
    }

    const authCode = response.searchParams.get('code');
    if (!authCode) {
        throw new Error('未获取到授权码');
    }
    return authCode;
}

async function requestAccessToken(oauthBase, tokenParams) {
    const response = await fetch(`${oauthBase}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
    });
    const tokenData = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = tokenData?.error_description || tokenData?.error || response.statusText;
        throw new Error(`PKCE Token 获取失败: HTTP ${response.status} ${detail}`);
    }
    if (typeof tokenData?.access_token !== 'string' || !tokenData.access_token.trim()) {
        throw new Error('授权响应未包含有效的访问令牌');
    }
    return tokenData;
}

/**
 * TickTick / Dida365 Open API Wrapper
 * Supports both international (ticktick.com) and Chinese (dida365.com) versions
 * OAuth2 Authorization Code Flow via chrome.identity
 */
import { storage } from './store.js';

export const ticktickApi = {

    /**
     * Check if user has a valid access token
     */
    async authorized() {
        const { token } = await storage.get('token');
        return !!token;
    },

    /**
     * Generic REST API call with Bearer token
     */
    async rest(method, path, data) {
        const { token } = await storage.get('token');
        const { apiBase } = await storage.getDomainConfig();

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
        create(data) {
            return ticktickApi.rest('POST', 'task', data);
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
    async logout() {
        await storage.remove('token');
        try {
            chrome.identity.clearAllCachedAuthTokens(() => { });
        } catch (e) {
            console.log('clearAllCachedAuthTokens error:', e);
        }
    },

    /**
     * Login: OAuth2 Authorization Code Flow
     */
    async login() {
        const options = await storage.loadOptions();
        const { clientId, clientSecret } = options;

        if (!clientId || !clientSecret) {
            throw new Error('请先在设置页面填写 Client ID 和 Client Secret');
        }

        const { oauthBase } = await storage.getDomainConfig();
        const redirectUri = chrome.identity.getRedirectURL();
        const scope = 'tasks:read tasks:write';

        const authURL = new URL(`${oauthBase}/authorize`);
        authURL.searchParams.append('client_id', clientId);
        authURL.searchParams.append('scope', scope);
        authURL.searchParams.append('state', '');
        authURL.searchParams.append('redirect_uri', redirectUri);
        authURL.searchParams.append('response_type', 'code');

        console.log('Auth URL:', authURL.href);

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                { url: authURL.href, interactive: true },
                async (responseUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (!responseUrl) {
                        reject(new Error('授权被取消'));
                        return;
                    }

                    try {
                        const response = new URL(responseUrl);
                        const authCode = response.searchParams.get('code');

                        if (!authCode) {
                            reject(new Error('未获取到授权码'));
                            return;
                        }

                        console.log('Auth Code:', authCode);

                        // Exchange code for token
                        const tokenParams = new URLSearchParams({
                            client_id: clientId,
                            client_secret: clientSecret,
                            code: authCode,
                            grant_type: 'authorization_code',
                            scope,
                            redirect_uri: redirectUri
                        });

                        const tokenResponse = await fetch(`${oauthBase}/token`, {
                            method: 'POST',
                            body: tokenParams
                        });

                        if (!tokenResponse.ok) {
                            const errorText = await tokenResponse.text();
                            reject(new Error(`Token 获取失败: ${tokenResponse.status} ${errorText}`));
                            return;
                        }

                        const tokenData = await tokenResponse.json();
                        console.log('Token obtained successfully');

                        await storage.set({ token: tokenData.access_token });
                        resolve(tokenData);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }
};

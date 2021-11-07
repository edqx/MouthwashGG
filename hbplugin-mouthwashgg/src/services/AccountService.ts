import { Connection } from "@skeldjs/hindenburg";
import got from "got";

import {
    GenericCacheData,
    GenericResponse,
    UserAccountModel,
    UserSessionModel
} from "hbplugin-mouthwashgg-api";

import { MouthwashPlugin } from "../plugin";

export class AccountService {
    static baseUrl = process.env.MWGG_ACCOUNT_SERVER_BASE_URL;
    static internalAccessKey = process.env.MWGG_ACCOUNT_SERVER_INTERNAL_ACCESS_KEY;

    static requestCache: Map<string, GenericCacheData<any>> = new Map;

    requests: typeof got;

    connectionSessions: WeakMap<Connection, UserSessionModel>;
    connectionUsers: WeakMap<Connection, UserAccountModel>;
    isEnabled: boolean;

    constructor(public readonly plugin: MouthwashPlugin) {
        this.requests = got.extend({ url: AccountService.baseUrl });
        this.connectionSessions = new WeakMap;
        this.connectionUsers = new WeakMap;

        this.isEnabled = true;
        if (!AccountService.baseUrl) {
            plugin.logger.warn("No account server base url; disabling account service.");
            this.isEnabled = false;
        }
        if (!AccountService.internalAccessKey) {
            plugin.logger.warn("No account server internal access key; disabling account service.");
            this.isEnabled = false;
        }
    }

    private setCached(key: string, data: any, expiry: number) {
        AccountService.requestCache.set(key, {
            expiresAt: Date.now() + expiry * 1000,
            data
        });
    }

    private getCached<T>(key: string): T|undefined {
        const cachedItem = AccountService.requestCache.get(key);

        if (!cachedItem) {
            return undefined;
        }

        if (Date.now() > cachedItem.expiresAt) {
            AccountService.requestCache.delete(key);
            return undefined;
        }

        return cachedItem.data as T;
    }

    async make<T>(method: "get"|"post"|"put"|"delete"|"patch", path: string, cacheExpiry: number, body?: any): Promise<GenericResponse<T>> {
        if (cacheExpiry > 0) {
            const cachedRequest = this.getCached<GenericResponse<T>>(method + " " + path);
            if (cachedRequest) {
                return cachedRequest;
            }
        }

        const res = await this.requests[method](AccountService.baseUrl + path, {
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                "Authorization": "Bearer " + AccountService.internalAccessKey,
                "Content-Type": "application/json"
            }
        }).json<GenericResponse<T>>();

        if (!res.success) {
            this.plugin.logger.warn("%s %s: (%s)", method.toUpperCase(), path, res.code);
        }

        this.setCached(method + " " + path, res, cacheExpiry);
        return res;
    }

    async getUser(clientId: string) {
        if (!this.isEnabled)
            return undefined;

        const res = await this.make<UserAccountModel>("get", "/api/v1/internal/users/" + clientId, 30);

        if (res.success) {
            return res.data;
        }

        return undefined;
    }

    async getConnectionUser(connection: Connection) {
        const cachedUser = this.connectionUsers.get(connection);

        if (!cachedUser) {
            const cachedSession = this.connectionSessions.get(connection);
            if (!cachedSession)
                return undefined;

            const user = await this.getUser(cachedSession.client_id);
            if (!user) {
                return undefined;
            }

            this.connectionUsers.set(connection, user);
            return user;
        }

        return cachedUser;
    }

    async getSession(clientId: string, ipAddress: string) {
        if (!this.isEnabled)
            return undefined;

        const res = await this.make<UserSessionModel>("get", "/api/v1/internal/users/" + clientId + "/sessions/" + ipAddress, 30);

        if (res.success) {
            return res.data;
        }

        return undefined;
    }

    async updateUserSettings(clientId: string, gameSettings: any) {
        if (!this.isEnabled)
            return;

        await this.make("put", "/api/v1/internal/users/" + clientId + "/game_settings", 0, {
            game_settings: gameSettings
        });
        const userRequestCache = this.getCached<GenericResponse<UserAccountModel>>("get /api/v1/internal/users/" + clientId);
        if (userRequestCache?.success) {
            userRequestCache.data.game_settings = gameSettings;
        }
    }
}
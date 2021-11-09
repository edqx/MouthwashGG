import {
    Connection,
    HindenburgPlugin,
    Worker,
    WorkerPlugin
} from "@skeldjs/hindenburg";

import got from "got";

export interface UserAccountModel {
    client_id: string;
    client_token: string;
    email: string;
    display_name: string;
    created_at: string;
    banned_until: string|null;
    muted_until: string|null;
    game_settings: any;
}

export interface UserSessionModel {
    client_id: string;
    client_token: string;
    ip: string;
}

export interface GenericCacheData<T> {
    expiresAt: number;
    data: T;
}

export type GenericResponse<T> = {
    success: true,
    data: T
} | {
    success: undefined;
    code: number;
    message: string;
    details: string;
}

export interface MouthwashAuthPluginConfig {
    baseUrl: string;
}

@HindenburgPlugin("hbplugin-mouthwashgg-auth", "1.0.0", "first")
export class MouthwashAuthPlugin extends WorkerPlugin {
    internalAccessKey: string;

    userCache: Map<string, GenericCacheData<UserAccountModel>>;
    sessionCache: Map<string, GenericCacheData<UserSessionModel>>;

    connectionSessionCache: WeakMap<Connection, UserSessionModel>;
    connectionUserCache: WeakMap<Connection, UserAccountModel>;

    constructor(
        public readonly worker: Worker,
        public readonly config: MouthwashAuthPluginConfig
    ) {
        super(worker, config);

        this.internalAccessKey = process.env.MWGG_ACCOUNT_SERVER_INTERNAL_ACCESS_KEY || "";

        this.userCache = new Map;
        this.sessionCache = new Map;

        this.connectionSessionCache = new WeakMap;
        this.connectionUserCache = new WeakMap;
    }

    private getCached<K, T>(cache: Map<T, GenericCacheData<K>>, key: T) {
        const cachedData = cache.get(key);
        if (!cachedData)
            return undefined;

        if (Date.now() > cachedData.expiresAt) {
            cache.delete(key);
            return undefined;
        }

        return cachedData.data;
    }

    private setCached<K, T>(cache: Map<T, GenericCacheData<K>>, key: T, data: K, expiry: number) {
        cache.set(key, {
            expiresAt: Date.now() + expiry * 1000,
            data
        });
    }

    get baseUrl() {
        return this.config.baseUrl || "http://localhost:8000";
    }

    async make<T>(method: "get"|"post"|"put"|"delete"|"patch", path: string, cacheExpiry: number, body?: any): Promise<GenericResponse<T>> {
        const res = await got[method](this.baseUrl + path, {
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                "Authorization": this.internalAccessKey
                    ? "Bearer " + this.internalAccessKey
                    : undefined,
                "Content-Type": "application/json"
            }
        }).json<GenericResponse<T>>();

        if (!res.success) {
            this.logger.warn("%s %s: (%s)", method.toUpperCase(), path, res.code);
        }

        return res;
    }

    async getUser(clientId: string) {
        const cachedUser = this.getCached(this.userCache, clientId);
        if (cachedUser) {
            return cachedUser;
        }

        const res = await this.make<UserAccountModel>("get", "/api/v1/internal/users/" + clientId, 30);

        if (res.success) {
            this.setCached(this.userCache, clientId, res.data, 30);
            return res.data;
        }

        return undefined;
    }

    async getConnectionUser(connection: Connection) {
        const cachedUser = this.connectionUserCache.get(connection);

        if (!cachedUser) {
            const cachedSession = this.connectionSessionCache.get(connection);
            if (!cachedSession)
                return undefined;

            const user = await this.getUser(cachedSession.client_id);
            if (!user) {
                return undefined;
            }

            this.connectionUserCache.set(connection, user);
            return user;
        }

        return cachedUser;
    }

    async getSession(clientId: string, ipAddress: string) {
        const cachedSession = this.getCached(this.sessionCache, clientId + ":" + ipAddress);

        if (cachedSession) {
            return cachedSession;
        }

        const res = await this.make<UserSessionModel>("get", "/api/v1/internal/users/" + clientId + "/sessions/" + ipAddress, 30);

        if (res.success) {
            this.setCached(this.sessionCache, clientId, res.data, 30);
            return res.data;
        }

        return undefined;
    }

    async updateUserSettings(clientId: string, gameSettings: any) {
        await this.make("put", "/api/v1/internal/users/" + clientId + "/game_settings", 0, {
            game_settings: gameSettings
        });
        const cachedUser = this.getCached(this.userCache, clientId);
        if (cachedUser) {
            cachedUser.game_settings = gameSettings;
        }
    }
}
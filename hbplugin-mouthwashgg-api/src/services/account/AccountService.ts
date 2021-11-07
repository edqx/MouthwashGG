import { Connection, WorkerPlugin } from "@skeldjs/hindenburg";
import { MouthwashApiPlugin } from "../../plugin";

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

interface MouthwashPlugin extends WorkerPlugin {
    accountService: AccountService;
}

export class AccountService {
    private actualService: AccountService;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.actualService = (plugin.worker.loadedPlugins.get("hbplugin-mouthwashgg") as MouthwashPlugin)?.accountService;
    }

    async make<T>(method: "get"|"post"|"put"|"delete"|"patch", path: string, cacheExpiry: number, body?: any): Promise<GenericResponse<T>> {
        return this.actualService.make(method, path, cacheExpiry, body);
    }

    async getUser(clientId: string): Promise<UserAccountModel|undefined> {
        return this.actualService.getUser(clientId);
    }

    async getConnectionUser(connection: Connection): Promise<UserAccountModel|undefined> {
        return this.actualService.getConnectionUser(connection);
    }

    async getSession(clientId: string, ipAddress: string): Promise<UserSessionModel|undefined> {
        return this.actualService.getSession(clientId, ipAddress);
    }

    async updateUserSettings(clientId: string, gameSettings: any): Promise<void> {
        await this.actualService.updateUserSettings(clientId, gameSettings);
    }
}
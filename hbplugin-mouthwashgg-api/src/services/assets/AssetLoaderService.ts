import { ClientDisconnectEvent, Connection, ReliablePacket } from "@skeldjs/hindenburg";
import { FetchResourceMessage, FetchResponseType, ResourceType } from "mouthwash-types";

import { ClientFetchResourceResponseEvent } from "../..";
import { MouthwashApiPlugin } from "../../plugin";
import { AssetBundle } from "./AssetBundle";

export class AssetLoaderService {
    globalAssets?: AssetBundle;
    
    loadedBundles: WeakMap<Connection, Map<string, AssetBundle>>;
    waitingFor: WeakMap<Connection, Map<number, AssetBundle>>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.loadedBundles = new WeakMap;
        this.waitingFor = new WeakMap;
    }

    async loadGlobalAsset() {
        this.globalAssets = await AssetBundle.loadFromUrl("PggResources/Global", false);
    }

    async getLoadedBundles(connection: Connection) {
        return this.loadedBundles.get(connection);
    }

    getWaitingFor(connection: Connection) {
        const cachedWaitingFor = this.waitingFor.get(connection);
        const waitingFor: Map<number, AssetBundle> = cachedWaitingFor || new Map;

        if (!cachedWaitingFor) {
            this.waitingFor.set(connection, waitingFor);
        }

        return waitingFor;
    }

    async loadOnAll(assetBundle: AssetBundle) {
        const promises = [];
        for (const [ , connection ] of this.plugin.room.connections) {
            promises.push(this.loadForConnection(connection, assetBundle));
        }
        await Promise.all(promises);
    }

    async loadForConnection(connection: Connection, assetBundle: AssetBundle) {
        if (this.getWaitingFor(connection).has(assetBundle.bundleId))
            return;

        await connection.sendPacket(
            new ReliablePacket(
                connection.getNextNonce(),
                [
                    new FetchResourceMessage(
                        assetBundle.bundleId,
                        assetBundle.url,
                        assetBundle.fileHash,
                        ResourceType.AssetBundle
                    )
                ]
            )
        );

        this.getWaitingFor(connection).set(assetBundle.bundleId, assetBundle);
    }

    onLoaded(connection: Connection, assetBundle: AssetBundle) {
        const waitingFor = this.getWaitingFor(connection);
        waitingFor.delete(assetBundle.bundleId);

        if (waitingFor.size === 0) {
            this.waitingFor.delete(connection);
        }

        this.plugin.logger.info("Loaded asset bundle %s for %s",
            assetBundle.url, connection);
    }

    waitForLoaded(connection: Connection, assetBundle: AssetBundle, timeout = 60000) {
        return new Promise<void>((resolve, reject) => {
            const plugin = this.plugin;

            const sleep = setTimeout(() => {
                reject(new Error("Asset bundle download timed out"));
                plugin.room.off("mwgg.client.fetchresponse", onFetchResponse);
                plugin.worker.off("client.disconnect", onClientDisconnect);
            }, timeout);
            
            function onFetchResponse(ev: ClientFetchResourceResponseEvent) {
                if (ev.client === connection && ev.response.responseType === FetchResponseType.Ended && ev.resourceId === assetBundle.bundleId) {
                    clearTimeout(sleep);
                    plugin.room.off("mwgg.client.fetchresponse", onFetchResponse);
                    plugin.worker.off("client.disconnect", onClientDisconnect);
                    resolve();
                }
            }

            function onClientDisconnect(ev: ClientDisconnectEvent) {
                if (ev.client === connection) {
                    clearTimeout(sleep);
                    plugin.room.off("mwgg.client.fetchresponse", onFetchResponse);
                    plugin.worker.off("client.disconnect", onClientDisconnect);
                    reject(new Error("Client disconnected"));
                }
            }
    
            plugin.room.on("mwgg.client.fetchresponse", onFetchResponse);
            plugin.worker.on("client.disconnect", onClientDisconnect);
        });
    }
}
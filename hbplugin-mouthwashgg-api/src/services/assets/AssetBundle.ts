import { AssetType, AudioType } from "mouthwash-types";
import got from "got";

export interface GetAssetBundleDeclarationResponse {
    assetBundleId: number;
    hash: string;
    assets: ({
        id: number;
        path: string;
        type: AssetType.Audio;
        details: {
            audioType: AudioType;
            sampleRate: number;
            samples: number
        };
    }|{
        id: number;
        path: string;
        type: AssetType.Other;
    })[];
}

export class BaseAsset {
    constructor(
        public readonly assetId: number,
        public readonly bundlePath: string,
        public readonly assetType: AssetType
    ) {}
}

export class OtherAsset extends BaseAsset {
    assetType = AssetType.Other as const;

    constructor(
        public readonly assetId: number,
        public readonly bundlePath: string
    ) {
        super(assetId, bundlePath, AssetType.Other);
    }
}

export class AudioAsset extends BaseAsset {
    assetType = AssetType.Audio as const;

    constructor(
        public readonly assetId: number,
        public readonly bundlePath: string,
        public readonly audioType: AudioType,
        public readonly sampleRate: number,
        public readonly samples: number
    ) {
        super(assetId, bundlePath, AssetType.Audio);
    }
}

export type Asset = OtherAsset|AudioAsset;

export class AssetReference {
    constructor(
        public readonly bundleLocation: string,
        public readonly assetPath: string
    ) {}
}

const baseUrl = "https://mouthwash-asset-server.fra1.digitaloceanspaces.com/";

export class AssetBundle {
    static cachedBundles: Map<string, AssetBundle> = new Map;
    assets: Map<string, Asset>;

    constructor(
        public readonly url: string,
        public readonly fileHash: Buffer,
        public readonly bundleId: number
    ) {
        this.assets = new Map;
    }

    static async loadFromUrl(location: string, updateCache: boolean) {
        const cachedBundle = this.cachedBundles.get(location);
        if (cachedBundle && !updateCache) {
            return cachedBundle;
        }

        const response = await got.get(baseUrl + location + ".json")
            .json<GetAssetBundleDeclarationResponse>();

        const assetBundle = new AssetBundle(baseUrl + location, Buffer.from(response.hash, "hex"), response.assetBundleId);

        for (let i = 0; i < response.assets.length; i++) {
            const asset = response.assets[i];
            if (asset.type === AssetType.Audio) {
                assetBundle.assets.set(
                    asset.path,
                    new AudioAsset(
                        assetBundle.bundleId + 1 + i,
                        asset.path,
                        asset.details.audioType,
                        asset.details.sampleRate,
                        asset.details.samples
                    )
                );
            } else {
                assetBundle.assets.set(
                    asset.path,
                    new OtherAsset(
                        assetBundle.bundleId + 1 + i,
                        asset.path
                    )
                );
            }
        }

        this.cachedBundles.set(location, assetBundle);
        return assetBundle;
    }

    static loadfromCacheSafe(location: string) {
        const cachedBundle = this.cachedBundles.get(location);

        if (!cachedBundle) {
            throw new Error("Bundle was asserted to be cached, but was not: " + location);
        }

        return cachedBundle;
    }

    getAssetSafe(path: string) {
        const asset = this.assets.get(path);

        if (!asset)
            throw new Error("Asset was asserted to be loaded, but was not: " + path);

        return asset;
    }
}
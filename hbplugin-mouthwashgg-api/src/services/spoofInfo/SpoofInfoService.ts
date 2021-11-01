import { PlayerData, Room } from "@skeldjs/hindenburg";

export class SpoofedInfo {
    constructor(
        public readonly player: PlayerData<Room>,
        public isDead: boolean
    ) {}
}

export class SpoofInfoService {
    spoofedInfo: WeakMap<PlayerData<Room>, SpoofedInfo>;

    constructor() {
        this.spoofedInfo = new WeakMap;
    }

    setDead(player: PlayerData<Room>) {
        const cachedInfo = this.spoofedInfo.get(player);
        const spoofedInfo = cachedInfo || new SpoofedInfo(player, player.info?.isDead || false);

        if (!cachedInfo) {
            this.spoofedInfo.set(player, spoofedInfo);
        }

        return spoofedInfo;
    }

    isDead(player: PlayerData<Room>) {
        if (player.info?.isDead) {
            return true;
        }

        return this.spoofedInfo.get(player)?.isDead || false;
    }
}
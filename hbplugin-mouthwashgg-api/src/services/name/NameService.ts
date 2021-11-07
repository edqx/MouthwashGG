import {
    GameDataMessage,
    PlayerData,
    ReliablePacket,
    RpcMessage,
    SetNameMessage
} from "@skeldjs/hindenburg";

import { RGBA } from "mouthwash-types";
import { MouthwashApiPlugin } from "../../plugin";
import { Emoji } from "../emojis";

export type NameTransform = (name: string) => string;

export class PlayerNameManager {
    emojis: Set<Emoji>;
    colors: Set<RGBA>;
    nameTransforms: Set<NameTransform>;

    constructor(
        public readonly player: PlayerData
    ) {
        this.emojis = new Set;
        this.colors = new Set;
        this.nameTransforms = new Set;
    }

    getName(): string {
        let originalName = this.player.info?.name ?? "???";
        
        for (const nameTransform of this.nameTransforms) {
            originalName = nameTransform(originalName);
        }
        
        for (const color of this.colors) {
            originalName = color.text(originalName);
        }
        
        for (const emoji of this.emojis) {
            originalName = emoji.toString() + " " + originalName;
        }

        return originalName;
    }
}

export class PlayerNameManagerPov extends PlayerNameManager {
    constructor(
        public readonly player: PlayerData,
        public readonly perspective: PlayerNamesPerspective,
        public readonly base: PlayerNameManager
    ) {
        super(player);
    }

    getName() {
        let originalName = this.player.info?.name ?? "???";
        
        for (const nameTransform of this.base.nameTransforms) {
            originalName = nameTransform(originalName);
        }
        
        for (const nameTransform of this.nameTransforms) {
            originalName = nameTransform(originalName);
        }
        
        for (const color of this.base.colors) {
            originalName = color.text(originalName);
        }
        
        for (const color of this.colors) {
            originalName = color.text(originalName);
        }
        
        for (const emoji of this.base.emojis) {
            originalName = emoji.toString() + " " + originalName;
        }
        
        for (const emoji of this.emojis) {
            originalName = emoji.toString() + " " + originalName;
        }

        return originalName;
    }
}

export class PlayerNamesPerspective {
    playerNames: WeakMap<PlayerData, PlayerNameManagerPov>;

    constructor(
        public readonly player: PlayerData
    ) {
        this.playerNames = new WeakMap;
    }
}

export class NameService {
    nameManagers: WeakMap<PlayerData, PlayerNameManager>;
    playerPerspectives: WeakMap<PlayerData, PlayerNamesPerspective>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.nameManagers = new WeakMap;
        this.playerPerspectives = new WeakMap;
    }

    private getNameManager(player: PlayerData) {
        const cachedManager = this.nameManagers.get(player);
        const nameManager = cachedManager || new PlayerNameManager(player);

        if (!cachedManager) {
            this.nameManagers.set(player, nameManager);
        }

        return nameManager;
    }

    private getPerspectiveNameManager(fromPov: PlayerData, player: PlayerData) {
        const perspective = this.getPerspective(fromPov);
        const baseNameManager = this.getNameManager(player);
        const cachedManager = perspective.playerNames.get(player);
        const nameManager = cachedManager || new PlayerNameManagerPov(player, perspective, baseNameManager);

        if (!cachedManager) {
            perspective.playerNames.set(player, nameManager);
        }

        return nameManager;
    }

    getPerspective(player: PlayerData) {
        const cachedPerspective = this.playerPerspectives.get(player);
        const perspective = cachedPerspective || new PlayerNamesPerspective(player);

        if (!cachedPerspective) {
            this.playerPerspectives.set(player, perspective);
        }

        return perspective;
    }

    async _updateName(setFor: PlayerData, player: PlayerData, name: string) {
        const playerControl = player.control;

        if (!playerControl)
            return;

        const connection = this.plugin.room.connections.get(setFor.clientId);
        if (connection) {
            await connection.sendPacket(
                new ReliablePacket(
                    connection.getNextNonce(),
                    [
                        new GameDataMessage(
                            this.plugin.room.code,
                            [
                                new RpcMessage(
                                    playerControl.netId,
                                    new SetNameMessage(name)
                                )
                            ]
                        )
                    ]
                )
            );
        }
    }

    async updateName(nameManager: PlayerNameManager) {
        const playerControl = nameManager.player.control;

        if (!nameManager || !playerControl)
            return;

        if (nameManager instanceof PlayerNameManagerPov) {
            const connection = this.plugin.room.connections.get(nameManager.perspective.player.clientId);
            if (connection) {
                await this.plugin.room.broadcastMessages([
                    new RpcMessage(
                        playerControl.netId,
                        new SetNameMessage(nameManager.getName())
                    )
                ], undefined, [ connection ]);
            }
            return;
        }

        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            const perspective = this.playerPerspectives.get(player);
            if (perspective) {
                const povNameManager = perspective.playerNames.get(nameManager.player);
                if (povNameManager) {
                    promises.push(this._updateName(perspective.player, povNameManager.player, povNameManager.getName()));
                    continue;
                }
            }

            promises.push(this._updateName(player, nameManager.player, nameManager.getName()));
        }
        await Promise.all(promises);
    }

    async updateAllNames() {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            const nameManager = this.nameManagers.get(player);
    
            if (!nameManager) {
                for (const [ , fromPov ] of this.plugin.room.players) {
                    const perspective = this.playerPerspectives.get(fromPov);
                    if (perspective) {
                        const povNameManager = perspective.playerNames.get(player);
                        if (povNameManager) {
                            promises.push(this._updateName(perspective.player, povNameManager.player, povNameManager.getName()));
                            continue;
                        }
                    }
        
                    promises.push(this._updateName(fromPov, player, player.info?.name ?? "???"));
                }
                continue;
            }

            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    async updateNamesFor(fromPov: PlayerData) {
        const promises = [];
        const perspective = this.playerPerspectives.get(fromPov);
        for (const [ , player ] of this.plugin.room.players) {
            const nameManager = this.nameManagers.get(player);
    
            if (!nameManager) {
                if (perspective) {
                    const povNameManager = perspective.playerNames.get(player);
                    if (povNameManager) {
                        promises.push(this._updateName(perspective.player, povNameManager.player, povNameManager.getName()));
                        continue;
                    }
                }
    
                promises.push(this._updateName(fromPov, player, player.info?.name ?? "???"));
                continue;
            }

            promises.push(this._updateName(fromPov, player, nameManager.getName()));
        }
        await Promise.all(promises);
    }

    async addEmoji(player: PlayerData, emoji: Emoji) {
        const nameManager = this.getNameManager(player);
        nameManager.emojis.add(emoji);
        await this.updateName(nameManager);
    }

    async addEmojiFor(player: PlayerData, emoji: Emoji, players: PlayerData[]) {
        const promises = [];
        for (const fromPov of players) {
            const nameManager = this.getPerspectiveNameManager(fromPov, player);
            nameManager.emojis.add(emoji);
            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    async removeEmoji(player: PlayerData, emoji: Emoji) {
        const nameManager = this.getNameManager(player);
        nameManager.emojis.delete(emoji);
        await this.updateName(nameManager);
    }

    async removeEmojiFor(player: PlayerData, emoji: Emoji, players: PlayerData[]) {
        const promises = [];
        for (const fromPov of players) {
            const nameManager = this.getPerspectiveNameManager(fromPov, player);
            nameManager.emojis.delete(emoji);
            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    async addColor(player: PlayerData, color: RGBA) {
        const nameManager = this.getNameManager(player);
        nameManager.colors.add(color);
        await this.updateName(nameManager);
    }

    async addColorFor(player: PlayerData, color: RGBA, players: PlayerData[]) {
        const promises = [];
        for (const fromPov of players) {
            const nameManager = this.getPerspectiveNameManager(fromPov, player);
            nameManager.colors.add(color);
            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    async removeColor(player: PlayerData, color: RGBA) {
        const nameManager = this.getNameManager(player);
        nameManager.colors.delete(color);
        await this.updateName(nameManager);
    }

    async removeColorFor(player: PlayerData, color: RGBA, players: PlayerData[]) {
        const promises = [];
        for (const fromPov of players) {
            const nameManager = this.getPerspectiveNameManager(fromPov, player);
            nameManager.colors.delete(color);
            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    async addNameTransform(player: PlayerData, transform: NameTransform) {
        const nameManager = this.getNameManager(player);
        nameManager.nameTransforms.add(transform);
        await this.updateName(nameManager);
    }

    async addNameTransformFor(player: PlayerData, transform: NameTransform, players: PlayerData[]) {
        const promises = [];
        for (const fromPov of players) {
            const nameManager = this.getPerspectiveNameManager(fromPov, player);
            nameManager.nameTransforms.add(transform);
            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    async removeNameTransform(player: PlayerData, transform: NameTransform) {
        const nameManager = this.getNameManager(player);
        nameManager.nameTransforms.delete(transform);
        await this.updateName(nameManager);
    }

    async removeNameTransformFor(player: PlayerData, transform: NameTransform, players: PlayerData[]) {
        const promises = [];
        for (const fromPov of players) {
            const nameManager = this.getPerspectiveNameManager(fromPov, player);
            nameManager.nameTransforms.delete(transform);
            promises.push(this.updateName(nameManager));
        }
        await Promise.all(promises);
    }

    getPlayerName(player: PlayerData, fromPov?: PlayerData) {
        const perspective = fromPov
            ? this.playerPerspectives.get(fromPov)
            : undefined;

        const povNameManager = perspective && perspective.playerNames.get(player);
        const nameManager = povNameManager || this.nameManagers.get(player);

        return nameManager?.getName()
            ?? player.info?.name
            ?? "???";
    }

    async resetAllNames() {
        for (const [ , player ] of this.plugin.room.players) {
            this.playerPerspectives.delete(player);
            this.nameManagers.delete(player);
        }
        await this.updateAllNames();
    }

    async resetName(player: PlayerData) {
        for (const [ , player ] of this.plugin.room.players) {
            const perspective = this.playerPerspectives.get(player);
            if (perspective) {
                perspective.playerNames.delete(player);
            }
        }
        this.nameManagers.delete(player);
        await this.updateName(this.getNameManager(player));
    }
}
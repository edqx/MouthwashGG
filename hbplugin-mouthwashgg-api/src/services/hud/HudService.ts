import {
    ComponentSpawnData,
    HazelWriter,
    PlayerData,
    ReliablePacket,
    Room,
    RpcMessage,
    SpawnMessage,
    Vector2
} from "@skeldjs/hindenburg";

import {
    CloseHudMessage,
    DisplaySystemAnnouncementMessage,
    HudItem,
    HudLocation,
    ModstampSetStringMessage,
    RGBA,
    SetChatVisibilityMessage,
    SetHudVisibility,
    SetHudStringMessage,
    Palette,
    AllowTaskInteractionMessage,
    EdgeAlignment,
    CustomNetworkTransformGeneric,
    MouthwashSpawnType
} from "mouthwash-types";

import { Button, ButtonSpawnInfo } from "./Button";
import { MouthwashApiPlugin } from "../../plugin";

export const __unset = Symbol("__unset");

export class PlayerHudManager {
    hudItemVisibility: Map<HudItem, boolean>;
    hudStrings: Map<HudLocation, [ string, string, number ][]>;
    chatVisible: boolean;
    modstampText: string;
    modstampColor: RGBA;
    allowTaskInteraction: boolean;

    buttons: Map<string, Button>;

    constructor() {
        this.hudItemVisibility = new Map;
        this.hudStrings = new Map;
        this.chatVisible = true;
        this.modstampText = "Playing on Mouthwash.gg";
        this.modstampColor = Palette.white;
        this.allowTaskInteraction = true;

        this.buttons = new Map;
    }

    getFullHudString(location: HudLocation) {
        const hudStrings = this.hudStrings.get(location);

        if (!hudStrings || hudStrings.length === 0) {
            return __unset;
        }

        if (!hudStrings.length)
            return "";

        let out = "";
        for (let i = 0, j = 0; i < hudStrings.length; i++) {
            const text = hudStrings[i][1];
            if (text.length > 0) {
                if (j > 0) {
                    out += "\n";
                }
                out += text;
                j++;
            }
        }
        return out;
    }
}

export class HudService {
    playerHuds: WeakMap<PlayerData, PlayerHudManager>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.playerHuds = new WeakMap;
    }

    getPlayerHud(player: PlayerData) {
        const cachedHudInfo = this.playerHuds.get(player);
        const hudManager = cachedHudInfo || new PlayerHudManager;
        if (!cachedHudInfo) {
            this.playerHuds.set(player, hudManager);
        }

        return hudManager;
    }

    async pushNotification(content: string) {
        await this.plugin.room.broadcastMessages([], [
            new DisplaySystemAnnouncementMessage(content)
        ]);
    }

    async pushNotificationFor(content: string, sendTo: PlayerData[]) {
        if (!Array.isArray(sendTo))
            throw new TypeError("Expected array of players for 'sendTo', got " + typeof sendTo);

        const connections = this.plugin.room.getConnections(sendTo);

        await this.plugin.room.broadcastMessages([], [
            new DisplaySystemAnnouncementMessage(content)
        ], connections);
    }

    async setChatVisible(visible: boolean) {
        if (!this.plugin.room.gameData)
            return;

        for (const [ , player ] of this.plugin.room.players) {
            this.getPlayerHud(player).chatVisible = visible;
        }

        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                this.plugin.room.gameData.netId,
                new SetChatVisibilityMessage(visible)
            )
        ]);
    }

    async setChatVisibleFor(visible: boolean, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        if (!this.plugin.room.gameData)
        return;

        for (const player of setFor) {
            this.getPlayerHud(player).chatVisible = visible;
        }
        
        const connections = this.plugin.room.getConnections(setFor);

        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                this.plugin.room.gameData.netId,
                new SetChatVisibilityMessage(visible)
            )
        ], undefined, connections);
    }

    async closeHud() {
        if (!this.plugin.room.gameData)
            return;
            
        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                this.plugin.room.gameData.netId,
                new CloseHudMessage
            )
        ]);
    }

    async closeHudFor(closeFor: PlayerData[]) {
        if (!Array.isArray(closeFor))
            throw new TypeError("Expected array of players for 'closeFor', got " + typeof closeFor);

        if (!this.plugin.room.gameData)
            return;
            
        const connections = this.plugin.room.getConnections(closeFor);

        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                this.plugin.room.gameData.netId,
                new CloseHudMessage
            )
        ], undefined, connections);
    }

    async setHudItemVisibility(item: HudItem, visible: boolean) {
        for (const [ , player ] of this.plugin.room.players) {
            this.getPlayerHud(player).hudItemVisibility.set(item, visible);
        }

        await this.plugin.room.broadcastMessages([], [
            new SetHudVisibility(
                item,
                visible
            )
        ]);
    }

    async setHudItemVisibilityFor(item: HudItem, visible: boolean, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        for (const player of setFor) {
            this.getPlayerHud(player).hudItemVisibility.set(item, visible);
        }
        
        const connections = this.plugin.room.getConnections(setFor);

        await this.plugin.room.broadcastMessages([], [
            new SetHudVisibility(
                item,
                visible
            )
        ], connections);
    }

    private async _setModstampText(text: string|undefined, color: RGBA|undefined, setFor: PlayerData) {
        const hudInfo = this.getPlayerHud(setFor);
        if (text !== undefined) {
            hudInfo.modstampText = text;
        }
        
        if (color !== undefined) {
            hudInfo.modstampColor = color; 
        }

        const connection = this.plugin.room.connections.get(setFor.clientId);

        if (connection) {
            await connection.sendPacket(
                new ReliablePacket(
                    connection.getNextNonce(),
                    [
                        new ModstampSetStringMessage(
                            hudInfo.modstampColor,
                            hudInfo.modstampText
                        )
                    ]
                )
            );
        }
    }

    async setModstampText(text: string|undefined, color: RGBA|undefined) {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            promises.push(this._setModstampText(text, color, player));
        }
        await Promise.all(promises);
    }

    async setModstampTextFor(text: string|undefined, color: RGBA|undefined, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        const promises = [];
        for (const player of setFor) {
            promises.push(this._setModstampText(text, color, player));
        }
        await Promise.all(promises);
    }

    async updateHudString(location: HudLocation, player: PlayerData, hudManager: PlayerHudManager) {
        const connection = this.plugin.room.connections.get(player.clientId);
        if (connection) {
            const fullText = hudManager.getFullHudString(location);

            await connection.sendPacket(
                new ReliablePacket(
                    connection.getNextNonce(),
                    [
                        new SetHudStringMessage(
                            location,
                            fullText === __unset
                                ? "__unset"
                                : fullText
                        )
                    ]
                )
            );
        }
    }

    private async _setHudString(location: HudLocation, name: string, text: string, priority: number, player: PlayerData) {
        const hudManager = this.getPlayerHud(player);
        const cachedOverrides = hudManager.hudStrings.get(location);
        const overrides = cachedOverrides || [];
        if (!cachedOverrides) {
            hudManager.hudStrings.set(location, overrides);
        }

        const idx = overrides.findIndex(([ key ]) => key === name);
        if (idx > -1) {
            overrides.splice(idx, 1);
        }

        const override: [string, string, number] = [ name, text, priority ];

        if (overrides.length <= 0) { // this is all faster than sorting by priority I promise
            overrides.push(override);
        } else if (priority < overrides[0]?.[2]) {
            overrides.unshift(override);
        } else if (priority >= overrides[overrides.length - 1]?.[2]) {
            overrides.push(override);
        } else {
            let flag = false;
            for (let i = 0; i < overrides.length - 1; i++) {
                if (priority >= overrides[i][2] && priority < overrides[i + 1][2]) {
                    overrides.splice(i + 1, 0, override);
                    flag = true;
                    break;
                }
            }
            if (!flag) {
                overrides.push(override);
            }
        }

        await this.updateHudString(location, player, hudManager);
    }

    async setHudString(location: HudLocation, name: string, text: string, priority: number) {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            promises.push(this._setHudString(location, name, text, priority, player));
        }
        await Promise.all(promises);
    }

    async setHudStringFor(location: HudLocation, name: string, text: string, priority: number, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        const promises = [];
        for (const player of setFor) {
            promises.push(this._setHudString(location, name, text, priority, player));
        }
        await Promise.all(promises);
    }

    private async _removeHudString(location: HudLocation, name: string, player: PlayerData) {
        const hudManager = this.getPlayerHud(player);
        const cachedOverrides = hudManager.hudStrings.get(location);
        const overrides = cachedOverrides || [];
        if (!cachedOverrides) {
            hudManager.hudStrings.set(location, overrides);
        }

        const idx = overrides.findIndex(([ key ]) => key === name);
        if (idx > -1) {
            overrides.splice(idx, 1);
        }

        await this.updateHudString(location, player, hudManager);
    }

    async removeHudString(location: HudLocation, name: string) {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            promises.push(this._removeHudString(location, name, player));
        }
        await Promise.all(promises);
    }

    async removeHudStringFor(location: HudLocation, name: string, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        const promises = [];
        for (const player of setFor) {
            promises.push(this._removeHudString(location, name,  player));
        }
        await Promise.all(promises);
    }

    getHudString(location: HudLocation, name: string, player: PlayerData) {
        const hudManager = this.getPlayerHud(player);
        const hudStrings = hudManager.hudStrings.get(location);

        if (!hudStrings)
            return "";

        const override = hudStrings.find(([ key ]) => key === name);
        return override?.[1] || "";
    }

    getFullHudText(location: HudLocation, player: PlayerData) {
        return this.getPlayerHud(player).getFullHudString(location);
    }

    async setTaskInteraction(player: PlayerData, enabled: boolean) {
        const hudManager = this.getPlayerHud(player);
        hudManager.allowTaskInteraction = enabled;

        const connection = this.plugin.room.connections.get(player.clientId);
        if (connection) {
            await connection.sendPacket(
                new ReliablePacket(
                    connection.getNextNonce(),
                    [
                        new AllowTaskInteractionMessage(enabled)
                    ]
                )
            );
        }
    }

    async resetAllHuds() {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            promises.push(this.resetHud(player));
        }
        await Promise.all(promises);
    }

    async resetHud(player: PlayerData) {
        const hudManager = this.getPlayerHud(player);
        const promises = [];
        promises.push(this.setChatVisibleFor(true, [ player ]));
        promises.push(this.setModstampTextFor(undefined, Palette.white, [ player ]));
        promises.push(this.setTaskInteraction(player, true));
        for (const [ hudItem ] of hudManager.hudItemVisibility) {
            promises.push(this.setHudItemVisibilityFor(hudItem, true, [ player ]));
        }
        for (const [ hudLocation ] of hudManager.hudStrings) {
            hudManager.hudStrings.delete(hudLocation);
            promises.push(this.updateHudString(hudLocation, player, hudManager));
        }
        await Promise.all(promises);
    }

    despawnAllButtons(player: PlayerData<Room>) {
        const buttons = this.getPlayerHud(player).buttons;
        for (const [ , button ] of buttons) {
            button.destroy();
        }
    }

    async spawnButton(player: PlayerData<Room>, buttonId: string, spawnInfo: Partial<ButtonSpawnInfo>) {
        const playerButtons = this.getPlayerHud(player).buttons;

        if (playerButtons.has(buttonId))
            throw new Error("Player already has button with id '" + buttonId + "'");

        const spawnedObject = this.plugin.room.spawnPrefab(
            MouthwashSpawnType.Button,
            -2,
            0,
            [
                {
                    alignment: spawnInfo.alignment || EdgeAlignment.None,
                    position: spawnInfo.position || Vector2.null,
                    z: spawnInfo.z ?? -9,
                    attachedTo: spawnInfo.attachedTo ?? -1,
                },
                {
                    assetId: spawnInfo.asset?.assetId || 0
                },
                {
                    maxTimer: spawnInfo.maxTimer || 0,
                    currentTime: spawnInfo.currentTime || 0,
                    saturated: spawnInfo.saturated || 0,
                    color: spawnInfo.color || 0,
                    countingDown: spawnInfo.isCountingDown || false,
                    keys: spawnInfo.keys || []
                }
            ],
            false,
            true
        ) as CustomNetworkTransformGeneric|undefined;

        if (!spawnedObject)
            throw new Error("Failed to spawn button prefab");

        const idx = this.plugin.room.objectList.indexOf(spawnedObject);
        if (idx > -1) {
            this.plugin.room.objectList.splice(idx, 1);
        }
        
        const connection = this.plugin.room.connections.get(player.clientId);

        if (connection) {
            const cntgWriter = HazelWriter.alloc(10);
            cntgWriter.write(spawnedObject);

            const gWriter = HazelWriter.alloc(1);
            gWriter.write(spawnedObject.components[1]);

            const cbWriter = HazelWriter.alloc(14);
            cbWriter.write(spawnedObject.components[2]);
    
            await this.plugin.room.broadcastMessages([
                new SpawnMessage(
                    MouthwashSpawnType.Button,
                    -2,
                    0,
                    [ 
                        new ComponentSpawnData(
                            spawnedObject.netId,
                            cntgWriter.buffer
                        ),
                        new ComponentSpawnData(
                            spawnedObject.components[1].netId,
                            gWriter.buffer
                        ),
                        new ComponentSpawnData(
                            spawnedObject.components[2].netId,
                            cbWriter.buffer
                        )
                    ]
                )
            ], undefined, [ connection ]);
        }

        const button = new Button(this, buttonId, player, spawnedObject);
        playerButtons.set(buttonId, button);

        spawnedObject.on("component.despawn", () => {
            playerButtons.delete(buttonId);
        });

        return button;
    }
}
import { EventEmitter, ExtractEventTypes } from "@skeldjs/events";
import {
    ComponentSpawnData,
    HazelWriter,
    PlayerData,
    Room,
    SpawnMessage,
    Vector2
} from "@skeldjs/hindenburg";

import {
    ClickBehaviour,
    CustomNetworkTransformGeneric,
    EdgeAlignment,
    Graphic,
    KeyCode,
    MouthwashSpawnType,
    RGBA
} from "mouthwash-types";

import { ButtonClickEvent } from "../../events";
import { MouthwashApiPlugin } from "../../plugin";

import { Asset } from "../assets";

export interface ButtonSpawnInfo {
    position: Vector2;
    alignment: EdgeAlignment;
    asset: Asset;
    maxTimer: number;
    currentTime: number;
    saturated: boolean;
    color: RGBA;
    isCountingDown: boolean;
    z: number;
    attachedTo: number;
    keys: KeyCode[];
}

export type ButtonEvents = ExtractEventTypes<[ ButtonClickEvent ]>;

export class Button extends EventEmitter<ButtonEvents> {
    graphic: Graphic;
    clickBehaviour: ClickBehaviour;

    constructor(
        public readonly service: ButtonService,
        public readonly id: string,
        public readonly player: PlayerData,
        public readonly customNetworkTransform: CustomNetworkTransformGeneric
    ) {
        super();

        this.graphic = customNetworkTransform.components[1] as Graphic;
        this.clickBehaviour = customNetworkTransform.components[2] as ClickBehaviour;

        this.clickBehaviour.on("mwgg.clickbehaviour.click", async () => {
            const ev = await this.emit(new ButtonClickEvent(this));
        });
    }

    get maxTimer() {
        return this.clickBehaviour.maxTimer;
    }

    get currentTime() {
        return this.clickBehaviour.currentTime;
    }

    get saturated() {
        return this.clickBehaviour.saturated;
    }

    get color() {
        return this.clickBehaviour.color;
    }

    get countingDown() {
        return this.clickBehaviour.countingDown;
    }

    get keys() {
        return this.clickBehaviour.keys;
    }

    destroy() {
        for (let i = 0; i < this.customNetworkTransform.components.length; i++) {
            this.customNetworkTransform.components[i].despawn();
        }
        this.service.playerButtons.delete(this.player);
    }

    setColor(color: RGBA) {
        this.clickBehaviour.setColor(color);
    }

    setSaturated(saturated: boolean) {
        this.clickBehaviour.setSaturated(saturated);
    }

    setCountingDown(countingDown: boolean) {
        this.clickBehaviour.setCountingDown(countingDown);
    }

    setCurrentTime(time: number) {
        this.clickBehaviour.setCurrentTime(time);
    }

    setMaxTimer(maxTimer: number) {
        this.clickBehaviour.setMaxTimer(maxTimer);
    }

    async click() {
        await this.clickBehaviour.click();
    }

    getNearestPlayer(players: PlayerData<Room>[], range: number, filter?: (player: PlayerData<Room>) => boolean) {
        const inRange = this.getPlayersInRange(players, range, filter);
        let nearestDistance = Infinity;
        let nearestPlayer: PlayerData<Room>|undefined = undefined;
        for (let i = 0; i < inRange.length; i++) {
            const player = inRange[i];
            const dist = player.transform?.position.dist(this.player.transform!.position);
            if (dist !== undefined && dist < nearestDistance) {
                nearestDistance = dist;
                nearestPlayer = player;
            }
        }
        return nearestPlayer;
    }

    getPlayersInRange(players: PlayerData<Room>[], range: number, filter?: (player: PlayerData<Room>) => boolean) {
        if (!this.player.transform)
            return [];

        return players
            .filter(player => {
                if (player === this.player)
                    return false;

                if (!player.transform)
                    return false;

                if (this.player.transform!.position.dist(player.transform.position) > range)
                    return false;

                if (player.info?.isDead)
                    return false;

                return !filter || filter(player);
            });
    }
}

export class ButtonService {
    playerButtons: WeakMap<PlayerData, Map<string, Button>>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.playerButtons = new WeakMap;
    }

    getPlayerButtons(player: PlayerData): Map<string, Button> {
        const cachedButtons = this.playerButtons.get(player);
        const buttons = cachedButtons || new Map;

        if (!cachedButtons) {
            this.playerButtons.set(player, buttons);
        }

        return buttons;
    }

    despawnAllButtons(player: PlayerData<Room>) {
        const buttons = this.getPlayerButtons(player);
        for (const [ , button ] of buttons) {
            button.destroy();
        }
        this.playerButtons.delete(player);
    }

    async spawnButton(player: PlayerData<Room>, buttonId: string, spawnInfo: Partial<ButtonSpawnInfo>) {
        const buttons = this.getPlayerButtons(player);

        if (buttons.has(buttonId))
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
        buttons.set(buttonId, button);

        spawnedObject.on("component.despawn", () => {
            this.getPlayerButtons(player).delete(buttonId);
        });

        return button;
    }
}
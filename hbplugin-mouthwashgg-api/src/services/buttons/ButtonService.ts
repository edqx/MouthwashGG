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

export class Button {
    constructor(
        public readonly id: string,
        public readonly customNetworkTransform: CustomNetworkTransformGeneric
    ) {}

    get graphic() {
        return this.customNetworkTransform.components[1] as Graphic;
    }

    get clickBehaviour() {
        return this.customNetworkTransform.components[2] as ClickBehaviour;
    }

    destroy() {
        for (let i = 0; i < this.customNetworkTransform.components.length; i++) {
            this.customNetworkTransform.components[i].despawn();
        }
    }
}

export class ButtonService {
    playerButtons: WeakMap<PlayerData, Map<string, Button>>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.playerButtons = new WeakMap;
    }

    getButtons(player: PlayerData): Map<string, Button> {
        const cachedButtons = this.playerButtons.get(player);
        const buttons = cachedButtons || new Map;

        if (!cachedButtons) {
            this.playerButtons.set(player, buttons);
        }

        return buttons;
    }

    despawnAllButtons(player: PlayerData<Room>) {
        const buttons = this.getButtons(player);
        for (const [ , button ] of buttons) {
            button.destroy();
        }
        this.playerButtons.delete(player);
    }

    async spawnButton(player: PlayerData<Room>, buttonId: string, spawnInfo: Partial<ButtonSpawnInfo>) {
        const buttons = this.getButtons(player);

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

        const button = new Button(buttonId, spawnedObject);
        buttons.set(buttonId, button);

        return button;
    }
}
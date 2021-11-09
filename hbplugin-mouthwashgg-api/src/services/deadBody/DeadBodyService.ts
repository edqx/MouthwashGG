import {
    Color,
    ComponentSpawnData,
    HazelWriter,
    PlayerData,
    SpawnMessage,
    Vector2
} from "@skeldjs/hindenburg";

import {
    BodyDirection,
    CustomNetworkTransformGeneric,
    DeadBody,
    EdgeAlignment,
    MouthwashSpawnType,
    Palette,
    RGBA
} from "mouthwash-types";
import { DeadBodyDestroyEvent, DeadBodySpawnEvent } from "../../events";

import { MouthwashApiPlugin } from "../../plugin";

export interface DeadBodySpawnInfo {
    color: RGBA;
    shadowColor: RGBA;
    position: Vector2;
    playerId: number;
    hasFallen: boolean;
    bodyFacing: BodyDirection;
    alignment: EdgeAlignment;
    z: number;
    attachedTo: number;
}

export class DeadBodyController {
    customNetworkTransform: CustomNetworkTransformGeneric;

    constructor(
        public readonly deadBody: DeadBody
    ) {
        this.customNetworkTransform = deadBody.components[1] as CustomNetworkTransformGeneric;
    }

    getPlayer() {
        if (this.deadBody.playerId === 0xff)
            return undefined;

        return this.deadBody.room.getPlayerByPlayerId(this.deadBody.playerId);
    }

    async destroy(reason: string) {
        const ev = await this.deadBody.room.emit(new DeadBodyDestroyEvent(this.deadBody, reason));

        if (ev.canceled)
            return;

        for (let i = 0; i < this.deadBody.components.length; i++) {
            this.deadBody.components[i].despawn();
        }
    }
}

export class DeadBodyService {
    deadBodies: Map<number, DeadBodyController>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.deadBodies = new Map;
    }

    private async _spawnDeadBodyFor(spawnInfo: PlayerData|Partial<DeadBodySpawnInfo>, players: PlayerData[]|undefined): Promise<DeadBodyController|undefined> {
        if (spawnInfo instanceof PlayerData) {
            if (!spawnInfo.transform)
                return;

            const playerColor = RGBA.playerBody(spawnInfo.info?.color || Color.Red);
            return await this._spawnDeadBodyFor({
                color: playerColor.light,
                shadowColor: playerColor.dark,
                playerId: spawnInfo.playerId,
                position: spawnInfo.transform?.position
            }, players);
        }

        const position = spawnInfo.position || Vector2.null;
        const spawnedObject = this.plugin.room.spawnPrefab(
            MouthwashSpawnType.DeadBody,
            -2,
            0,
            [
                {
                    color: spawnInfo.color || Palette.forteGreenLight,
                    shadowColor: spawnInfo.shadowColor || Palette.forteGreenShadow,
                    playerId: spawnInfo.playerId ?? 0xff,
                    hasFallen: spawnInfo.hasFallen || false,
                    bodyFacing: spawnInfo.bodyFacing || BodyDirection.Left
                }, {
                    alignment: spawnInfo.alignment || EdgeAlignment.None,
                    position: position,
                    z: spawnInfo.z ?? (position.y / 1000),
                    attachedTo: spawnInfo.attachedTo ?? -1
                }
            ],
            false,
            true
        ) as DeadBody|undefined;

        if (!spawnedObject)
            throw new Error("Failed to spawn dead body prefab");

        const idx = this.plugin.room.objectList.indexOf(spawnedObject);
        if (idx > -1) {
            this.plugin.room.objectList.splice(idx, 1);
        }

        const dbWriter = HazelWriter.alloc(4);
        dbWriter.write(spawnedObject);

        const cntWriter = HazelWriter.alloc(10);
        cntWriter.write(spawnedObject.components[1]);

        const connections = this.plugin.room.getConnections(players);

        await this.plugin.room.broadcastMessages([
            new SpawnMessage(
                MouthwashSpawnType.DeadBody,
                -2,
                0,
                [
                    new ComponentSpawnData(
                        spawnedObject.netId,
                        dbWriter.buffer
                    ),
                    new ComponentSpawnData(
                        spawnedObject.components[1].netId,
                        cntWriter.buffer
                    )
                ]
            )
        ], undefined, connections);

        const controller = new DeadBodyController(spawnedObject);
        this.deadBodies.set(spawnedObject.netId, controller);

        spawnedObject.on("component.despawn", () => {
            this.deadBodies.delete(spawnedObject.netId);
        });
        
        await this.plugin.room.emit(new DeadBodySpawnEvent(controller));

        return controller;
    }

    async spawnDeadBody(player: PlayerData|Partial<DeadBodySpawnInfo>) {
        await this._spawnDeadBodyFor(player, undefined);
    }

    async spawnDeadBodyFor(player: PlayerData|Partial<DeadBodySpawnInfo>, players: PlayerData[]) {
        await this._spawnDeadBodyFor(player, players);
    }
}
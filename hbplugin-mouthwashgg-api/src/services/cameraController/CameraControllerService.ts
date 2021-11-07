import {
    ComponentSpawnData,
    PlayerData,
    HazelWriter,
    Room,
    SpawnMessage
} from "@skeldjs/hindenburg";

import { CameraController, MouthwashSpawnType } from "mouthwash-types";
import { MouthwashApiPlugin } from "../../plugin";

export class CameraControllerService {
    cameras: WeakMap<PlayerData, CameraController>;
    
    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.cameras = new WeakMap;
    }

    async spawnCameraFor(player: PlayerData<Room>) {
        if (this.cameras.has(player))
            throw new Error("Player already has a camera");

        const spawnedObject = this.plugin.room.spawnPrefab(
            MouthwashSpawnType.CameraController,
            player.clientId,
            0,
            undefined,
            false,
            true
        ) as CameraController|undefined;

        if (!spawnedObject)
            throw new Error("Failed to spawn camera prefab");

        const idx = this.plugin.room.objectList.indexOf(spawnedObject);
        if (idx > -1) {
            this.plugin.room.objectList.splice(idx, 1);
        }

        const connection = this.plugin.room.connections.get(player.clientId);

        if (connection) {
            const writer = HazelWriter.alloc(4);
            writer.write(spawnedObject);
    
            await this.plugin.room.broadcastMessages([
                new SpawnMessage(
                    MouthwashSpawnType.CameraController,
                    player.clientId,
                    0,
                    [ 
                        new ComponentSpawnData(
                            spawnedObject.netId,
                            writer.buffer
                        )
                    ]
                )
            ], undefined, [ connection ]);
        }

        this.cameras.set(player, spawnedObject);

        spawnedObject.on("component.despawn", () => {
            this.cameras.delete(player);
        });

        return spawnedObject;
    }

    despawnCamera(player: PlayerData) {
        this.getCameraFor(player)?.despawn();
        this.cameras.delete(player);
    }

    getCameraFor(player: PlayerData) {
        return this.cameras.get(player);
    }
}
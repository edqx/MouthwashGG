import { ComponentSpawnData, Connection, HazelWriter, PlayerData, Room, SpawnMessage, Vector2 } from "@skeldjs/hindenburg";
import { AudioType, CustomNetworkTransformGeneric, EdgeAlignment, MouthwashSpawnType, SoundSource } from "mouthwash-types";
import { MouthwashApiPlugin } from "../../plugin";
import { AudioAsset } from "../assets";

export interface SoundInfo {
    duration: number;
    volumeModifier: number;
    looping: boolean;
    paused: boolean;
    pitch: number;
    soundFalloffMultiplier: number;
    soundFalloffStartingRadius: number;
    seek: number;
    attachedTo: number;
}

export class Sound {
    constructor(
        public readonly asset: AudioAsset,
        public readonly audioType: AudioType,
        public readonly soundInfo: Partial<SoundInfo> = {}
    ) {}
}

export class SoundController {
    constructor(
        public readonly soundSource: SoundSource
    ) {}

    get customNetworkTransform() {
        return this.soundSource.components[1] as CustomNetworkTransformGeneric;
    }

    destroy() {
        for (let i = 0; i < this.soundSource.components.length; i++) {
            this.soundSource.components[i].despawn();
        }
    }
}

export class SoundService {
    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {}

    async playSound(sound: Sound, position: Vector2, players: PlayerData<Room>[]) {
        const spawnedObject = this.plugin.room.spawnPrefab(
            MouthwashSpawnType.SoundSource,
            -2,
            0,
            [
                {
                    duration: (sound.asset.sampleRate / sound.asset.samples) / 1000,
                    resourceId: sound.asset.assetId || 0,
                    audioType: sound.audioType || AudioType.None,
                    volumeModifier: sound.soundInfo.volumeModifier ?? 1,
                    looping: sound.soundInfo.looping || false,
                    paused: sound.soundInfo.paused || false,
                    pitch: sound.soundInfo.pitch ?? 1,
                    soundFalloffMultiplier: sound.soundInfo.soundFalloffMultiplier || 0,
                    soundFalloffStartingRadius: sound.soundInfo.soundFalloffStartingRadius ?? 10000,
                    seek: sound.soundInfo.seek || 0
                },
                {
                    alignment: EdgeAlignment.None,
                    position: position || Vector2.null,
                    z: -50,
                    attachedTo: sound.soundInfo.attachedTo ?? -1,
                }
            ],
            false,
            true
        ) as SoundSource|undefined;

        if (!spawnedObject)
            throw new Error("Failed to spawn button prefab");

        const idx = this.plugin.room.objectList.indexOf(spawnedObject);
        if (idx > -1) {
            this.plugin.room.objectList.splice(idx, 1);
        }

        const connections = players
            .map(player => this.plugin.room.connections.get(player.clientId))
            .filter(_ => _ !== undefined) as Connection[];
        
        if (connections.length) {
            const ssWriter = HazelWriter.alloc(24);
            ssWriter.write(spawnedObject);
    
            const cntgWriter = HazelWriter.alloc(10);
            cntgWriter.write(spawnedObject.components[1]);
    
            await this.plugin.room.broadcastMessages([
                new SpawnMessage(
                    MouthwashSpawnType.SoundSource,
                    -2,
                    0,
                    [ 
                        new ComponentSpawnData(
                            spawnedObject.netId,
                            ssWriter.buffer
                        ),
                        new ComponentSpawnData(
                            spawnedObject.components[1].netId,
                            cntgWriter.buffer
                        )
                    ]
                )
            ], undefined, connections);
        }

        return new SoundController(spawnedObject);
    }
}
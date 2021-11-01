import {
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    Room,
    SpawnType
} from "@skeldjs/hindenburg";

import { AudioType } from "../enums";

export interface SoundSourceData {
    duration: number;
    resourceId: number;
    audioType: AudioType;
    volumeModifier: number;
    looping: boolean;
    paused: boolean;
    pitch: number;
    soundFalloffMultiplier: number;
    soundFalloffStartingRadius: number;
    seek: number;
}

export class SoundSource extends Networkable<SoundSourceData, NetworkableEvents, Room> implements SoundSourceData {
    duration: number;
    resourceId: number;
    audioType: AudioType;
    volumeModifier: number;
    looping: boolean;
    paused: boolean;
    pitch: number;
    soundFalloffMultiplier: number;
    soundFalloffStartingRadius: number;
    seek: number;

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | SoundSourceData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.duration ||= 0;
        this.resourceId ||= 0; // default sound resource
        this.audioType ||= AudioType.None;
        this.volumeModifier ??= 1;
        this.looping ||= false;
        this.paused ||= false;
        this.pitch ??= 1;
        this.soundFalloffMultiplier ||= 0;
        this.soundFalloffStartingRadius ??= 10000;
        this.seek ||= 0;
    }

    Deserialize(reader: HazelReader) {
        this.resourceId = reader.upacked();
        this.pitch = reader.float();
        this.volumeModifier = reader.float();
        this.looping = reader.bool();
        this.audioType = reader.uint8();
        this.seek = reader.float();
        this.paused = reader.bool();
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.resourceId);
        writer.float(this.pitch);
        writer.float(this.volumeModifier);
        writer.bool(this.looping);
        writer.uint8(this.audioType);
        writer.float(this.seek);
        writer.bool(this.paused);
        this.dirtyBit = 0;
        return true;
    }

    setPitch(pitch: number) {
        this.pitch = pitch;
        this.dirtyBit = 1;
    }

    setVolume(volume: number) {
        this.volumeModifier = volume;
        this.dirtyBit = 1;
    }

    setLooping(looping: boolean) {
        this.looping = looping;
        this.dirtyBit = 1;
    }

    setFalloffMultiplier(multiplier: number) {
        this.soundFalloffMultiplier = multiplier;
        this.dirtyBit = 1;
    }

    setFalloffStartingradius(startingRadius: number) {
        this.soundFalloffStartingRadius = startingRadius;
        this.dirtyBit = 1;
    }

    setSeek(seek: number) {
        this.seek = seek;
        this.dirtyBit = 1;
    }

    setPaused(paused: boolean) {
        this.paused = paused;
        this.dirtyBit = 1;
    }
}
import {
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    Room,
    RpcMessage,
    SpawnType,
    Vector2
} from "@skeldjs/hindenburg";

import { BeginCameraAnimationMessage, CameraAnimationKeyframe } from "../packets";

export interface CameraControllerData {
    offset: Vector2;
}

export class CameraController extends Networkable<CameraControllerData, NetworkableEvents, Room> implements CameraControllerData {
    offset: Vector2;

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | CameraControllerData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.offset ??= Vector2.null;
    }

    get connection() {
        return this.room.connections.get(this.ownerId);
    }

    Deserialize(reader: HazelReader) {
        this.offset = reader.vector();
    }

    Serialize(writer: HazelWriter) {
        writer.vector(this.offset);
        this.dirtyBit = 0;
        return true;
    }

    setOffset(offset: Vector2) {
        this.offset = offset;
        this.dirtyBit = 1;
    }

    private async _rpcBeginAnimation(keyframes: CameraAnimationKeyframe[], reset: boolean) {
        if (!this.connection)
            return;

        await this.room.broadcastMessages([
            new RpcMessage(
                this.netId,
                new BeginCameraAnimationMessage(
                    keyframes,
                    reset
                )
            )
        ], undefined, [ this.connection ]);
    }

    async beginAnimation(keyframes: CameraAnimationKeyframe[], reset: boolean) {
        await this._rpcBeginAnimation(keyframes, reset);
    }
}
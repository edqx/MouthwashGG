import {
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    Room,
    RpcMessage,
    SnapToMessage,
    SpawnType,
    Vector2,
    Connection
} from "@skeldjs/hindenburg";

import { EdgeAlignment } from "../enums";

export interface CustomNetworkTransformGenericData {
    alignment: EdgeAlignment;
    position: Vector2;
    z: number;
    attachedToNetId: number;
}

export class CustomNetworkTransformGeneric extends Networkable<CustomNetworkTransformGenericData, NetworkableEvents, Room> implements CustomNetworkTransformGenericData {
    alignment: EdgeAlignment;
    position: Vector2;
    z: number;
    attachedToNetId: number;

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | CustomNetworkTransformGenericData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.alignment ||= EdgeAlignment.None;
        this.position ||= Vector2.null;
        this.z ??= -9;
        this.attachedToNetId ??= -1;
    }

    Deserialize(reader: HazelReader) {
        this.alignment = reader.uint8();
        this.position = reader.vector();
        this.z = reader.float();
        this.attachedToNetId = reader.packed();
    }

    Serialize(writer: HazelWriter) {
        writer.uint8(this.alignment);
        writer.vector(this.position);
        writer.float(this.z);
        writer.packed(this.attachedToNetId);
        this.dirtyBit = 0;
        return true;
    }

    private async _rpcSetPosition(position: Vector2, sendTo?: Connection[]) {
        this.room.broadcastMessages([
            new RpcMessage(
                this.netId,
                new SnapToMessage(
                    position,
                    0
                )
            )
        ], undefined, sendTo);
    }

    private _setPosition(position: Vector2) {
        this.position = position;
    }

    async setPosition(position: Vector2, sendTo?: Connection[]) {
        this._setPosition(position);
        await this._rpcSetPosition(position, sendTo);
    }
}
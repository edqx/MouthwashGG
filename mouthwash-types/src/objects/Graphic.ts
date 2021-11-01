import {
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    Room,
    SpawnType
} from "@skeldjs/hindenburg";

export interface GraphicData {
    assetId: number;
}

export class Graphic extends Networkable<GraphicData, NetworkableEvents, Room> implements GraphicData {
    assetId: number;

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | GraphicData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.assetId ||= 0; // default graphics resource
    }

    Deserialize(reader: HazelReader) {
        this.assetId = reader.upacked();
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.assetId);
        this.dirtyBit = 0;
        return true;
    }

    setResource(resourceId: number) {
        this.assetId = resourceId;
        this.dirtyBit = 1;
    }
}
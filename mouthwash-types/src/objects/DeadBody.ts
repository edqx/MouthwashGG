import {
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    Room,
    SpawnType
} from "@skeldjs/hindenburg";

import { BodyDirection } from "../enums";
import { Palette, RGBA } from "../misc";

export interface DeadBodyData {
    color: RGBA;
    shadowColor: RGBA;
    playerId: number;
    hasFallen: boolean;
    bodyFacing: BodyDirection;
}

export class DeadBody extends Networkable<DeadBodyData, NetworkableEvents, Room> implements DeadBodyData {
    color: RGBA;
    shadowColor: RGBA;
    playerId: number;
    hasFallen: boolean;
    bodyFacing: BodyDirection;

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | DeadBodyData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.color ||= Palette.forteGreenLight;
        this.shadowColor ||= Palette.forteGreenShadow;
        this.playerId ??= 0xff;
        this.hasFallen ||= false;
        this.bodyFacing ||= BodyDirection.Left;
    }
    
    Deserialize(reader: HazelReader) {
        this.hasFallen = reader.bool();
        this.bodyFacing = reader.uint8();
        this.playerId = reader.uint8();
        this.shadowColor = reader.read(RGBA);
        this.color = reader.read(RGBA);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.hasFallen);
        writer.uint8(this.bodyFacing);
        writer.uint8(this.playerId);
        writer.write(this.shadowColor);
        writer.write(this.color);
        this.dirtyBit = 0;
        this.hasFallen = true;
        return true;
    }

    setBodyFacing(direction: BodyDirection) {
        this.bodyFacing = direction;
        this.dirtyBit = 1;
    }

    setColor(color: RGBA) {
        this.color = color;
        this.dirtyBit = 1;
    }

    setShadowColor(color: RGBA) {
        this.shadowColor = color;
        this.dirtyBit = 1;
    }
}
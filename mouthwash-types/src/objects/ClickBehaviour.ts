import {
    BaseRpcMessage,
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    Room,
    SpawnType
} from "@skeldjs/hindenburg";

import { ExtractEventTypes } from "@skeldjs/events";

import { KeyCode, MouthwashRpcMessageTag } from "../enums";
import { ClickMessage } from "../packets";
import { Palette, RGBA } from "../misc";
import { ClickBehaviourClickEvent } from "./events/Click";

export interface ClickBehaviourData {
    maxTimer: number;
    currentTime: number;
    saturated: boolean;
    color: RGBA;
    countingDown: boolean;
    keys: KeyCode[];
}

export type ClickBehaviourEvents = NetworkableEvents & ExtractEventTypes<[
    ClickBehaviourClickEvent
]>;

export class ClickBehaviour extends Networkable<ClickBehaviourData, ClickBehaviourEvents, Room> implements ClickBehaviourData {
    maxTimer: number;
    currentTime: number;
    saturated: boolean;
    color: RGBA;
    countingDown: boolean;
    keys: KeyCode[];

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | ClickBehaviourData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.maxTimer ||= 0;
        this.currentTime ||= 0;
        this.saturated ||= false;
        this.color ||= Palette.white();
        this.countingDown ||= false;
        this.keys ||= [];
    }

    async HandleRpc(rpc: BaseRpcMessage) {
        switch (rpc.messageTag) {
            case MouthwashRpcMessageTag.Click:
                await this._handleClick(rpc);
                break;
        }
    }

    Deserialize(reader: HazelReader) {
        this.maxTimer = reader.float();
        this.currentTime = reader.float();
        this.countingDown = reader.bool();
        this.saturated = reader.bool();
        this.color = reader.read(RGBA);
        
        this.keys = [];
        while (reader.left) {
            this.keys.push(reader.uint16());
        }
    }

    Serialize(writer: HazelWriter) {
        writer.float(this.maxTimer);
        writer.float(this.currentTime);
        writer.bool(this.countingDown);
        writer.bool(this.saturated);
        writer.write(this.color);

        for (const key of this.keys) {
            writer.uint16(key);
        }

        this.dirtyBit = 0;
        return true;
    }

    setColor(color: RGBA) {
        this.color = color;
        this.dirtyBit = 1;
    }

    setSaturated(saturated: boolean) {
        this.saturated = saturated;
        this.dirtyBit = 1;
    }

    setCountingDown(countingDown: boolean) {
        this.countingDown = countingDown;
        this.dirtyBit = 1;
    }

    setCurrentTime(time: number) {
        this.currentTime = time;
        this.dirtyBit = 1;
    }

    setMaxTimer(maxTimer: number) {
        this.maxTimer = maxTimer;
        this.dirtyBit = 1;
    }

    private async _handleClick(rpc: ClickMessage) {
        await this.emit(
            new ClickBehaviourClickEvent(
                this,
                rpc
            )
        );
    }

    async click(rpc: ClickMessage) {
        await this.emit(
            new ClickBehaviourClickEvent(
                this,
                rpc
            )
        );
    }
}
import { BasicEvent } from "@skeldjs/events";
import { PlayerData, Room } from "@skeldjs/hindenburg";

export class ButtonFixedUpdateEvent extends BasicEvent {
    static eventName = "mwgg.button.fixedupdate" as const;
    eventName = "mwgg.button.fixedupdate" as const;

    constructor(
        public readonly players: PlayerData<Room>[]
    ) {
        super();
    }
}
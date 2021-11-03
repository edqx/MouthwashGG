import { BasicEvent } from "@skeldjs/events";
import { Room } from "@skeldjs/hindenburg";

import { AnyGameOptionType } from "mouthwash-types";
import { GameOptionsService } from "../services";

export class MouthwashUpdateGameOptionEvent extends BasicEvent {
    static eventName = "mwgg.gameoption.update" as const;
    eventName = "mwgg.gameoption.update" as const;

    constructor(
        public readonly room: Room,
        public readonly gameOptions: GameOptionsService,
        public readonly optionKey: string,
        private readonly oldValue: AnyGameOptionType,
        private readonly newValue: AnyGameOptionType
    ) {
        super();
    }

    getOldValue<K extends AnyGameOptionType>() {
        return this.oldValue as K;
    }

    getNewValue<K extends AnyGameOptionType>() {
        return this.newValue as K;
    }
}
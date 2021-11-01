import { BasicEvent } from "@skeldjs/events";
import { Room } from "@skeldjs/hindenburg";

import { AnyGameOptions } from "mouthwash-types";
import { GameOptionsService } from "../services";

export class MouthwashUpdateGameOptionEvent<GameOptionsType extends AnyGameOptions, K extends keyof GameOptionsType> extends BasicEvent {
    static eventName = "mwgg.gameoption.update" as const;
    eventName = "mwgg.gameoption.update" as const;

    constructor(
        public readonly room: Room,
        public readonly gameOptions: GameOptionsService<GameOptionsType>,
        public readonly optionKey: K,
        public readonly oldValue: GameOptionsType[K],
        public readonly newValue: GameOptionsType[K]
    ) {
        super();
    }
}
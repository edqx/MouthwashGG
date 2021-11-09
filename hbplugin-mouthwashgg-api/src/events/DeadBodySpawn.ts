import { BasicEvent } from "@skeldjs/events";
import { DeadBodyController } from "../services";

export class DeadBodySpawnEvent extends BasicEvent {
    static eventName = "mwgg.deadbody.spawn" as const;
    eventName = "mwgg.deadbody.spawn" as const;

    constructor(
        public readonly deadBody: DeadBodyController
    ) {
        super();
    }
}
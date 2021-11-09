import { CancelableEvent } from "@skeldjs/events";
import { DeadBody } from "mouthwash-types";

export class DeadBodyDestroyEvent extends CancelableEvent {
    static eventName = "mwgg.deadbody.destroy" as const;
    eventName = "mwgg.deadbody.destroy" as const;

    constructor(
        public readonly deadBody: DeadBody,
        public readonly reason: string
    ) {
        super();
    }
}
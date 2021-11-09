import { CancelableEvent } from "@skeldjs/events";
import { Button } from "../services";

export class ButtonClickEvent extends CancelableEvent {
    static eventName = "mwgg.button.click" as const;
    eventName = "mwgg.button.click" as const;

    constructor(
        public readonly button: Button
    ) {
        super();
    }
}
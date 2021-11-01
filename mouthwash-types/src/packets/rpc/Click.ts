import { BaseRpcMessage } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class ClickMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.Click as const;
    messageTag = MouthwashRpcMessageTag.Click as const;

    static Deserialize() {
        return new ClickMessage;
    }
}
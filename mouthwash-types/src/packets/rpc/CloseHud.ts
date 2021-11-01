import { BaseRpcMessage, HazelReader } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class CloseHudMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.CloseHud as const;
    messageTag = MouthwashRpcMessageTag.CloseHud as const;

    static Deserialize(reader: HazelReader) {
        return new CloseHudMessage();
    }
}
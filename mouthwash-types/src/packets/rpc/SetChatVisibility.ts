import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class SetChatVisibilityMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.SetChatVisibility as const;
    messageTag = MouthwashRpcMessageTag.SetChatVisibility as const;

    constructor(public readonly isVisible: boolean) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const isVisible = reader.bool();
        return new SetChatVisibilityMessage(isVisible);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.isVisible);
    }
}
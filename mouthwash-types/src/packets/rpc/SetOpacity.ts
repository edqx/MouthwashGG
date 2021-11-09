import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class SetOpacityMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.SetOpacity as const;
    messageTag = MouthwashRpcMessageTag.SetOpacity as const;

    constructor(
        public readonly opacity: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const opacity = reader.uint8();
        return new SetOpacityMessage(opacity);
    }

    Serialize(writer: HazelWriter) {
        writer.uint8(this.opacity);
    }
}
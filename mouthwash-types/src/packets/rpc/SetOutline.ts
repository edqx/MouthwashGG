import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { RGBA } from "../../misc";
import { MouthwashRpcMessageTag } from "../../enums";

export class SetOutlineMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.SetOutline as const;
    messageTag = MouthwashRpcMessageTag.SetOutline as const;

    constructor(
        public readonly enabled: boolean,
        public readonly color: RGBA
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const enabled = reader.bool();
        const color = reader.read(RGBA);
        return new SetOutlineMessage(enabled, color);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.enabled);
        writer.write(this.color);
    }
}
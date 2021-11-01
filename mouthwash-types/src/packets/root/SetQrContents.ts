import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class SetQrContentsMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetQrCodeContents as const;
    messageTag = MouthwashRootMessageTag.SetQrCodeContents as const;

    constructor(
        public readonly enabled: boolean,
        public readonly data: string
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const enabled = reader.bool();
        const data = reader.string();
        return new SetQrContentsMessage(enabled, data);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.enabled);
        writer.string(this.data);
    }
}
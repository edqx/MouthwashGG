import {
    BaseRootMessage,
    HazelReader,
    HazelWriter
} from "@skeldjs/hindenburg";

import { MouthwashRootMessageTag } from "../../enums";

export class DeleteGameOptionMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.DeleteGameOption as const;
    messageTag = MouthwashRootMessageTag.DeleteGameOption as const;

    constructor(
        public readonly seqId: number,
        public readonly optionKey: string
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const seqId = reader.uint16();
        const optionName = reader.string();
        return new DeleteGameOptionMessage(seqId, optionName);
    }

    Serialize(writer: HazelWriter) {
        writer.uint16(this.seqId);
        writer.string(this.optionKey);
    }
}
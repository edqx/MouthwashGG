import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class DeleteChatMessageMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.DeleteChatMessage as const;
    messageTag = MouthwashRootMessageTag.DeleteChatMessage as const;

    constructor(
        public readonly uuid: string
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const uuid = reader.bytes(16).toString("hex");
        
        return new DeleteChatMessageMessage(uuid);
    }

    Serialize(writer: HazelWriter) {
        writer.bytes(Buffer.from(this.uuid, "hex"));
    }
}
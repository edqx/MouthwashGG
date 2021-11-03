import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";

export class AllowTaskInteractionMessage extends BaseRootMessage {
    constructor(
        public readonly taskInteraction: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        return new AllowTaskInteractionMessage(reader.bool());
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.taskInteraction);
    }
}
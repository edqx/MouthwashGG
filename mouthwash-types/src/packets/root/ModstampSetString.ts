import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { RGBA } from "../../misc";
import { MouthwashRootMessageTag } from "../../enums";

export class ModstampSetStringMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.ModstampSetString as const;
    messageTag = MouthwashRootMessageTag.ModstampSetString as const;

    constructor(
        public readonly color: RGBA,
        public readonly text: string
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const color = reader.read(RGBA);
        const text = reader.string();

        return new ModstampSetStringMessage(color, text);
    }

    Serialize(writer: HazelWriter) {
        writer.write(this.color);
        writer.string(this.text);
    }
}
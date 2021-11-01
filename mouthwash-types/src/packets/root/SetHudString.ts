import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { HudLocation, MouthwashRootMessageTag } from "../../enums";

export class SetHudStringMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetHudString as const;
    messageTag = MouthwashRootMessageTag.SetHudString as const;

    constructor(
        public readonly location: HudLocation,
        public readonly text: string
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const text = reader.string();
        const location = reader.uint8();
        
        return new SetHudStringMessage(location, text);
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.text);
        writer.uint8(this.location);
    }
}
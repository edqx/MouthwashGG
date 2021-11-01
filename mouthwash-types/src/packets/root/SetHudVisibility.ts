import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { HudItem, MouthwashRootMessageTag } from "../../enums";

export class SetHudVisibility extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetHudVisibility as const;
    messageTag = MouthwashRootMessageTag.SetHudVisibility as const;

    constructor(
        public readonly item: HudItem,
        public readonly isVisible: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const item = reader.uint8();
        const isVisible = reader.bool();
        return new SetHudVisibility(item, isVisible);
    }

    Serialize(writer: HazelWriter) {
        writer.uint8(this.item);
        writer.bool(this.isVisible);
    }
}
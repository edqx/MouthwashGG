import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class DisplaySystemAnnouncementMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.DisplaySystemAnnouncement as const;
    messageTag = MouthwashRootMessageTag.DisplaySystemAnnouncement as const;

    constructor(
        public readonly content: string
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        return new DisplaySystemAnnouncementMessage(reader.string());
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.content);
    }
}
import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { RGBA } from "../../misc";
import { MouthwashRootMessageTag } from "../../enums";

export class DisplayStartGameScreenMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.Intro as const;
    messageTag = MouthwashRootMessageTag.Intro as const;

    constructor(
        public readonly titleText: string,
        public readonly subtitleText: string,
        public readonly backgroundColor: RGBA,
        public readonly yourTeam: number[]
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const titleText = reader.string();
        const subtitleText = reader.string();
        const backgroundColor = reader.read(RGBA);
        const yourTeam = [...reader.bytes(reader.left).buffer];
        return new DisplayStartGameScreenMessage(titleText, subtitleText, backgroundColor, yourTeam);
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.titleText);
        writer.string(this.subtitleText);
        writer.write(this.backgroundColor);
        writer.bytes(this.yourTeam);
    }
}
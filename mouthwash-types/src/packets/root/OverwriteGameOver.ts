import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { RGBA } from "../..";
import { MouthwashRootMessageTag, WinSound } from "../../enums";

export class OverwriteGameOver extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.OverwriteGameOver as const;
    messageTag = MouthwashRootMessageTag.OverwriteGameOver as const;

    constructor(
        public readonly titleText: string,
        public readonly subtitleText: string,
        public readonly backgroundColor: RGBA,
        public readonly yourTeam: number[],
        public readonly displayQuit: boolean,
        public readonly displayPlayAgain: boolean,
        public readonly winSound: WinSound,
        public readonly customWinSound: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const titleText = reader.string();
        const subtitleText = reader.string();
        const backgroundColor = reader.read(RGBA);
        const team = reader.list(() => reader.uint8());
        const displayQuit = reader.bool();
        const displayPlayAgain = reader.bool();
        const winSound = reader.uint8();
        const customWinSound = reader.upacked();

        return new OverwriteGameOver(
            titleText,
            subtitleText,
            backgroundColor,
            team,
            displayQuit,
            displayPlayAgain,
            winSound,
            customWinSound
        );
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.titleText);
        writer.string(this.subtitleText);
        writer.write(this.backgroundColor);
        writer.uint8(this.yourTeam.length);
        for (let i = 0; i < this.yourTeam.length; i++) {
            writer.uint8(this.yourTeam[i]);
        }
        writer.bool(this.displayQuit);
        writer.bool(this.displayPlayAgain);
        writer.uint8(this.winSound);
        writer.upacked(this.customWinSound);
    }
}
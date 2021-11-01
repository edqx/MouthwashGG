import {
    BaseRootMessage,
    Hat,
    HazelReader,
    HazelWriter,
    Pet,
    Skin,
    SendQuickChatMessage
} from "@skeldjs/hindenburg";

import { RGBA } from "../../misc";
import { ChatMessageAlignment, MouthwashRootMessageTag } from "../../enums";

export class ChatPlayerAppearance {
    constructor(
        public readonly playerName: string,
        public readonly isDead: boolean,
        public readonly isVote: boolean,
        public readonly playerHat: Hat,
        public readonly playerPet: Pet,
        public readonly playerSkin: Skin,
        public readonly backColor: RGBA,
        public readonly frontColor: RGBA,
        public readonly visorColor: RGBA
    ) {}

    static Deserialize(reader: HazelReader) {
        const playerName = reader.string();
        const isDead = reader.bool();
        const isVote = reader.bool();
        const playerHat = reader.packed();
        const playerPet = reader.packed();
        const playerSkin = reader.packed();
        const backColor = reader.read(RGBA);
        const frontColor = reader.read(RGBA);
        const visorColor = reader.read(RGBA);
        return new ChatPlayerAppearance(playerName, isDead, isVote, playerHat, playerPet, playerSkin, backColor, frontColor, visorColor)
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.playerName);
        writer.bool(this.isDead);
        writer.bool(this.isVote);
        writer.packed(this.playerHat);
        writer.packed(this.playerPet);
        writer.packed(this.playerSkin);
        writer.write(this.backColor);
        writer.write(this.frontColor);
        writer.write(this.visorColor);
    }
}

export class SetChatMessageMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetChatMessage as const;
    messageTag = MouthwashRootMessageTag.SetChatMessage as const;

    constructor(
        public readonly uuid: string,
        public readonly alignment: ChatMessageAlignment,
        public readonly playerAppearance: ChatPlayerAppearance,
        public readonly pitch: number,
        public readonly messageContent: SendQuickChatMessage|string,
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const uuid = reader.bytes(16).toString("hex");
        const alignment = reader.uint8();
        const playerApperance = reader.read(ChatPlayerAppearance);
        const pitch = reader.float();

        const isQuickChat = reader.bool();
        const messageContent = isQuickChat
            ? reader.read(SendQuickChatMessage)
            : reader.string();

        return new SetChatMessageMessage(uuid, alignment, playerApperance, pitch, messageContent);
    }

    Serialize(writer: HazelWriter) {
        writer.bytes(Buffer.from(this.uuid, "hex"));
        writer.uint8(this.alignment);
        writer.write(this.playerAppearance);
        writer.float(this.pitch);
        writer.bool(typeof this.messageContent !== "string");
        if (typeof this.messageContent === "string") {
            writer.string(this.messageContent);
        } else {
            writer.write(this.messageContent);
        }
    }
}
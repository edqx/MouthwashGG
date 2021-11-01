import {
    BaseRootMessage,
    HazelReader,
    HazelWriter
} from "@skeldjs/hindenburg";

import { MouthwashRootMessageTag } from "../../enums";
import { GameOption } from "../../GameOption";

export class SetGameOptionMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetGameOption as const;
    messageTag = MouthwashRootMessageTag.SetGameOption as const;

    constructor(
        public readonly seqId: number,
        public readonly option: GameOption
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const seqId = reader.uint16();
        const option = GameOption.Deserialize(reader);

        return new SetGameOptionMessage(seqId, option);
    }

    Serialize(writer: HazelWriter) {
        writer.uint16(this.seqId);
        this.option.Serialize(writer);
    }
}
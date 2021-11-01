import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { PlayerAnimationKeyframe } from "./keyframes";
import { Bitfield } from "../../misc";
import { MouthwashRpcMessageTag } from "../../enums";

export class BeginPlayerAnimationMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.BeginPlayerAnimation as const;
    messageTag = MouthwashRpcMessageTag.BeginPlayerAnimation as const;

    constructor(
        public readonly keyframes: PlayerAnimationKeyframe[],
        public readonly reset: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const enabledBitfield = new Bitfield(reader.uint16());
        const keyframes: PlayerAnimationKeyframe[] = [];
        while (reader.left) {
            const [ , kreader ] = reader.message();
            keyframes.push(kreader.read(PlayerAnimationKeyframe, enabledBitfield));
        }
        const reset = reader.bool();
        return new BeginPlayerAnimationMessage(keyframes, reset);
    }

    Serialize(writer: HazelWriter) {
        const kwriter = HazelWriter.alloc(55 * this.keyframes.length);
        let maxBitfield = new Bitfield(0);
        for (const keyframe of this.keyframes) {
            kwriter.begin(0);
            const bitfield = keyframe.Serialize(kwriter);
            if (bitfield.value > maxBitfield.value) {
                maxBitfield = bitfield;
            }
            kwriter.end();
        }
        kwriter.realloc(kwriter.cursor);
        writer.uint16(maxBitfield.value);
        writer.bytes(kwriter);
        writer.bool(this.reset);
    }
}
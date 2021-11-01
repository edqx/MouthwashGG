import { HazelReader, HazelWriter, Vector2 } from "@skeldjs/hindenburg";
import { RGBA } from "../../../misc";
import { Keyframe } from "./Keyframe";

export interface CameraAnimationKeyframeData {
    position: Vector2;
    rotation: number;
    color: RGBA;
}

export class CameraAnimationKeyframe extends Keyframe implements CameraAnimationKeyframeData {
    position: Vector2;
    rotation: number;
    color: RGBA;

    constructor(
        public readonly offset: number,
        public readonly duration: number,
        data: CameraAnimationKeyframeData
    ) {
        super(offset, duration);

        this.position = data.position;
        this.rotation = data.rotation;
        this.color = data.color;
    }

    static Deserialize(reader: HazelReader) {
        const offset = reader.upacked();
        const duration = reader.upacked();
        const position = reader.vector();
        const rotation = reader.float();
        const color = reader.read(RGBA);

        return new CameraAnimationKeyframe(
            offset,
            duration,
            {
                position,
                rotation,
                color
            }
        );
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.offset);
        writer.upacked(this.duration);
        writer.vector(this.position);
        writer.float(this.rotation);
        writer.write(this.color);
    }
}
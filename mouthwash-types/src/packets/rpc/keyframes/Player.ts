import { HazelReader, HazelWriter, Vector2 } from "@skeldjs/hindenburg";
import { Bitfield, RGBA } from "../../../misc";
import { Keyframe } from "./Keyframe";

export enum PlayerKeyframeEnabledValues {
    Opacity,
    HatOpacity,
    PetOpacity,
    SkinOpacity,
    NameOpacity,
    PrimaryColor,
    SecondaryColor,
    VisorColor,
    Scale,
    Position,
    Rotation
}

export interface PlayerAnimationKeyframeData {
    opacity?: number;
    hatOpacity?: number;
    petOpacity?: number;
    skinOpacity?: number;
    nameOpacity?: number;
    primaryColor?: RGBA;
    secondaryColor?: RGBA;
    visorColor?: RGBA;
    scale?: Vector2;
    position?: Vector2;
    rotation?: number;
}

export class PlayerAnimationKeyframe extends Keyframe implements PlayerAnimationKeyframeData {
    readonly opacity?: number;
    readonly hatOpacity?: number;
    readonly petOpacity?: number;
    readonly skinOpacity?: number;
    readonly nameOpacity?: number;
    readonly primaryColor?: RGBA;
    readonly secondaryColor?: RGBA;
    readonly visorColor?: RGBA;
    readonly scale?: Vector2;
    readonly position?: Vector2;
    readonly rotation?: number;
    
    constructor(
        public readonly offset: number,
        public readonly duration: number,
        data: PlayerAnimationKeyframeData
    ) {
        super(offset, duration);
        
        this.opacity = data.opacity;
        this.hatOpacity = data.hatOpacity;
        this.petOpacity = data.petOpacity;
        this.skinOpacity = data.skinOpacity;
        this.nameOpacity = data.nameOpacity;
        this.primaryColor = data.primaryColor;
        this.secondaryColor = data.secondaryColor;
        this.visorColor = data.visorColor;
        this.scale = data.scale;
        this.position = data.position;
        this.rotation = data.rotation;
    }

    static Deserialize(reader: HazelReader, enabledBitfield: Bitfield) {
        const offset = reader.packed();
        const duration = reader.packed();

        const opacity = enabledBitfield.has(PlayerKeyframeEnabledValues.Opacity) ? reader.float() : undefined;
        const hatOpacity = enabledBitfield.has(PlayerKeyframeEnabledValues.HatOpacity) ? reader.float() : undefined;
        const petOpacity = enabledBitfield.has(PlayerKeyframeEnabledValues.PetOpacity) ? reader.float() : undefined;
        const skinOpacity = enabledBitfield.has(PlayerKeyframeEnabledValues.SkinOpacity) ? reader.float() : undefined;
        const nameOpacity = enabledBitfield.has(PlayerKeyframeEnabledValues.NameOpacity) ? reader.float() : undefined;
        const primaryColor = enabledBitfield.has(PlayerKeyframeEnabledValues.PrimaryColor) ? reader.read(RGBA) : undefined;
        const secondaryColor = enabledBitfield.has(PlayerKeyframeEnabledValues.SecondaryColor) ? reader.read(RGBA) : undefined;
        const visorColor = enabledBitfield.has(PlayerKeyframeEnabledValues.VisorColor) ? reader.read(RGBA) : undefined;
        const scale = enabledBitfield.has(PlayerKeyframeEnabledValues.Scale) ? reader.vector() : undefined;
        const position = enabledBitfield.has(PlayerKeyframeEnabledValues.Position) ? reader.vector() : undefined;
        const rotation = enabledBitfield.has(PlayerKeyframeEnabledValues.Rotation) ? reader.float() : undefined;

        return new PlayerAnimationKeyframe(offset, duration, {
            opacity,
            hatOpacity,
            petOpacity,
            skinOpacity,
            nameOpacity,
            primaryColor,
            secondaryColor,
            visorColor,
            scale,
            position,
            rotation
        });
    }

    Serialize(writer: HazelWriter) {
        const enabledBitfield = new Bitfield(0);
        writer.packed(this.offset);
        writer.packed(this.duration);
        if (this.opacity !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.Opacity);
            writer.float(this.opacity);
        }
        if (this.hatOpacity !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.HatOpacity);
            writer.float(this.hatOpacity);
        }
        if (this.petOpacity !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.PetOpacity);
            writer.float(this.petOpacity);
        }
        if (this.skinOpacity !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.SkinOpacity);
            writer.float(this.skinOpacity);
        }
        if (this.nameOpacity !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.NameOpacity);
            writer.float(this.nameOpacity);
        }
        if (this.primaryColor !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.PrimaryColor);
            writer.write(this.primaryColor);
        }
        if (this.secondaryColor !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.SecondaryColor);
            writer.write(this.secondaryColor);
        }
        if (this.visorColor !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.VisorColor);
            writer.write(this.visorColor);
        }
        if (this.scale !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.Scale);
            writer.vector(this.scale);
        }
        if (this.position !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.Position);
            writer.vector(this.position);
        }
        if (this.rotation !== undefined) {
            enabledBitfield.on(PlayerKeyframeEnabledValues.Rotation);
            writer.float(this.rotation);
        }
        return enabledBitfield;
    }
}

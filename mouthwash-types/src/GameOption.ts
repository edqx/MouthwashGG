import { HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { GameOptionType } from "./enums";

export class EnumValue<T extends string> {
    optionType = GameOptionType.Enum;

    constructor(
        public readonly options: T[],
        public readonly selectedIdx: number
    ) {}

    static Deserialize(reader: HazelReader) {
        const selectedIdx = reader.upacked();
        const options = [];
        while (reader.left) {
            options.push(reader.string());
        }
        return new EnumValue(options, selectedIdx);
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.selectedIdx);
        for (const option of this.options) {
            writer.string(option);
        }
    }

    toJSON() {
        return {
            type: "enum",
            options: this.options,
            selectedIdx: this.selectedIdx
        };
    }

    compare(other: AnyGameOptionType) {
        if (!(other instanceof EnumValue))
            return false;

        if (this.options.length !== other.options.length)
            return false;

        if (!this.options.every((option, i) => option === other.options[i]))
            return false;

        if (this.selectedIdx !== other.selectedIdx)
            return false;

        return true;
    }

    validate(value: AnyGameOptionType) {
        if (!(value instanceof EnumValue)) {
            throw new TypeError("Expected enum value, got " + value);
        }

        if (value.selectedIdx < 0) {
            throw new RangeError("selectedIdx out of bounds: " + value.selectedIdx);
        }

        if (value.selectedIdx >= this.options.length) {
            throw new RangeError("selectedIdx out of bounds: " + value.selectedIdx + ", options length: " + this.options.length);
        }

        if (value.options.length !== value.options.length) {
            throw new Error("Available options were changed unexpectedly");
        }

        if (value.options.some((opt, i) => this.options[i] !== opt)) {
            throw new Error("Available options were changed unexpectedly");
        }

        return true;
    }

    get selectedOption(){
        return this.options[this.selectedIdx];
    }
}

export class BooleanValue {
    optionType = GameOptionType.Boolean;

    constructor(
        public readonly enabled: boolean
    ) {}

    static Deserialize(reader: HazelReader) {
        const enabled = reader.bool();
        return new BooleanValue(enabled);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.enabled);
    }

    toJSON() {
        return {
            type: "boolean",
            enabled: this.enabled
        };
    }

    compare(other: AnyGameOptionType) {
        return other instanceof BooleanValue && this.enabled === other.enabled;
    }

    validate(value: AnyGameOptionType) {
        if (!(value instanceof BooleanValue)) {
            throw new Error("Expected boolean value, got " + value);
        }
    }
}

const stepPrecisionLambda = 1e-5;
export class NumberValue {
    optionType = GameOptionType.Number;

    constructor(
        public readonly value: number,
        public readonly step: number,
        public readonly lower: number,
        public readonly upper: number,
        public readonly zeroIsInfinity: boolean,
        public readonly suffix: string
    ) {}

    static Deserialize(reader: HazelReader) {
        const value = reader.float();
        const step = reader.float();
        const lower = reader.float();
        const upper = reader.float();
        const zeroIsInfinity = reader.bool();
        const suffix = reader.string();

        return new NumberValue(value, step, lower, upper, zeroIsInfinity, suffix);
    }

    Serialize(writer: HazelWriter) {
        writer.float(this.value);
        writer.float(this.step);
        writer.float(this.lower);
        writer.float(this.upper);
        writer.bool(this.zeroIsInfinity);
        writer.string(this.suffix);
    }

    toJSON() {
        return {
            type: "number",
            value: this.value,
            step: this.step,
            lower: this.lower,
            upper: this.upper,
            zeroIsInfinity: this.zeroIsInfinity,
            suffix: this.suffix
        };
    }

    compare(other: AnyGameOptionType) {
        if (!(other instanceof NumberValue))
            return false;

        if (!this.isRoughlyEqual(other.value))
            return false;

        if (this.step !== other.step)
            return false;

        if (this.lower !== other.lower)
            return false;

        if (this.upper !== other.upper)
            return false;

        if (this.zeroIsInfinity !== other.zeroIsInfinity)
            return false;

        if (this.suffix !== other.suffix)
            return false;

        return true;
    }

    validate(value: AnyGameOptionType) {
        if (!(value instanceof NumberValue)) {
            throw new Error("Expected number value, got " + value);
        }

        if (Math.abs(value.step - this.step) >= stepPrecisionLambda) {
            throw new Error("Number step was changed unexpectedly");
        }
        (value as any).step = this.step; // value.step can be some weird floating point precision error value so fix it in case (it should be basically the same anyway)

        if (value.lower !== this.lower) {
            throw new Error("Number lower-bound was changed unexpectedly");
        }

        if (value.upper !== this.upper) {
            throw new Error("Number upper-bound was changed unexpectedly");
        }

        if (value.zeroIsInfinity !== this.zeroIsInfinity) {
            throw new Error("Number zero-is-infinity was changed unexpectedly");
        }

        if (value.suffix !== this.suffix) {
            throw new Error("Number suffix was changed unexpectedly");
        }

        if (value.value > this.upper) {
            throw new RangeError("Expected value (" + value.value + ") to be less or equal to the number's upper-bound (" + this.upper + ")");
        }

        if (value.value < this.lower) {
            throw new RangeError("Expected value (" + value.value + ") to be more or equal to the number's lower-bound (" + this.lower + ")");
        }

        const delta = Math.abs(value.step - (value.value % value.step));
        if (delta >= stepPrecisionLambda && delta <= value.step - stepPrecisionLambda) {
            throw new RangeError("Expected value (" + value.value + ") to be a multiple of the number step (" + value.step + ")");
        }

        return true;
    }

    isRoughlyEqual(val: number) {
        return Math.abs(this.value - val) < stepPrecisionLambda;   
    }
}

const OptionTypeToValueClass = {
    [GameOptionType.Number]: NumberValue,
    [GameOptionType.Boolean]: BooleanValue,
    [GameOptionType.Enum]: EnumValue
};

export class GameOption {
    constructor(
        public readonly category: string,
        public readonly key: string,
        private value: AnyGameOptionType,
        public readonly priority: number
    ) {}

    static Deserialize(reader: HazelReader) {
        const category = reader.string();
        const priority = reader.uint16();
        const key = reader.string();
        const optionType = reader.uint8();
        
        const value = OptionTypeToValueClass[optionType as GameOptionType].Deserialize(reader);
        
        return new GameOption(category, key, value, priority);
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.category);
        writer.uint16(this.priority);
        writer.string(this.key);
        writer.uint8(this.value.optionType);
        this.value.Serialize(writer);
    }

    compare(other: GameOption) {
        if (other.value.optionType !== this.value.optionType)
            return false;

        return this.value.compare(other.value);
    }

    validate(value: AnyGameOptionType) {
        this.value.validate(value);
    }

    getValue<K extends AnyGameOptionType>() {
        return this.value as K;
    }

    setValue(value: AnyGameOptionType, validate = false) {
        if (value.optionType !== this.value.optionType)
            return false;
        
        if (validate) {
            if (!this.value.validate(value as any)) {
                return false;
            }
        }

        this.value = value;
    }
}

export type AnyGameOptionType = EnumValue<string>|NumberValue|BooleanValue;
export type AnyGameOptions = Record<string, AnyGameOptionType>;
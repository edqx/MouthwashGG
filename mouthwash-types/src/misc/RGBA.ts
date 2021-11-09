import { Color, ColorCodes, HazelReader, HazelWriter } from "@skeldjs/hindenburg";

export class RGBA {
    static playerBody(color: Color) {
        const colorCode = ColorCodes[color];

        return {
            light: new RGBA(colorCode.highlightRGB[0], colorCode.highlightRGB[1], colorCode.highlightRGB[2], 255),
            dark: new RGBA(colorCode.shadowRGB[0], colorCode.shadowRGB[1], colorCode.shadowRGB[2], 255)
        };
    }

    static toHsv(color: RGBA): [ number, number, number ] {
        const min = Math.min(color.r, color.g, color.b );
        const max = Math.max(color.r, color.g, color.b );
        const val = max;

        const delta = max - min;

        if (max === 0) {
            return [ -1, 0, max ];
        }

        const sat = delta / max;

        const hue = (color.r === max
            ? (color.g - color.b) / delta
            : (color.g === max)
                ? 2 + (color.b - color.r) / delta
                : 4 + (color.r - color.g) / delta) * 60;

        return [ hue < 0 ? hue + 360 : hue, sat, val ];
    }

    static fromHsv([ hue, sat, val ]: [ number, number, number ], alpha = 255) {
        if (sat === 0) {
            return new RGBA(val, val, val, alpha);
        }

        const sector = hue / 60;
        const i = Math.floor(sector);
        const factorial = sector - i;
        
        const p = val * (1 - sat);
        const q = val * (1 - sat * factorial);
        const t = val * (1 - sat * (1 - factorial));
    
        switch(i) {
            case 0:
                return new RGBA(~~val, ~~t, ~~p);
            case 1:
                return new RGBA(~~q, ~~val, ~~p);
            case 2:
                return new RGBA(~~p, ~~val, ~~t);
            case 3:
                return new RGBA(~~p, ~~q, ~~val);
            case 4:
                return new RGBA(~~t, ~~p, ~~val);
            case 5:
            default:
                return new RGBA(~~val, ~~p, ~~q);
        }
    }

    static saturate(color: RGBA, percentage: number) {
        const hsv = color.toHsv();
        hsv[1] *= percentage > 1 ? 1 : percentage < 0 ? 0 : percentage;
        return this.fromHsv(hsv);
    }

    public readonly r: number;
    public readonly g: number;
    public readonly b: number;
    public readonly a: number;

    constructor(
        r: number[]
    );
    constructor(
        r: number,
        g: number,
        b: number,
        a?: number
    );
    constructor(
        r: number|number[],
        g?: number,
        b?: number,
        a?: number
    ) {
        if (Array.isArray(r)) {
            this.r = r[0] ?? 255;
            this.g = r[1] ?? 255;
            this.b = r[2] ?? 255;
            this.a = r[3] ?? 255;
        } else {
            this.r = r;
            this.g = g ?? 255;
            this.b = b ?? 255;
            this.a = a ?? 255;
        }
    }

    toString() {
        return "#"
            + this.r.toString(16).padStart(2, "0")
            + this.g.toString(16).padStart(2, "0")
            + this.b.toString(16).padStart(2, "0")
            + this.a.toString(16).padStart(2, "0");
    }

    static Deserialize(reader: HazelReader) {
        return new RGBA(
            reader.uint8(),
            reader.uint8(),
            reader.uint8(),
            reader.uint8()
        );
    }

    Serialize(writer: HazelWriter) {
        writer.uint8(this.r);
        writer.uint8(this.g);
        writer.uint8(this.b);
        writer.uint8(this.a);
    }

    text(text: string) {
        return `<color=${this.toString()}>${text}</color>`;
    }

    toHsv() {
        return RGBA.toHsv(this);
    }

    saturate(percentage: number) {
        return RGBA.saturate(this, percentage);
    }
}

export const Palette = {
    playerVisor: new RGBA(149, 202, 220, 255),
    crewmateBlue: new RGBA(140, 255, 255, 255),
    impostorRed: new RGBA(255, 25, 25, 255),
    null: new RGBA(0, 0, 0, 0),
    white: new RGBA(255, 255, 255, 255),
    black: new RGBA(0, 0, 0, 255),
    grey: new RGBA(128, 128, 128, 255),
    forteGreenLight: new RGBA(29, 152, 83, 255),
    forteGreenShadow: new RGBA(18, 63, 27, 255)
}
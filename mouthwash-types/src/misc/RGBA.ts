import { Color, ColorCodes, HazelReader, HazelWriter } from "@skeldjs/hindenburg";

export class RGBA {
    static playerBody(color: Color) {
        const colorCode = ColorCodes[color];

        return {
            light: new RGBA(colorCode.highlightRGB),
            dark: new RGBA(colorCode.shadowRGB)
        };
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

    static text: Record<keyof typeof Palette, (text: string) => string> = {
        
    } as Record<keyof typeof Palette, (text: string) => string>;
}

export const Palette = {
    "playerVisor": new RGBA(149, 202, 220, 255),
    "crewmateBlue": new RGBA(140, 255, 255, 255),
    "impostorRed": new RGBA(255, 25, 25, 255),
    "null": new RGBA(0, 0, 0, 0),
    "white": new RGBA(255, 255, 255, 255),
    "black": new RGBA(0, 0, 0, 255)
};
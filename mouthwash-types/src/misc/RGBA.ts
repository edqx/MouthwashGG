import { Color, ColorCodes, HazelReader, HazelWriter } from "@skeldjs/hindenburg";

export const Palette = {
    "playerVisor": () =>  new RGBA(149, 202, 220, 255),
    "crewmateBlue": () =>  new RGBA(140, 255, 255, 255),
    "impostorRed": () =>  new RGBA(255, 25, 25, 255),
    "null": () =>  new RGBA(0, 0, 0, 0),
    "white": () =>  new RGBA(255, 255, 255, 255),
    "black": () =>  new RGBA(0, 0, 0, 255)
};

export class RGBA {
    static playerBody(color: Color) {
        const colorCode = ColorCodes[color];

        return {
            light: new RGBA(colorCode.highlightRGB),
            dark: new RGBA(colorCode.shadowRGB)
        };
    }

    r: number;
    g: number;
    b: number;
    a: number;

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
            + this.r.toString(16)
            + this.g.toString(16)
            + this.b.toString(16)
            + this.a.toString(16);
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

function getText(colorName: keyof typeof Palette, text: string) {
    return `<color=${Palette[colorName]().toString()}>${text}</color>`
}

for (const _colorName in Palette) {
    const colorName = _colorName as keyof typeof Palette;
    RGBA.text[colorName] = getText.bind(null, colorName);
}
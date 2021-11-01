import { BaseRootPacket, HazelReader, SendOption } from "@skeldjs/hindenburg";

export class PingPacket extends BaseRootPacket {
    static messageTag = SendOption.Ping as const;
    messageTag = SendOption.Ping as const;

    constructor() {
        super();
    }

    static Deserialize(reader: HazelReader) {
        return new PingPacket;
    }
}
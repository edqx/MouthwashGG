import { BaseRootMessage, HazelReader, HazelWriter, MessageDirection, PacketDecoder } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag, ResourceType, FetchResponseType } from "../../enums";

export class FetchResourceEndedResponse {
    responseType = FetchResponseType.Ended as const;

    constructor(
        public readonly didCache: boolean
    ) {}

    static Deserialize(reader: HazelReader) {
        return new FetchResourceEndedResponse(reader.bool());
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.didCache);
    }
}

export class FetchResourceFailedResponse {
    responseType = FetchResponseType.Failed as const;

    constructor(
        public readonly reason: number
    ) {}

    static Deserialize(reader: HazelReader) {
        return new FetchResourceFailedResponse(reader.packed());
    }

    Serialize(writer: HazelWriter) {
        writer.packed(this.reason);
    }
}

export class FetchResourceStartedResponse {
    responseType = FetchResponseType.Started as const;

    constructor(
        public readonly size: number
    ) {}

    static Deserialize(reader: HazelReader) {
        return new FetchResourceStartedResponse(reader.packed());
    }

    Serialize(writer: HazelWriter) {
        writer.packed(this.size);
    }
}

export class FetchResourceInvalidResponse {
    responseType = FetchResponseType.Invalid as const;

    static Deserialize() {
        return new FetchResourceInvalidResponse;
    }

    Serialize() {}
}

export type FetchResourceResponse =
    FetchResourceEndedResponse |
    FetchResourceFailedResponse |
    FetchResourceStartedResponse |
    FetchResourceInvalidResponse;

export class FetchResourceMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.FetchResource as const;
    messageTag = MouthwashRootMessageTag.FetchResource as const;

    resourceId!: number;
    resourceLocation!: string;
    fileHash!: Buffer;
    resourceType!: ResourceType;

    response!: FetchResourceResponse;

    constructor(
        resourceId: number,
        resourceLocation: string,
        fileHash: Buffer,
        resourceType: ResourceType
    );
    constructor(
        resourceId: number,
        response: FetchResourceResponse
    );
    constructor(
        resourceId: number,
        resourceLocationOrResponse: string|FetchResourceResponse,
        fileHash?: Buffer,
        resourceType?: ResourceType
    ) {
        super();

        if (typeof resourceLocationOrResponse !== "object") {
            this.resourceId = resourceId;
            this.resourceLocation = resourceLocationOrResponse;
            this.fileHash = fileHash!;
            this.resourceType = resourceType!;
        } else {
            this.resourceId = resourceId;
            this.response = resourceLocationOrResponse;
        }
    }

    static Deserialize(
        reader: HazelReader,
        direction: MessageDirection
    ) {
        if (direction === MessageDirection.Serverbound) {
            const resourceId = reader.packed();
            const responseType = reader.uint8();

            switch (responseType) {
                case FetchResponseType.Started:
                    return new FetchResourceMessage(
                        resourceId,
                        reader.read(FetchResourceStartedResponse)
                    );
                case FetchResponseType.Ended:
                    return new FetchResourceMessage(
                        resourceId,
                        reader.read(FetchResourceEndedResponse)
                    );
                case FetchResponseType.Failed:
                    return new FetchResourceMessage(
                        resourceId,
                        reader.read(FetchResourceFailedResponse)
                    );
                case FetchResponseType.Invalid:
                    return new FetchResourceMessage(
                        resourceId,
                        reader.read(FetchResourceInvalidResponse)
                    );
                default:
                    throw new Error("Received invalid fetch resource response type: " + responseType);
                    break;
            }
        } else {
            const resourceId = reader.packed();
            const resourceLocation = reader.string();
            const fileHash = reader.bytes(32).buffer;
            const resourceType = reader.uint8();

            return new FetchResourceMessage(resourceId, resourceLocation, fileHash, resourceType);
        }
    }

    Serialize(
        writer: HazelWriter,
        direction: MessageDirection
    ) {
        if (direction === MessageDirection.Serverbound) {
            writer.packed(this.resourceId);
            writer.uint8(this.response.responseType);
            writer.write(this.response);
        } else {
            writer.packed(this.resourceId);
            writer.string(this.resourceLocation);
            writer.bytes(this.fileHash);
            writer.uint8(this.resourceType);
        }
    }
}
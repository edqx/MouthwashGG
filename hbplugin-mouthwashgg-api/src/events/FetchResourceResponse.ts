import { BasicEvent } from "@skeldjs/events";
import { Connection } from "@skeldjs/hindenburg";
import { FetchResourceResponse } from "mouthwash-types";

export class ClientFetchResourceResponseEvent extends BasicEvent {
    static eventName = "mwgg.client.fetchresponse" as const;
    eventName = "mwgg.client.fetchresponse" as const;

    constructor(
        public readonly client: Connection,
        public readonly resourceId: number,
        public readonly response: FetchResourceResponse
    ) {
        super();
    }
}
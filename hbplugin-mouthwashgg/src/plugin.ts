import dgram from "dgram";
import crypto from "crypto";

import {
    HindenburgPlugin,
    WorkerPlugin,
    Worker,
    RegisterMessage,
    MessageHandler,
    PacketContext,
    RegisterPrefab,
    Networkable,
    SendOption
} from "@skeldjs/hindenburg";

import {
    BeginCameraAnimationMessage,
    BeginPlayerAnimationMessage,
    CameraController,
    ClickBehaviour,
    ClickMessage,
    CloseHudMessage,
    CustomNetworkTransformGeneric,
    DeleteChatMessageMessage,
    DeleteGameOptionMessage,
    DisplayStartGameScreenMessage,
    DisplaySystemAnnouncementMessage,
    FetchResourceMessage,
    Graphic,
    ModstampSetStringMessage,
    MouthwashSpawnType,
    OverwriteGameOver,
    PingPacket,
    SetChatMessageMessage,
    SetChatVisibilityMessage,
    SetGameOptionMessage,
    SetHudStringMessage,
    SetHudVisibility,
    SetPlayerOpacityMessage,
    SetPlayerOutlineMessage,
    SetQrContentsMessage,
    SoundSource
} from "mouthwash-types";

import { MouthwashApiPlugin, ClientFetchResourceResponseEvent } from "hbplugin-mouthwashgg-api";
import { AccountService } from "./services";

@HindenburgPlugin("hbplugin-mouthwashgg", "1.0.0", "none")
@RegisterMessage(BeginCameraAnimationMessage)
@RegisterMessage(BeginPlayerAnimationMessage)
@RegisterMessage(ClickMessage)
@RegisterMessage(CloseHudMessage)
@RegisterMessage(DeleteChatMessageMessage)
@RegisterMessage(DeleteGameOptionMessage)
@RegisterMessage(DisplayStartGameScreenMessage)
@RegisterMessage(DisplaySystemAnnouncementMessage)
@RegisterMessage(FetchResourceMessage)
@RegisterMessage(ModstampSetStringMessage)
@RegisterMessage(OverwriteGameOver)
@RegisterMessage(PingPacket)
@RegisterMessage(SetChatMessageMessage)
@RegisterMessage(SetChatVisibilityMessage)
@RegisterMessage(SetGameOptionMessage)
@RegisterMessage(SetHudStringMessage)
@RegisterMessage(SetHudVisibility)
@RegisterMessage(SetPlayerOutlineMessage)
@RegisterMessage(SetPlayerOpacityMessage)
@RegisterMessage(SetQrContentsMessage)
@RegisterPrefab(MouthwashSpawnType.Button, [ CustomNetworkTransformGeneric, Graphic, ClickBehaviour ] as typeof Networkable[])
@RegisterPrefab(MouthwashSpawnType.SoundSource, [ SoundSource, CustomNetworkTransformGeneric ] as typeof Networkable[])
@RegisterPrefab(MouthwashSpawnType.CameraController, [ CameraController ] as typeof Networkable[])
export class MouthwashPlugin extends WorkerPlugin {
    accountService: AccountService;

    constructor(
        public readonly worker: Worker,
        public readonly config: any
    ) {
        super(worker, config);

        this.accountService = new AccountService(this);

        this.worker.socket.removeAllListeners();
        this.worker.socket.on("message", this.handlePossiblySignedMessage.bind(this));

        clearInterval(this.worker.pingInterval);
        
        this.worker.pingInterval = setInterval(() => {
            for (const [ , connection ] of this.worker.connections) {
                if (connection.sentPackets.length === 8 && connection.sentPackets.every(packet => !packet.acked)) {
                    this.logger.warn("%s failed to acknowledge any of the last 8 reliable packets sent, presumed dead",
                        connection);

                    connection.disconnect();
                    continue;
                }

                connection.sendPacket(new PingPacket);
                for (let i = 0; i < connection.sentPackets.length; i++) {
                    const sent = connection.sentPackets[i];
                    if (!sent.acked) {
                        if (Date.now() - sent.sentAt > 1500) {
                            this.worker["_sendPacket"](connection.remoteInfo, sent.buffer);
                            sent.sentAt = Date.now();
                        }
                    }
                }
            }
        }, 2000);
    }

    async handlePossiblySignedMessage(message: Buffer, rinfo: dgram.RemoteInfo) {
        if (message[0] === SendOption.Acknowledge) {
            return this.worker.handleMessage(message, rinfo);
        }

        if (message[0] === 0x80) {
            const uuid = message.slice(1, 5).toString("hex") + "-"
                + message.slice(5, 7).toString("hex") + "-"
                + message.slice(7, 9).toString("hex") + "-"
                + message.slice(9, 11).toString("hex") + "-"
                + message.slice(11, 17).toString("hex");

            const connection = this.worker.connections.get(rinfo.address + ":" + rinfo.port);
            const cachedSession = connection && this.accountService.connectionSessions.get(connection);

            const sessionInfo = (connection && cachedSession) || await this.accountService.getSession(uuid, rinfo.address);

            if (sessionInfo) {
                if (connection && !cachedSession) {
                    this.accountService.connectionSessions.set(connection, sessionInfo);
                }

                const hmacHash = message.slice(17, 37);
                const signedMessage = crypto.createHmac("sha1", sessionInfo.client_token).update(message.slice(37)).digest();
                if (crypto.timingSafeEqual(hmacHash, signedMessage)) {
                    return this.worker.handleMessage(message.slice(37), rinfo);
                }
            }
        }

        this.logger.warn("%s:%s sent unauthenticated message", rinfo.address + ":" + rinfo.port);
    }

    @MessageHandler(SetGameOptionMessage)
    async onSetGameOption(message: SetGameOptionMessage, context: PacketContext) {
        const room = context.sender.room;

        if (!room)
            return;

        const roomApi = room.loadedPlugins.get("hbplugin-mouthwashgg-api") as MouthwashApiPlugin;
        roomApi.gameOptions.handleMessage(message, context.sender);
    }

    @MessageHandler(FetchResourceMessage)
    async onFetchResourceResponse(message: FetchResourceMessage, context: PacketContext) {
        const room = context.sender.room;

        if (!room)
            return;

        await room.emit(
            new ClientFetchResourceResponseEvent(
                context.sender,
                message.resourceId,
                message.response
            )
        );
    }

    async getUser(client_id: string) {

    }
}
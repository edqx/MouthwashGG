import dgram from "dgram";

import {
    HindenburgPlugin,
    WorkerPlugin,
    Worker,
    RegisterMessage,
    MessageHandler,
    PacketContext,
    RegisterPrefab,
    Networkable
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
    constructor(
        public readonly worker: Worker,
        public readonly config: any
    ) {
        super(worker, config);

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

    handlePossiblySignedMessage(message: Buffer, rinfo: dgram.RemoteInfo) {
        if (message[0] === 0x80) {
            // todo
            return this.worker.handleMessage(message.slice(37), rinfo);
        }

        return this.worker.handleMessage(message, rinfo);
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
}
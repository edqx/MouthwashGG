import { PlayerData, ReliablePacket } from "@skeldjs/hindenburg";
import { SetQrContentsMessage } from "mouthwash-types";
import { MouthwashApiPlugin } from "../../plugin";

export interface QrCodeState {
    enabled: boolean;
    data: string;
}

export class QrCodeService {
    qrCodes: WeakMap<PlayerData, QrCodeState>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.qrCodes = new WeakMap;
    }

    private async _setQrCodeEnabled(enabled: boolean, qrCodeData: string, player: PlayerData) {
        this.qrCodes.set(player, {
            enabled,
            data: qrCodeData
        });
        
        const connection = this.plugin.room.connections.get(player.clientId);
        if (connection) {
            await connection.sendPacket(
                new ReliablePacket(
                    connection.getNextNonce(),
                    [
                        new SetQrContentsMessage(
                            enabled,
                            qrCodeData
                        )
                    ]
                )
            );
        }
    }

    async setQrEnabled(enabled: boolean) {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            const qrCodeData = this.qrCodes.get(player)?.data || "";
            promises.push(this._setQrCodeEnabled(enabled, qrCodeData, player));
        }
        await Promise.all(promises);
    }

    async setQrEnabledFor(enabled: boolean, setFor: PlayerData[]) {
        const promises = [];
        for (const connection of setFor) {
            const qrCodeData = this.qrCodes.get(connection)?.data || "";
            promises.push(this._setQrCodeEnabled(enabled, qrCodeData, connection));
        }
        await Promise.all(promises);
    }

    async setQrCode(qrCodeData: string) {
        const promises = [];
        for (const [ , player ] of this.plugin.room.players) {
            const enabled = this.qrCodes.get(player)?.enabled ?? true;
            promises.push(this._setQrCodeEnabled(enabled, qrCodeData, player));
        }
        await Promise.all(promises);
    }

    async setQrCodeFor(qrCodeData: string, setFor: PlayerData[]) {
        const promises = [];
        for (const connection of setFor) {
            const enabled = this.qrCodes.get(connection)?.enabled ?? true;
            promises.push(this._setQrCodeEnabled(enabled, qrCodeData, connection));
        }
        await Promise.all(promises);
    }

    getQrCode(connection: PlayerData) {
        return this.qrCodes.get(connection) || {
            enabled: true,
            data: ""
        };
    }
}
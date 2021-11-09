import { PlayerData, Room, RpcMessage } from "@skeldjs/hindenburg";

import {
    BeginPlayerAnimationMessage,
    CameraAnimationKeyframe,
    PlayerAnimationKeyframe,
    SetOpacityMessage,
    SetOutlineMessage,
    RGBA,
    DeadBody
} from "mouthwash-types";

import { MouthwashApiPlugin } from "../../plugin";

export class AnimationService {
    constructor(public readonly plugin: MouthwashApiPlugin) {}

    async beginCameraAnimation(
        player: PlayerData,
        keyframes: CameraAnimationKeyframe[],
        reset = true
    ) {
        const cameraController = await this.plugin.cameraControllers.getCameraFor(player);

        if (!cameraController)
            throw new Error("Connection does not have camera controller");

        await cameraController.beginAnimation(keyframes, reset);
    }

    private async _beginPlayerAnimation(
        player: PlayerData<Room>,
        keyframes: PlayerAnimationKeyframe[],
        reset = true,
        sendTo?: PlayerData[]
    ) {
        const playerControl = player.control;

        if (!playerControl)
            throw new Error("Player has no player control");

        const connections = this.plugin.room.getConnections(sendTo);

        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                playerControl.netId,
                new BeginPlayerAnimationMessage(
                    keyframes,
                    reset
                )
            )
        ], undefined, connections);
    }

    async beginPlayerAnimation(
        player: PlayerData<Room>,
        keyframes: PlayerAnimationKeyframe[],
        reset = true
    ) {
        await this._beginPlayerAnimation(player, keyframes, reset, undefined);
    }

    async beginPlayerAnimationFor(
        player: PlayerData<Room>,
        keyframes: PlayerAnimationKeyframe[],
        reset = true,
        setFor: PlayerData[]
    ) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);
            
        await this._beginPlayerAnimation(player, keyframes, reset, setFor);
    }

    private async _setOutline(player: PlayerData<Room>, enabled: boolean, color: RGBA, sendTo?: PlayerData[]) {
        const component = player.control;

        if (!component)
            return;
            
        const connections = this.plugin.room.getConnections(sendTo);

        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                component.netId,
                new SetOutlineMessage(
                    enabled,
                    color
                )
            )
        ], undefined, connections);
    }

    async setOutline(player: PlayerData<Room>, color: RGBA) {
        await this._setOutline(player, true, color);
    }

    async setOutlineFor(player: PlayerData<Room>, color: RGBA, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        await this._setOutline(player, true, color, setFor);
    }

    async clearOutline(player: PlayerData<Room>) {
        await this._setOutline(player, false, new RGBA(0, 0, 0, 0));
    }

    async clearOutlineFor(player: PlayerData<Room>, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        await this._setOutline(player, false, new RGBA(0, 0, 0, 0), setFor);
    }

    private async _setOpacity(player: PlayerData<Room>, opacity: number, sendTo?: PlayerData[]) {
        const component = player.control;

        if (!component)
            return;

        const connections = this.plugin.room.getConnections(sendTo);
            
        await this.plugin.room.broadcastMessages([
            new RpcMessage(
                component.netId,
                new SetOpacityMessage(opacity)
            )
        ], undefined, connections);
    }

    async setOpacity(player: PlayerData<Room>, opacity: number) {
        await this._setOpacity(player, opacity, undefined);
    }

    async setOpacityFor(player: PlayerData<Room>, opacity: number, setFor: PlayerData[]) {
        if (!Array.isArray(setFor))
            throw new TypeError("Expected array of players for 'setFor', got " + typeof setFor);

        await this._setOpacity(player, opacity, setFor);
    }
}
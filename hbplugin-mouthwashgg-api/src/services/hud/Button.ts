import { EventEmitter, ExtractEventTypes } from "@skeldjs/events";
import { PlayerData, Room, Vector2 } from "@skeldjs/hindenburg";
import { ClickBehaviour, CustomNetworkTransformGeneric, EdgeAlignment, Graphic, KeyCode, RGBA } from "mouthwash-types";
import { HudService } from "./HudService";
import { ButtonClickEvent } from "../../events";
import { Asset } from "../assets";

export interface ButtonSpawnInfo {
    position: Vector2;
    alignment: EdgeAlignment;
    asset: Asset;
    maxTimer: number;
    currentTime: number;
    saturated: boolean;
    color: RGBA;
    isCountingDown: boolean;
    z: number;
    attachedTo: number;
    keys: KeyCode[];
}

export type ButtonEvents = ExtractEventTypes<[ ButtonClickEvent ]>;

export class Button extends EventEmitter<ButtonEvents> {
    graphic: Graphic;
    clickBehaviour: ClickBehaviour;

    constructor(
        public readonly hudService: HudService,
        public readonly id: string,
        public readonly player: PlayerData,
        public readonly customNetworkTransform: CustomNetworkTransformGeneric
    ) {
        super();

        this.graphic = customNetworkTransform.components[1] as Graphic;
        this.clickBehaviour = customNetworkTransform.components[2] as ClickBehaviour;

        this.clickBehaviour.on("mwgg.clickbehaviour.click", async () => {
            await this.emit(new ButtonClickEvent(this));
        });
    }

    get maxTimer() {
        return this.clickBehaviour.maxTimer;
    }

    get currentTime() {
        return this.clickBehaviour.currentTime;
    }

    get saturated() {
        return this.clickBehaviour.saturated;
    }

    get color() {
        return this.clickBehaviour.color;
    }

    get countingDown() {
        return this.clickBehaviour.countingDown;
    }

    get keys() {
        return this.clickBehaviour.keys;
    }

    destroy() {
        for (let i = 0; i < this.customNetworkTransform.components.length; i++) {
            this.customNetworkTransform.components[i].despawn();
        }
        this.hudService.getPlayerHud(this.player).buttons.delete(this.id);
    }

    setColor(color: RGBA) {
        this.clickBehaviour.setColor(color);
    }

    setSaturated(saturated: boolean) {
        this.clickBehaviour.setSaturated(saturated);
    }

    setCountingDown(countingDown: boolean) {
        this.clickBehaviour.setCountingDown(countingDown);
    }

    setCurrentTime(time: number) {
        this.clickBehaviour.setCurrentTime(time);
    }

    setMaxTimer(maxTimer: number) {
        this.clickBehaviour.setMaxTimer(maxTimer);
    }

    async click() {
        await this.clickBehaviour.click();
    }

    getNearestPlayer(players: PlayerData<Room>[], range: number, filter?: (player: PlayerData<Room>) => boolean) {
        const inRange = this.getPlayersInRange(players, range, filter);
        let nearestDistance = Infinity;
        let nearestPlayer: PlayerData<Room>|undefined = undefined;
        for (let i = 0; i < inRange.length; i++) {
            const player = inRange[i];
            const dist = player.transform?.position.dist(this.player.transform!.position);
            if (dist !== undefined && dist < nearestDistance) {
                nearestDistance = dist;
                nearestPlayer = player;
            }
        }
        return nearestPlayer;
    }

    getPlayersInRange(players: PlayerData<Room>[], range: number, filter?: (player: PlayerData<Room>) => boolean) {
        if (!this.player.transform)
            return [];

        return players
            .filter(player => {
                if (player === this.player)
                    return false;

                if (!player.transform)
                    return false;

                if (this.player.transform!.position.dist(player.transform.position) > range)
                    return false;

                if (player.info?.isDead)
                    return false;

                return !filter || filter(player);
            });
    }
}
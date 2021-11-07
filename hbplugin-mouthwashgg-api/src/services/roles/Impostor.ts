import { PlayerData, PlayerDieEvent, Room } from "@skeldjs/hindenburg";
import { EnumValue, HudLocation, KeyCode, NumberValue, Palette, Priority } from "mouthwash-types";

import {
    BaseRole,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleObjective
} from "../../api";

import { ButtonFixedUpdateEvent } from "../../events";
import { AssetReference } from "../assets";
import { Button } from "../buttons";
import { EmojiService } from "../emojis";
import { AnyImpostorKillDistance, DefaultRoomOptionName } from "../gameOptions";

const killDistanceToRange = {
    "Short": 1,
    "Medium": 2,
    "Long": 3
};

@MouthwashRole("Impostor", RoleAlignment.Impostor, Palette.impostorRed, EmojiService.getEmoji("impostor"))
@RoleObjective("Sabotage and kill the crewmates")
export class Impostor extends BaseRole {
    protected _killRange: number;
    protected _killCooldown: number;
    protected _target?: PlayerData<Room>;

    protected _killButton?: Button;

    constructor(player: PlayerData<Room>) {
        super(player);

        this._killRange = killDistanceToRange[this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillDistance)?.getValue<EnumValue<AnyImpostorKillDistance>>().selectedOption || "Short"];
        this._killCooldown = this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillCooldown)?.getValue<NumberValue>().value || 45;

        this._target = undefined;
    }

    async onReady() {
        this.api.hudService.setTaskInteraction(this.player, false);
        this.api.hudService.setHudStringFor(HudLocation.TaskText, "fake-tasks", Palette.impostorRed.text("Fake tasks:"), Priority.Z, [ this.player ]);
        this.player.info?.setImpostor(true);

        this._killButton = await this.spawnButton(
            "kill-button",
            new AssetReference("PggResources/Global", "Assets/Mods/OfficialAssets/KillButton.png"),
            {
                maxTimer: this._killCooldown,
                currentTime: 10,
                isCountingDown: true,
                keys: [ KeyCode.Q ]
            }
        );

        this._killButton.on("mwgg.button.click", ev => {
            if (!this._killButton || this._killButton.currentTime > 0)
                return;

            if (!this._target)
                return;

            if (this._target.transform) {
                this.player.transform?.snapTo(this._target.transform.position);
            }
            this._target.control?.murderPlayer(this._target);
            this._killButton?.setCurrentTime(this._killButton.maxTimer);
        });
    }

    getTarget(players: PlayerData<Room>[]) {
        if (!this._killButton) {
            return undefined;
        }

        if (this.player.physics && this.player.physics.ventid > -1) {
            return undefined;
        }

        return this._killButton.getNearestPlayer(players, this._killRange);
    }

    @EventListener("mwgg.button.fixedupdate", ListenerType.Room)
    onButtonFixedUpdate(ev: ButtonFixedUpdateEvent) {
        const oldTarget = this._target;
        this._target = this.getTarget(ev.players);

        if (this._target !== oldTarget) {
            if (oldTarget) {
                this.api.animationService.setOutlineFor(oldTarget, Palette.null, [ this.player ]);
            }
            if (this._target) {
                this.api.animationService.setOutlineFor(this._target, Palette.impostorRed, [ this.player ]);
            }
        }

        this._killButton?.setSaturated(!!this._target);
    }
    
    @EventListener("player.die", ListenerType.Player)
    onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._killButton?.destroy();
        this._killButton = undefined;
    }
}
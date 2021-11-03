import { PlayerData, PlayerDieEvent, Room } from "@skeldjs/hindenburg";
import { EnumValue, KeyCode, NumberValue, Palette } from "mouthwash-types";
import { ButtonFixedUpdateEvent } from "../../events";

import {
    AnyImpostorKillDistance,
    AssetReference,
    Button,
    DefaultRoomOptionName,
    EmojiService
} from "../../services";

import { BaseRole } from "../BaseRole";
import { ListenerType, RoleAlignment } from "../enums";
import { EventListener, MouthwashRole, RoleObjective } from "../hooks";

const killDistanceToRange = {
    "Short": 1,
    "Normal": 2,
    "Long": 3
};

@MouthwashRole("Impostor", RoleAlignment.Impostor, Palette.impostorRed(), EmojiService.getEmoji("impostor"))
@RoleObjective("Sabotage and kill the crewmates")
export class Impostor extends BaseRole {
    protected _killRange: number;
    protected _killCooldown: number;
    protected _target?: PlayerData<Room>;

    protected _killButton?: Button;

    constructor(player: PlayerData<Room>) {
        super(player);

        this.api.hudService.setTaskInteraction(player, false);

        if (this.player.playerId !== undefined) {
            this.room.gameData?.players.get(this.player.playerId)?.setImpostor(true);
        }

        this._killRange = killDistanceToRange[this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillDistance)?.getValue<EnumValue<AnyImpostorKillDistance>>().selectedOption || "Short"];
        this._killCooldown = this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillCooldown)?.getValue<NumberValue>().value || 45;

        this._target = undefined;
    }

    async onReady() {
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

    @EventListener("mwgg.button.fixedupdate", ListenerType.Room)
    onButtonFixedUpdate(ev: ButtonFixedUpdateEvent) {
        if (!this._killButton) {
            if (this._target) {
                this.api.animationService.setOutlineFor(this._target, Palette.null(), [ this.player ]);
            }
            this._target = undefined;
            return;
        }

        if (this.player.physics && this.player.physics.ventid > -1) {
            this._target = undefined;
            return;
        }

        const playersInRange = this._killButton.getPlayersInRange(ev.players, this._killRange);
        const oldTarget = this._target;
        this._target = playersInRange[0];

        if (!oldTarget && this._target) {
            this.api.animationService.setOutlineFor(this._target, Palette.impostorRed(), [ this.player ]);
        } else if (oldTarget && !this._target) {
            this.api.animationService.setOutlineFor(oldTarget, Palette.null(), [ this.player ]);
        }

        this._killButton.setSaturated(!!this._target);
    }
    
    @EventListener("player.die", ListenerType.Player)
    onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._killButton?.destroy();
        this._killButton = undefined;
    }
}
import { PlayerData, PlayerDieEvent, PlayerStartMeetingEvent, Room, SystemSabotageEvent, SystemStatus, SystemType } from "@skeldjs/hindenburg";

import {
    AssetReference,
    BaseRole,
    Button,
    Crewmate,
    EmojiService,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleAssignment,
    RoleGameOption,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import { EnumValue, GameOption, NumberValue, Palette, RGBA } from "mouthwash-types";
import { TownOfPolusOptionName } from "../gamemode";

const engineerColor = new RGBA(248, 191, 20, 255);
const fixAsset = new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Fix.png");

export const EngineerOptionName = {
    EngineerUses: `${engineerColor.text("Engineer")} Uses`
} as const;

export enum EngineerUses {
    PerRound = "Per Round",
    PerMatch = "Per Match"
}

@MouthwashRole("Engineer", RoleAlignment.Crewmate, engineerColor, EmojiService.getEmoji("engineer"))
@RoleObjective("Fix sabotages and finish your tasks")
export class Engineer extends Crewmate {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const engineerOptions = new Map<any, any>([]);

        const engineerProbability = gameOptions.get(TownOfPolusOptionName.EngineerProbability);
        if (engineerProbability && engineerProbability.getValue<NumberValue>().value > 0) {
            engineerOptions.set(EngineerOptionName.EngineerUses, new RoleGameOption(EngineerOptionName.EngineerUses, new EnumValue([ "Per Round", "Per Match" ], 0)));
        }

        return engineerOptions as Map<string, RoleGameOption>;
    }

    private _lastSabotagedSystem?: SystemStatus;
    private _fixButton?: Button;

    private _engineerUses: EngineerUses;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._engineerUses = this.api.gameOptions.gameOptions.get(EngineerOptionName.EngineerUses)?.getValue<EnumValue<EngineerUses>>().selectedOption || EngineerUses.PerMatch;
    }

    async onReady() {
        this._fixButton = await this.spawnFixButton();

        this._fixButton.on("mwgg.button.click", ev => {
            if (this._lastSabotagedSystem) {
                this._lastSabotagedSystem.repair();
                this._fixButton?.destroy();
                this._fixButton = undefined;
            }
        });
    }

    getStartGameScreen(playerRoles: RoleAssignment[], impostorCount: number) {
        return BaseRole.prototype.getStartGameScreen.call(this, playerRoles, impostorCount);
    }

    async spawnFixButton() {
        return await this.spawnButton("fix-button1", fixAsset, {
            maxTimer: 0.1,
            currentTime: 0,
            saturated: false,
            color: Palette.white(),
            isCountingDown: false
        });
    }

    @EventListener("system.sabotage", ListenerType.Room)
    onSystemSabotage(ev: SystemSabotageEvent<Room>) {
        this._lastSabotagedSystem = ev.system;
        this._fixButton?.setSaturated(true);
    }

    @EventListener("player.startmeeting", ListenerType.Room)
    async onStartMeeting(ev: PlayerStartMeetingEvent<Room>) {
        if (this._engineerUses === EngineerUses.PerRound && !this.player.info?.isDead) {
            this._fixButton = await this.spawnFixButton();
        }
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._fixButton?.destroy();
        this._fixButton = undefined;
    }
}
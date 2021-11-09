import {
    AmongUsEndGames,
    EndGameIntent,
    GameOverReason,
    PlayerData,
    PlayerDieEvent,
    PlayerStartMeetingEvent,
    Room,
    RoomFixedUpdateEvent
} from "@skeldjs/hindenburg";

import {
    AnyKillDistance,
    AssetReference,
    BaseRole,
    Button,
    ButtonFixedUpdateEvent,
    EmojiService,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import {
    EnumValue,
    GameOption,
    HudLocation,
    KeyCode,
    NumberValue,
    Palette,
    Priority,
    RGBA
} from "mouthwash-types";

import { TownOfPolusOptionName } from "../gamemode";

const poisonerColor = new RGBA(160, 0, 252, 255);

export const PoisonerOptionName = {
    PoisonerCooldown: `${poisonerColor.text("Poisoner")} Cooldown`,
    PoisonerDuration: `${poisonerColor.text("Poisoner")} Duration`,
    PoisonerRange: `${poisonerColor.text("Poisoner")} Range`,
} as const;

const killDistanceToRange = {
    "Really Short": 0.5,
    "Short": 1,
    "Medium": 2,
    "Long": 3
};

@MouthwashRole("Poisoner", RoleAlignment.Impostor, poisonerColor, EmojiService.getEmoji("poisoner"))
@RoleObjective("Sabotage and poison the crewmates")
export class Poisoner extends BaseRole {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const poisonerProbability = gameOptions.get(TownOfPolusOptionName.PoisonerProbability);
        if (poisonerProbability && poisonerProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(PoisonerOptionName.PoisonerCooldown, new RoleGameOption(PoisonerOptionName.PoisonerCooldown, new NumberValue(30, 2.5, 10, 60, false, "{0}s")));
            roleOptions.set(PoisonerOptionName.PoisonerDuration, new RoleGameOption(PoisonerOptionName.PoisonerDuration, new NumberValue(15, 5, 10, 60, false, "{0}s")));
            roleOptions.set(PoisonerOptionName.PoisonerRange, new RoleGameOption(PoisonerOptionName.PoisonerRange, new EnumValue(["Really Short", "Short", "Medium", "Long"], 1)));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    private _poisonerCooldown: number;
    private _poisonerDuration: number;
    private _poisonerRange: number;
    
    private _poisonButton?: Button;
    private _target?: PlayerData<Room>;

    private _lastHudUpdate: number;

    poisonedPlayers: Map<PlayerData, number>;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._poisonerCooldown = this.api.gameOptions.gameOptions.get(PoisonerOptionName.PoisonerCooldown)?.getValue<NumberValue>().value || 30;
        this._poisonerDuration = this.api.gameOptions.gameOptions.get(PoisonerOptionName.PoisonerDuration)?.getValue<NumberValue>().value || 15;
        this._poisonerRange = killDistanceToRange[this.api.gameOptions.gameOptions.get(PoisonerOptionName.PoisonerRange)?.getValue<EnumValue<AnyKillDistance>>().selectedOption || "Short"];

        this._lastHudUpdate = 0;

        this.poisonedPlayers = new Map;
    }

    async onReady() {
        await this.giveFakeTasks();
        this.player.info?.setImpostor(true);

        this._poisonButton = await this.spawnButton(
            "poison-button",
            new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Poison.png"),
            {
                maxTimer: this._poisonerCooldown,
                currentTime: this._poisonerCooldown,
                isCountingDown: true,
                keys: [ KeyCode.Q ]
            }
        );

        this._poisonButton?.on("mwgg.button.click", ev => {
            if (!this._poisonButton || this._poisonButton.currentTime > 0 || !this._target || this.player.info?.isDead)
                return;

            this.api.nameService.addColorFor(this._target, poisonerColor, [ this.player ]);
            this.poisonedPlayers.set(this._target, this._poisonerDuration);
            this._poisonButton.setCurrentTime(this._poisonButton.maxTimer);
            this.updateTaskText(0);
        });
    }

    async onRemove() {
        const promises = [];
        this._poisonButton?.destroy();
        for (const [ player ] of this.poisonedPlayers) {
            promises.push(this._removePlayer(player));
        }
        await Promise.all(promises);
    }
    
    checkMurderEndGame(victim: PlayerData) {
        if (!this.room.gameData)
            return;
        let aliveCrewmates = 0;
        let aliveImpostors = 0;
        for (const [, playerInfo] of this.room.gameData.players) {
            if (!playerInfo.isDisconnected && !playerInfo.isDead) {
                if (playerInfo.isImpostor) {
                    aliveImpostors++;
                }
                else {
                    aliveCrewmates++;
                }
            }
        }
        if (aliveCrewmates <= aliveImpostors) {
            this.room.registerEndGameIntent(new EndGameIntent(AmongUsEndGames.PlayersKill, GameOverReason.ImpostorByKill, {
                killer: this.player,
                victim,
                aliveCrewmates,
                aliveImpostors
            }));
        }
    }

    getTarget(players: PlayerData<Room>[]) {
        if (!this._poisonButton) {
            return undefined;
        }

        if (this.player.physics && this.player.physics.ventid > -1) {
            return undefined;
        }

        return this._poisonButton.getNearestPlayer(players, this._poisonerRange, player => !this.poisonedPlayers.has(player));
    }

    private async _removePlayer(player: PlayerData) {
        await Promise.all([
            this.api.hudService.removeHudStringFor(HudLocation.TaskText, "poisoned-text", [ player ]),
            this.api.nameService.removeColorFor(player, poisonerColor, [ this.player ])
        ]);
        this.poisonedPlayers.delete(player);
    }

    async updateTaskText(delta: number) {
        let out = "";
        let i = 0;
        for (const [ player, timeRemaining ] of this.poisonedPlayers) {
            if (player.info?.isDead) {
                this._removePlayer(player);
                continue;
            }
            const nextTimeRemaining = timeRemaining - delta / 1000;
            if (nextTimeRemaining <= 0) {
                player.control?.kill("poison").then(() => {
                    this.checkMurderEndGame(player);
                    this.api.deadBodyService.spawnDeadBody(player);
                });
                this._removePlayer(player);
                continue;
            }
            this.poisonedPlayers.set(player, nextTimeRemaining);

            const secondsRemaining = Math.ceil(nextTimeRemaining);
            
            this.api.hudService.setHudStringFor(HudLocation.TaskText, "poisoned-text", poisonerColor.text("You have been poisoned: " + secondsRemaining + "s"), Priority.A, [ player ]);

            const playerName = this.api.nameService.getPlayerName(player, this.player);
            if (i > 0) {
                out += "\n";
            }
                
            out += playerName + " (" + secondsRemaining + "s" + ")";
            i++;
        }
        await this.api.hudService.setHudStringFor(
            HudLocation.TaskText,
            "poisoned-players",
            out,
            Priority.A,
            [ this.player ]
        );
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._poisonButton?.destroy();
        this._poisonButton = undefined;
    }

    @EventListener("player.startmeeting", ListenerType.Room)
    async onStartMeeting(ev: PlayerStartMeetingEvent<Room>) {
        for (const [ poisonedPlayer ] of this.poisonedPlayers) {
            poisonedPlayer.control?.kill("poison").then(() => {
                this.checkMurderEndGame(poisonedPlayer);
            });
            this._removePlayer(poisonedPlayer);
        }
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
                this.api.animationService.setOutlineFor(this._target, poisonerColor, [ this.player ]);
            }
        }

        this._poisonButton?.setSaturated(!!this._target);
    }

    @EventListener("room.fixedupdate", ListenerType.Room)
    onFixedUpdate(ev: RoomFixedUpdateEvent) {
        const now = Date.now();
        const delta = now - this._lastHudUpdate;
        if (delta > 1000) {
            this.updateTaskText(delta);
            this._lastHudUpdate = now;
        }
    }
}
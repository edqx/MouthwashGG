import {
    AmongUsEndGames,
    EndGameIntent,
    GameOverReason,
    PlayerData,
    PlayerDieEvent,
    PlayerInfo,
    Room
} from "@skeldjs/hindenburg";

import {
    AnyKillDistance,
    AssetReference,
    BaseRole,
    Button,
    ButtonFixedUpdateEvent,
    EmojiService,
    EndGameScreen,
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
    KeyCode,
    NumberValue,
    Palette,
    RGBA,
    WinSound
} from "mouthwash-types";

import { TownOfPolusOptionName } from "../gamemode";

const sheriffColor = new RGBA(196, 150, 69, 255);

const killDistanceToRange = {
    "Really Short": 0.5,
    "Short": 1,
    "Medium": 2,
    "Long": 3
};

export const SheriffOptionName = {
    SheriffCooldown: `${sheriffColor.text("Sheriff")} Cooldown`,
    SheriffRange: `${sheriffColor.text("Sheriff")} Range`
} as const;

@MouthwashRole("Sheriff", RoleAlignment.Crewmate, sheriffColor, EmojiService.getEmoji("sheriff"))
@RoleObjective("Kill the impostors and finish your tasks")
export class Sheriff extends BaseRole {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const sheriffProbability = gameOptions.get(TownOfPolusOptionName.SheriffProbability);
        if (sheriffProbability && sheriffProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(SheriffOptionName.SheriffCooldown, new RoleGameOption(SheriffOptionName.SheriffCooldown, new NumberValue(30, 2.5, 10, 60, false, "{0}s")));
            roleOptions.set(SheriffOptionName.SheriffRange, new RoleGameOption(SheriffOptionName.SheriffRange, new EnumValue(["Really Short", "Short", "Medium", "Long"], 1)));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    private _sheriffCooldown: number;
    private _sheriffRange: number;
    private _target?: PlayerData<Room>;

    private _shootButton?: Button;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._sheriffCooldown = this.api.gameOptions.gameOptions.get(SheriffOptionName.SheriffCooldown)?.getValue<NumberValue>().value || 30;
        this._sheriffRange = killDistanceToRange[this.api.gameOptions.gameOptions.get(SheriffOptionName.SheriffRange)?.getValue<EnumValue<AnyKillDistance>>().selectedOption || "Really Short"];
    }

    async onReady() {
        this._shootButton = await this.spawnButton(
            "shoot-button",
            new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Shoot.png"),
            {
                maxTimer: this._sheriffCooldown,
                currentTime: this._sheriffCooldown,
                isCountingDown: true,
                keys: [ KeyCode.Q ]
            }
        );

        this._shootButton?.on("mwgg.button.click", async ev => {
            const target = this._target;
            if (!this._shootButton || this._shootButton.currentTime > 0 || !target || this.player.info?.isDead)
                return;
                
            await this.quietMurder(target);
            await target.control?.murderPlayer(target);
            const idx = this.room.endGameIntents.findIndex(intent =>
                intent.name === AmongUsEndGames.PlayersKill && intent.metadata.victim === target);
            
            if (idx > 0) {
                this.room.endGameIntents.splice(idx, 1);
            }

            if (target.info?.isImpostor) {
                this._shootButton.setCurrentTime(this._shootButton.maxTimer);
                this.checkMurderEndGame();
            } else {
                await this.quietMurder(this.player);

                const players = [];
                let aliveCrewmates = 0;
                let aliveImpostors = 0;
                if (this.room.gameData) {
                    for (const [, playerInfo] of this.room.gameData.players) {
                        if (!playerInfo.isDisconnected && !playerInfo.isDead) {
                            if (playerInfo.isImpostor) {
                                aliveImpostors++;
                            } else {
                                aliveCrewmates++;
                            }
                        }
                        players.push(playerInfo);
                    }
                }
                if (aliveImpostors >= aliveCrewmates) {
                    this.room.registerEndGameIntent(
                        new EndGameIntent(
                            "sheriff misfire",
                            GameOverReason.None,
                            {
                                endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerInfo => {
                                    return [
                                        playerInfo.playerId,
                                        {
                                            titleText: playerInfo.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                            subtitleText: `The ${Palette.impostorRed.text("Impostors")} won by ${sheriffColor.text("Sheriff")} misfire!`,
                                            backgroundColor: Palette.impostorRed,
                                            yourTeam: RoleAlignment.Impostor,
                                            winSound: WinSound.ImpostorWin,
                                            hasWon: playerInfo.isImpostor
                                        }
                                    ];
                                }))
                            }
                        )
                    );
                }
            }
        });
    }

    async onRemove() {
        this._shootButton?.destroy();
    }

    async quietMurder(victim: PlayerData) {
        await victim.control?.murderPlayer(victim);
        const idx = this.room.endGameIntents.findIndex(intent =>
            intent.name === AmongUsEndGames.PlayersKill && intent.metadata.victim === victim);
        
        if (idx > 0) {
            this.room.endGameIntents.splice(idx, 1);
        }
    }

    checkMurderEndGame() {
        if (!this.room.gameData)
            return;
        const players = [];
        let aliveCrewmates = 0;
        let aliveImpostors = 0;
        for (const [, playerInfo] of this.room.gameData.players) {
            if (!playerInfo.isDisconnected && !playerInfo.isDead) {
                if (playerInfo.isImpostor) {
                    aliveImpostors++;
                } else {
                    aliveCrewmates++;
                }
            }
            players.push(playerInfo);
        }
        if (aliveCrewmates === 1 && aliveImpostors === 1) {
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "sheriff stalemate",
                    GameOverReason.None,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerInfo => {
                            return [
                                playerInfo.playerId,
                                {
                                    titleText: Palette.grey.text("Stalemate"),
                                    subtitleText: `The ${Palette.grey.text("Stalemate")} is at odds with an ${Palette.impostorRed.text("Impostor")}`,
                                    backgroundColor: Palette.grey,
                                    yourTeam: [],
                                    winSound: WinSound.Disconnect,
                                    hasWon: false
                                }
                            ];
                        }))
                    }
                )
            );
        } if (aliveImpostors <= 0) {
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "sheriff kill",
                    GameOverReason.None,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerInfo => {
                            return [
                                playerInfo.playerId,
                                {
                                    titleText: !playerInfo.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The ${sheriffColor.text("Sheriff")} killed the last ${Palette.impostorRed.text("Impostor")}!`,
                                    backgroundColor: sheriffColor,
                                    yourTeam: [ this.player ],
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: !playerInfo.isImpostor
                                }
                            ];
                        }))
                    }
                )
            );
        }
    }

    getTarget(players: PlayerData<Room>[]) {
        if (!this._shootButton) {
            return undefined;
        }

        if (this.player.physics && this.player.physics.ventid > -1) {
            return undefined;
        }

        return this._shootButton.getNearestPlayer(players, this._sheriffRange);
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
                this.api.animationService.setOutlineFor(this._target, sheriffColor, [ this.player ]);
            }
        }

        this._shootButton?.setSaturated(!!this._target);
    }

    @EventListener("player.die", ListenerType.Player)
    onPlayerDie(ev: PlayerDieEvent) {
        this._shootButton?.destroy();
    }
}
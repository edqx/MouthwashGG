import {
    EndGameIntent,
    GameOverReason,
    PlayerData,
    PlayerDieEvent,
    Room
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    BaseRole,
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
    GameOption,
    NumberValue,
    Palette,
    RGBA
} from "mouthwash-types";

const jesterColor = new RGBA(255, 140, 238, 255);

export const JesterOptionName = {

} as const;

@MouthwashRole("Jester", RoleAlignment.Neutral, jesterColor, EmojiService.getEmoji("jester"))
@RoleObjective("Trick everyone into voting you out")
export class Jester extends BaseRole {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const jesterProbability = gameOptions.get("");
        if (jesterProbability && jesterProbability.getValue<NumberValue>().value > 0) {

        }

        return roleOptions as Map<string, RoleGameOption>;
    }



    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);
    }

    async onReady() {
        await this.giveFakeTasks();
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent) {
        if (ev.reason === "exiled") {
            const players = this.api.getEndgamePlayers();
            const myPlayerInfo = this.player.info;

            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "jester voted out",
                    GameOverReason.None,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerInfo => {
                            return [
                                playerInfo.playerId,
                                {
                                    titleText: playerInfo === myPlayerInfo ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The ${jesterColor.text("Jester")} was voted out`,
                                    backgroundColor: jesterColor,
                                    yourTeam: [ this.player ],
                                    winSound: new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/JesterSfx.mp3"),
                                    hasWon: playerInfo.isImpostor
                                }
                            ];
                        }))
                    }
                )
            );
        }
    }
}
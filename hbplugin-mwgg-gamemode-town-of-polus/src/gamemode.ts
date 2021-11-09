import { HindenburgPlugin, PreventLoad } from "@skeldjs/hindenburg";
import { GameOption, NumberValue, Priority } from "mouthwash-types";

import {
    RegisterBundle,
    BaseGamemodePlugin,
    DefaultRoomCategoryName,
    GamemodePlugin,
    RegisterRole
} from "hbplugin-mouthwashgg-api";

import {
    Engineer,
    IdentityThief,
    Jester,
    Poisoner,
    Sheriff
} from "./roles";

export const TownOfPolusOptionName = {
    EngineerProbability: `${Engineer.metadata.themeColor.text("Engineer")} Probability`,
    SheriffProbability: `${Sheriff.metadata.themeColor.text("Sheriff")} Probability`,
    IdentityThiefProbability: `${IdentityThief.metadata.themeColor.text("Identity Thief")} Probability`,
    JesterProbability: `${Jester.metadata.themeColor.text("Jester")} Probability`,
    PoisonerProbability: `${Poisoner.metadata.themeColor.text("Poisoner")} Probability`
} as const;

@PreventLoad
@GamemodePlugin({
    id: "town-of-polus",
    name: "Town of Polus",
    version: "1.0.0",
    description: "A spin on the orignial Town of Us game, available to play on Mouthwash.gg.",
    author: "Edward Smale"
})
@RegisterRole(Poisoner)
@RegisterRole(IdentityThief)
@RegisterRole(Jester)
@RegisterRole(Sheriff)
@RegisterRole(Engineer)
@RegisterBundle("PggResources/TownOfPolus")
@HindenburgPlugin("hbplugin-mwgg-gamemode-town-of-polus", "1.0.0", "none")
export class TownOfPolusGamemodePlugin extends BaseGamemodePlugin {
    getGameOptions() {
        return new Map<any, any>([
            ...this.api.createDefaultOptions().entries(),
            [TownOfPolusOptionName.EngineerProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.EngineerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.E)],
            [TownOfPolusOptionName.SheriffProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.SheriffProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.E + 1)],
            [TownOfPolusOptionName.IdentityThiefProbability, new GameOption(DefaultRoomCategoryName.NeutralRoles, TownOfPolusOptionName.IdentityThiefProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.F)],
            [TownOfPolusOptionName.JesterProbability, new GameOption(DefaultRoomCategoryName.NeutralRoles, TownOfPolusOptionName.JesterProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.F + 1)],
            [TownOfPolusOptionName.PoisonerProbability, new GameOption(DefaultRoomCategoryName.ImpostorRoles, TownOfPolusOptionName.PoisonerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.G + 2)]
        ]);
    }

    getRoleCounts() {
        return [
            {
                role: Engineer,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.EngineerProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Sheriff,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.SheriffProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: IdentityThief,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.IdentityThiefProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Jester,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.JesterProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Poisoner,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.PoisonerProbability)?.getValue<NumberValue>().value || 0)
            }
        ];
    }
}
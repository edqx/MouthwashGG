import {
    EventListener,
    HindenburgPlugin,
    PlayerSendChatEvent,
    PreventLoad,
    Room
} from "@skeldjs/hindenburg";

import { EnumValue, GameOption, NumberValue } from "mouthwash-types";

import {
    RegisterBundle,
    BaseGamemodePlugin,
    DefaultRoomCategoryName,
    GamemodePlugin,
    GameOptionPriority,
    RegisterRole
} from "hbplugin-mouthwashgg-api";

import { Engineer } from "./roles";

export const TownOfPolusOptionName = {
    EngineerProbability: `${Engineer.metadata.themeColor.text("Engineer")} Probability`
} as const;

@PreventLoad
@GamemodePlugin({
    id: "town-of-polus",
    name: "Town of Polus",
    version: "1.0.0",
    description: "A spin on the orignial Town of Us game, available to play on Mouthwash.gg.",
    author: "Edward Smale"
})
@RegisterRole(Engineer)
@RegisterBundle("PggResources/TownOfPolus")
@HindenburgPlugin("hbplugin-mwgg-gamemode-town-of-polus", "1.0.0", "none")
export class TownOfPolusGamemodePlugin extends BaseGamemodePlugin {
    getGameOptions() {
        return new Map<any, any>([
            ...this.api.createDefaultOptions().entries(),
            [TownOfPolusOptionName.EngineerProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.EngineerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.E)],
        ]);
    }

    getRoleCounts() {
        return [
            {
                role: Engineer,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.EngineerProbability)?.getValue<NumberValue>().value || 0)
            }
        ];
    }
}
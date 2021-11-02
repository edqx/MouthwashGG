import {
    EventListener,
    HindenburgPlugin,
    PlayerSendChatEvent,
    PreventLoad,
    Room
} from "@skeldjs/hindenburg";

import { EnumValue, GameOption, NumberValue } from "mouthwash-types";

import {
    BaseGamemodePlugin,
    DefaultRoomCategoryName,
    GamemodePlugin,
    GameOptionPriority,
    RegisterRole
} from "hbplugin-mouthwashgg-api";

import { Engineer } from "./roles";

export enum TownOfPolusOptionName {
    EngineerProbability = "<color=#f8bf14>Engineer</color> Probability",
    EngineerUses = "<color=#f8bf14>Engineer</color> Uses"
}

export type TownofPolusOptions = {
    [TownOfPolusOptionName.EngineerProbability]: NumberValue;
    [TownOfPolusOptionName.EngineerUses]: EnumValue<"Per Round"|"Per Match">;
};

@PreventLoad
@GamemodePlugin({
    id: "town-of-polus",
    name: "Town of Polus",
    version: "1.0.0",
    description: "A spin on the orignial Town of Us game, available to play on Mouthwash.gg.",
    author: "Edward Smale"
})
@RegisterRole(Engineer)
@HindenburgPlugin("hbplugin-mwgg-gamemode-town-of-polus", "1.0.0", "none")
export class TownOfPolusGamemodePlugin extends BaseGamemodePlugin {
    getGameOptions() {
        return new Map<any, any>([
            ...this.api.createDefaultOptions().entries(),
            [TownOfPolusOptionName.EngineerProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.EngineerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.E)],
        ]);
    }

    @EventListener("player.chat")
    async onPlayerChat(ev: PlayerSendChatEvent<Room>) {
        const role = new Engineer(ev.player);
        await role.onReady();
    }
}
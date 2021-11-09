import {
    PlayerData,
    Room
} from "@skeldjs/hindenburg";

import {
    BaseRole,
    EmojiService,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import {
    GameOption,
    NumberValue,
    RGBA
} from "mouthwash-types";

const roleNameColor = new RGBA(0, 0, 0, 255);

export const RoleNameOptionName = {

} as const;

@MouthwashRole("RoleName", RoleAlignment.Crewmate, roleNameColor, EmojiService.getEmoji("crewmate"))
@RoleObjective("Role Objective")
export class RoleName extends BaseRole {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const roleNameProbability = gameOptions.get("");
        if (roleNameProbability && roleNameProbability.getValue<NumberValue>().value > 0) {

        }

        return roleOptions as Map<string, RoleGameOption>;
    }



    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);
    }

    async onReady() {}
    async onRemove() {}
}
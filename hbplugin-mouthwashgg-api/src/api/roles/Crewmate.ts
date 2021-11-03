import { Palette } from "mouthwash-types";

import { EmojiService, RoleAssignment } from "../../services";
import { BaseRole } from "../BaseRole";
import { StartGameScreen } from "../interfaces";
import { RoleAlignment } from "../enums";
import { MouthwashRole, RoleObjective } from "../hooks";

@MouthwashRole("Crewmate", RoleAlignment.Crewmate, Palette.crewmateBlue(), EmojiService.getEmoji("crewmate"))
@RoleObjective(`Finish your tasks`)
export class Crewmate extends BaseRole {
    getStartGameScreen(playerRoles: RoleAssignment[], impostorCount: number): StartGameScreen {
        const subtitleText = impostorCount === 1
            ? `There is ${impostorCount} ${Palette.impostorRed().text("Impostor")} among us`
            : `There are ${impostorCount} ${Palette.impostorRed().text("Impostors")} among us`;

        return {
          titleText: "Crewmate",
          subtitleText: subtitleText,
          backgroundColor: Palette.crewmateBlue(),
          teamPlayers: RoleAlignment.Crewmate
        };
    }

    async onReady() {
        
    }
}
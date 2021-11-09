import { Palette } from "mouthwash-types";

import { EmojiService, RoleAssignment } from "..";
import { BaseRole } from "../../api/BaseRole";
import { StartGameScreen } from "../../api/interfaces";
import { RoleAlignment } from "../../api/enums";
import { MouthwashRole, RoleObjective } from "../../api/hooks";

@MouthwashRole("Crewmate", RoleAlignment.Crewmate, Palette.crewmateBlue, EmojiService.getEmoji("crewmate"))
@RoleObjective(`Finish your tasks`)
export class Crewmate extends BaseRole {
    getStartGameScreen(playerRoles: RoleAssignment[], impostorCount: number): StartGameScreen {
        const subtitleText = impostorCount === 1
            ? `There is ${impostorCount} ${Palette.impostorRed.text("Impostor")} among us`
            : `There are ${impostorCount} ${Palette.impostorRed.text("Impostors")} among us`;

        return {
            titleText: "Crewmate",
            subtitleText: subtitleText,
            backgroundColor: Palette.crewmateBlue,
            teamPlayers: RoleAlignment.All
        };
    }

    async onReady() {
        
    }
}
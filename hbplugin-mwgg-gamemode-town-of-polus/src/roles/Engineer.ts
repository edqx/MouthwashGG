import { BaseRole, Button, MouthwashRole, RoleAlignment, RoleButton, RoleGameOption, RoleObjective } from "hbplugin-mouthwashgg-api";
import { EnumValue, GameOption, NumberValue, RGBA } from "mouthwash-types";
import { TownOfPolusOptionName, TownofPolusOptions } from "../gamemode";

const engineerColor = new RGBA(248, 191, 20, 255);

@MouthwashRole("Engineer", RoleAlignment.Crewmate, engineerColor)
@RoleObjective("Maintain the outpost")
export class Engineer extends BaseRole {
    static getGameOptions(gameOptions: Map<keyof TownofPolusOptions, GameOption>) {
        const engineerOptions = new Map<any, any>([]);

        const engineerProbability = gameOptions.get(TownOfPolusOptionName.EngineerProbability);
        if (engineerProbability) {
            if (engineerProbability.getValue<NumberValue>().value > 0) {
                engineerOptions.set(TownOfPolusOptionName.EngineerUses, new RoleGameOption(TownOfPolusOptionName.EngineerUses, new EnumValue([ "Per Round", "Per Match", "Ok" ], 0)));
            }
        }

        return engineerOptions as Map<string, RoleGameOption>;
    }

    private fixButton?: Button;

    async onReady() {
        this.fixButton = await this.api.buttonService.spawnButton(
            this.player,
            "fix-button",
            {

            }
        );
    }
}
import { AssetReference, BaseRole, Button, MouthwashRole, RoleAlignment, RoleGameOption, RoleObjective } from "hbplugin-mouthwashgg-api";
import { EnumValue, GameOption, NumberValue, RGBA } from "mouthwash-types";
import { TownOfPolusOptionName, TownofPolusOptions } from "../gamemode";

const engineerColor = new RGBA(248, 191, 20, 255);
const fixAsset = new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Fix.png");

@MouthwashRole("Engineer", RoleAlignment.Crewmate, engineerColor)
@RoleObjective("Maintain the outpost")
export class Engineer extends BaseRole {
    static getGameOptions(gameOptions: Map<keyof TownofPolusOptions, GameOption>) {
        const engineerOptions = new Map<any, any>([]);

        const engineerProbability = gameOptions.get(TownOfPolusOptionName.EngineerProbability);
        if (engineerProbability && engineerProbability.getValue<NumberValue>().value > 0) {
            engineerOptions.set(TownOfPolusOptionName.EngineerUses, new RoleGameOption(TownOfPolusOptionName.EngineerUses, new EnumValue([ "Per Round", "Per Match" ], 0)));
        }

        return engineerOptions as Map<string, RoleGameOption>;
    }

    async onReady() {
        const button = await this.spawnButton("fix-button1", fixAsset, {});

        button.on("mwgg.button.click", ev => ev.cancel());
    }
}
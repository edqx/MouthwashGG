import { PlayerData } from "@skeldjs/hindenburg";
import { RGBA } from "mouthwash-types";
import { RoleAlignment } from "../enums";

export interface StartGameScreen {
    titleText: string;
    subtitleText: string;
    backgroundColor: RGBA;
    teamPlayers: PlayerData[]|RoleAlignment;
}
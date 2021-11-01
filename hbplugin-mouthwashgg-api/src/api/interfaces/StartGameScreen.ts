import { PlayerData } from "@skeldjs/hindenburg";
import { RGBA } from "mouthwash-types";

export interface StartGameScreen {
    titleText: string;
    subtitleText: string;
    backgroundColor: RGBA;
    teamPlayers: PlayerData[];
}
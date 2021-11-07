import { PlayerData } from "@skeldjs/hindenburg";
import { RGBA, WinSound } from "mouthwash-types";
import { AudioAsset } from "../..";
import { RoleAlignment } from "../enums";

export interface EndGameScreen {
    titleText: string;
    subtitleText: string;
    backgroundColor: RGBA;
    yourTeam?: PlayerData[]|RoleAlignment;
    winSound: WinSound|AudioAsset;
    hasWon: boolean;
}
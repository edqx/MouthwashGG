import { PlayerData } from "@skeldjs/hindenburg";
import { RGBA, WinSound } from "mouthwash-types";
import { AssetReference, AudioAsset } from "../../services";
import { RoleAlignment } from "../enums";

export interface EndGameScreen {
    titleText: string;
    subtitleText: string;
    backgroundColor: RGBA;
    yourTeam?: PlayerData[]|RoleAlignment;
    winSound: WinSound|AudioAsset|AssetReference;
    hasWon: boolean;
}
import { RGBA } from "mouthwash-types";
import { Emoji } from "../../services";
import { RoleAlignment } from "../enums";

export interface RoleMetadata {
    roleName: string;
    roleObjective: string;
    alignment: RoleAlignment;
    themeColor: RGBA;
    emoji: Emoji;
}

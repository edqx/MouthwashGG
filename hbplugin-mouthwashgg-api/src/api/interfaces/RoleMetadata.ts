import { RGBA } from "mouthwash-types";
import { RoleAlignment } from "../enums";

export interface RoleMetadata {
    roleName: string;
    roleObjective: string;
    alignment: RoleAlignment;
    themeColor: RGBA;
}

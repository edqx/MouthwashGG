import { RGBA } from "mouthwash-types";
import { Emoji } from "../../services";
import { RoleMetadata } from "../interfaces";
import { RoleAlignment } from "../enums";
import { RoleCtr, UntypedRoleCtr } from "../BaseRole";
import { getRoleObjective } from "./RoleObjective";

const mouthwashRoleKey = Symbol("mouthwash:roleMetadata");

export function MouthwashRole(roleName: string, alignment: RoleAlignment, themeColor: RGBA, emoji: Emoji) {
    if (alignment === RoleAlignment.All) {
        throw new Error("Cannot create role with 'All' alignment");
    }

    return function<T extends UntypedRoleCtr>(constructor: T) {
        Reflect.defineMetadata(mouthwashRoleKey, true, constructor);

        const roleMetadata: RoleMetadata = {
            roleName,
            roleObjective: getRoleObjective(constructor) || "",
            alignment,
            themeColor,
            emoji
        };

        return class extends constructor {
            static metadata = roleMetadata;
            metadata = roleMetadata;

            constructor(...args: any) {
                super(...args);
            }
        }
    }
}

export function isMouthwashRole(pluginCtr: RoleCtr) {
    return Reflect.hasMetadata(mouthwashRoleKey, pluginCtr);
}
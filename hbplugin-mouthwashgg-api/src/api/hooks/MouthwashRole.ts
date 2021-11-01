import { RGBA } from "mouthwash-types";
import { RoleMetadata } from "../interfaces";
import { RoleAlignment } from "../enums";
import { RoleCtr } from "../Role";
import { getRoleObjective } from "./RoleObjective";

const mouthwashRoleKey = Symbol("mouthwash:roleMetadata");

export function MouthwashRole(roleName: string, alignment: RoleAlignment, themeColor: RGBA) {
    return function<T extends RoleCtr>(constructor: T) {
        Reflect.defineMetadata(mouthwashRoleKey, true, constructor);

        const roleMetadata: RoleMetadata = {
            roleName,
            roleObjective: getRoleObjective(constructor) || "",
            alignment,
            themeColor
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
import { BaseGamemodePlugin } from "../BaseGamemodePlugin";
import { BaseRole } from "../Role";
import { isMouthwashRole } from "./MouthwashRole";

const registeredRolesKey = Symbol("mouthwash:registeredRoles");

export function RegisterRole(roleCtr: typeof BaseRole) {
    return function (gamemodeCtr: typeof BaseGamemodePlugin) {
        if (!isMouthwashRole(roleCtr)) {
            throw new Error("Tried to register a non-mouthwash role class, make sure you have used the @MouthwashRole decorator");
        }

        const cachedRoles = Reflect.getMetadata(registeredRolesKey, gamemodeCtr);
        const registeredRoles: typeof BaseRole[] = cachedRoles || [];
        if (!cachedRoles) {
            Reflect.defineMetadata(registeredRolesKey, registeredRoles, gamemodeCtr);
        }

        registeredRoles.push(roleCtr);
        
        return gamemodeCtr;
    }
}

export function getRegisteredRoles(gamemodeCtr: typeof BaseGamemodePlugin): typeof BaseRole[] {
    return Reflect.getMetadata(registeredRolesKey, gamemodeCtr) || [];
}
import { BaseGamemodePlugin } from "../BaseGamemodePlugin";
import { BaseRole, RoleCtr } from "../BaseRole";
import { isMouthwashRole } from "./MouthwashRole";

const mouthwashRegisteredRolesKey = Symbol("mouthwash:registeredRoles");

export function RegisterRole(roleCtr: RoleCtr) {
    return function<T extends typeof BaseGamemodePlugin>(gamemodeCtr: T) {
        if (!isMouthwashRole(roleCtr)) {
            throw new Error("Tried to register a non-mouthwash role class, make sure you have used the @MouthwashRole decorator");
        }

        const cachedRoles = Reflect.getMetadata(mouthwashRegisteredRolesKey, gamemodeCtr);
        const registeredRoles: RoleCtr[] = cachedRoles || [];
        if (!cachedRoles) {
            Reflect.defineMetadata(mouthwashRegisteredRolesKey, registeredRoles, gamemodeCtr);
        }

        registeredRoles.push(roleCtr);
        
        return gamemodeCtr;
    }
}

export function getRegisteredRoles(gamemodeCtr: typeof BaseGamemodePlugin): typeof BaseRole[] {
    return Reflect.getMetadata(mouthwashRegisteredRolesKey, gamemodeCtr) || [];
}
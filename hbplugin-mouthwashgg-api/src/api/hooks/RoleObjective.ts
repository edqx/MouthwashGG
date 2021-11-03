import { RoleCtr } from "../BaseRole";

const roleObjectiveKey = Symbol("mouthwash:role.objective");

export function RoleObjective(roleObjective: string) {
    return function<T extends RoleCtr>(constructor: T) {
        Reflect.defineMetadata(roleObjectiveKey, roleObjective, constructor);
        
        return constructor;
    }
}

export function getRoleObjective(pluginCtr: RoleCtr) {
    return Reflect.getMetadata(roleObjectiveKey, pluginCtr);
}
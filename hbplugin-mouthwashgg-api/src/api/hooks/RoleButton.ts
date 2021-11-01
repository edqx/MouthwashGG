import { Button } from "../../services";
import { RoleCtr } from "../Role";

const roleButtonKey = Symbol("mouthwash:roleButtonMetadata");

export function RoleButton(buttonId: string) {
    return Reflect.metadata(roleButtonKey, buttonId);
}

export function getRoleButton(pluginCtr: RoleCtr) {
    return Reflect.getMetadata(roleButtonKey, pluginCtr);
}
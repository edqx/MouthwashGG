import { PlayerData } from "@skeldjs/hindenburg";
import { BaseRole } from "../../api";

export class RoleService {
    playerRoles: WeakMap<PlayerData, BaseRole>;

    constructor() {
        this.playerRoles = new WeakMap;
    }

    getPlayerRole(player: PlayerData) {
        return this.playerRoles.get(player);
    }
}
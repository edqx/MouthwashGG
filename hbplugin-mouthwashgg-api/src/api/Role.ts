import { PlayerData, Room } from "@skeldjs/hindenburg";
import { AnyGameOptionType, GameOption } from "mouthwash-types";
import { MouthwashApiPlugin } from "../plugin";
import { RoleMetadata, StartGameScreen } from "./interfaces";

export class RoleGameOption {
    constructor(
        public readonly key: string,
        public readonly value: AnyGameOptionType
    ) {}
}

export class BaseRole {
    static metadata: RoleMetadata;
    metadata!: RoleMetadata;

    static getGameOptions(gameOptions: Map<string, GameOption>): Map<string, RoleGameOption> {
        return new Map;
    }

    room: Room;
    api: MouthwashApiPlugin;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        this.room = player.room;
        this.api = player.room.loadedPlugins.get("hbplugin-mouthwashgg-api") as MouthwashApiPlugin;

        if (!this.api) {
            throw new Error("Mouthwash API was not loaded on room");
        }
    }

    async onReady() {}

    getTeamPlayers() {
        const playersOnTeam = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole && playerRole.metadata.alignment === this.metadata.alignment) {
                playersOnTeam.push(player);
            }
        }
        return playersOnTeam;
    }

    getStartGameScreen(): StartGameScreen {
        return {
            titleText: this.metadata.roleName,
            subtitleText: this.metadata.roleObjective,
            backgroundColor: this.metadata.themeColor,
            teamPlayers: this.getTeamPlayers()
        };
    }
}

export interface RoleCtr {
    metadata: RoleMetadata;
    new(...args: any[]): BaseRole;
}
import { Room, RoomPlugin } from "@skeldjs/hindenburg";
import { GameOption } from "mouthwash-types";
import { BaseRole } from "./Role";
import { MouthwashApiPlugin } from "../plugin";

export interface GamemodeMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
}

export class BaseGamemodePlugin extends RoomPlugin {
    static gamemodeMetadata: GamemodeMetadata;
    gamemodeMetadata!: GamemodeMetadata;

    api: MouthwashApiPlugin;
    registeredRoles: typeof BaseRole[];

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.api = room.loadedPlugins.get("hbplugin-mouthwashgg-api") as MouthwashApiPlugin;
        this.registeredRoles = [];
    }

    onPluginLoad() {
        if (!this.api) {
            this.logger.warn("Loaded gamemode '" + this.meta.id + "' without mouthwash api loaded.");
            this.worker.pluginLoader.unloadPlugin(this, this.room);
        }
    }

    getGameOptions(): Map<string, GameOption> {
        return this.api.createDefaultOptions();
    }
}
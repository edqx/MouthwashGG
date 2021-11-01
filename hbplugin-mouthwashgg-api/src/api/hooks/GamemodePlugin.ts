import "reflect-metadata";

import { DeclaredPlugin, RoomPlugin, WorkerPlugin } from "@skeldjs/hindenburg";
import { GamemodeMetadata } from "../BaseGamemodePlugin";

const mouthwashGamemodeKey = Symbol("mouthwash:gamemode");

export function GamemodePlugin(metadata: GamemodeMetadata): any {
    return function<T extends DeclaredPlugin>(constructor: T) {
        Reflect.defineMetadata(mouthwashGamemodeKey, true, constructor);

        return class extends constructor {
            static gamemodeMetadata = metadata;
            gamemodeMetadata = metadata;
        };
    };
}

export function isMouthwashGamemode(pluginCtr: typeof WorkerPlugin|typeof RoomPlugin) {
    return Reflect.hasMetadata(mouthwashGamemodeKey, pluginCtr);
}
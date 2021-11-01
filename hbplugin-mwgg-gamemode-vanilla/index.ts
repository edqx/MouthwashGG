import {
    Color,
    EventListener,
    HindenburgPlugin,
    PlayerSetColorEvent,
    PreventLoad
} from "@skeldjs/hindenburg";

import {
    BaseGamemodePlugin,
    GamemodePlugin
} from "hbplugin-mouthwashgg-api";

@PreventLoad
@GamemodePlugin({
    id: "vanilla",
    name: "Vanilla",
    version: "1.0.0",
    description: "Good old classic Among Us.",
    author: "Edward Smale"
})
@HindenburgPlugin("hbplugin-mwgg-gamemode-vanilla", "1.0.0", "none")
export default class extends BaseGamemodePlugin {
    getGameOptions() {
        return new Map<any, any>([...this.api.createDefaultOptions()]);
    }

    @EventListener("hello")
    onPlayerSetColor(ev: PlayerSetColorEvent) {
        ev.setColor(Color.Blue);
    }
}
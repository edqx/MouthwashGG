import { PlayerData, Room, Vector2 } from "@skeldjs/hindenburg";
import { AnyGameOptionType, EdgeAlignment, GameOption, Palette } from "mouthwash-types";
import { AssetBundle, AssetReference, ButtonSpawnInfo, RoleAssignment } from "../services";
import { MouthwashApiPlugin } from "../plugin";
import { RoleMetadata, StartGameScreen } from "./interfaces";
import { RoleRegisteredEventListenerInfo } from "./hooks";

export class RoleGameOption {
    constructor(
        public readonly key: string,
        public readonly value: AnyGameOptionType
    ) {}
}

const baseButtonPosition = new Vector2(-2.1, -0.7);

export class BaseRole {
    static metadata: RoleMetadata;
    metadata!: RoleMetadata;

    static getGameOptions(gameOptions: Map<string, GameOption>): Map<string, RoleGameOption> {
        return new Map;
    }

    room: Room;
    api: MouthwashApiPlugin;

    registeredEventListeners: RoleRegisteredEventListenerInfo[];

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        this.room = player.room;
        this.api = player.room.loadedPlugins.get("hbplugin-mouthwashgg-api") as MouthwashApiPlugin;

        this.registeredEventListeners = [];

        if (!this.api) {
            throw new Error("Mouthwash API was not loaded on room");
        }
    }

    async onReady() {}

    async spawnButton(buttonId: string, assetRef: AssetReference, buttonInfo: Partial<ButtonSpawnInfo>) {
        const playerButtons = this.api.buttonService.getButtons(this.player);

        const cachedButton = playerButtons.get(buttonId);
        if (cachedButton) {
            return cachedButton;
        }

        const row = playerButtons.size % 2;
        const column = Math.floor(playerButtons.size / 2);

        const assetBundle = await AssetBundle.loadFromUrl(assetRef.bundleLocation, false);
        const asset = assetBundle.getAssetSafe(assetRef.assetPath);

        const connection = this.room.connections.get(this.player.clientId);
        if (connection) {
            await this.api.assetLoader.assertLoaded(
                connection,
                assetBundle
            );
            await this.api.assetLoader.waitForLoaded(connection, assetBundle);
        }

        const spawnInfo: ButtonSpawnInfo = {
            position: baseButtonPosition
                .add(new Vector2(
                    column * -1.4,
                    row * -1.4
                )),
            alignment: EdgeAlignment.RightBottom,
            asset,
            maxTimer: 10,
            currentTime: 10,
            saturated: false,
            color: Palette.white(),
            isCountingDown: true,
            z: -9,
            attachedTo: -1,
            keys: [],
            ...buttonInfo
        };

        return await this.api.buttonService.spawnButton(
            this.player,
            buttonId,
            spawnInfo
        );
    }

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

    getStartGameScreen(playerRoles: RoleAssignment[], impostorCount: number): StartGameScreen {
        return {
            titleText: this.metadata.roleName,
            subtitleText: this.metadata.roleObjective,
            backgroundColor: this.metadata.themeColor,
            teamPlayers: this.getTeamPlayers()
        };
    }

    getHudText() {
        return this.metadata.themeColor.text("Role: " + this.metadata.roleName + "\n" + this.metadata.roleObjective);
    }
}

export interface RoleCtr<T extends BaseRole = BaseRole> {
    metadata: RoleMetadata;
    new(player: PlayerData<Room>): T;
}

export interface UntypedRoleCtr {
    metadata: RoleMetadata;
    new(...args: any): BaseRole;
}
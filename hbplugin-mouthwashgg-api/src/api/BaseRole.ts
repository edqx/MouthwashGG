import { PlayerData, Room, Vector2 } from "@skeldjs/hindenburg";
import { AnyGameOptionType, EdgeAlignment, GameOption, HudLocation, Palette, Priority } from "mouthwash-types";
import { AssetBundle, AssetReference, ButtonSpawnInfo, RoleAssignment } from "../services";
import { MouthwashApiPlugin } from "../plugin";
import { RoleMetadata, StartGameScreen } from "./interfaces";
import { RoleRegisteredEventListenerInfo } from "./hooks";
import { RoleAlignment } from ".";

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
    async onRemove() {}

    async spawnButton(buttonId: string, assetRef: AssetReference, buttonInfo: Partial<ButtonSpawnInfo>) {
        const playerButtons = this.api.hudService.getPlayerHud(this.player).buttons;

        const cachedButton = playerButtons.get(buttonId);
        if (cachedButton) {
            return cachedButton;
        }

        const row = playerButtons.size % 2;
        const column = Math.floor(playerButtons.size / 2);

        const asset = await this.api.assetLoader.resolveAssetReferenceFor(assetRef, [ this.player ]);

        if (!asset)
            return undefined;

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
            color: Palette.white,
            isCountingDown: true,
            z: -9,
            attachedTo: -1,
            keys: [],
            ...buttonInfo
        };

        return await this.api.hudService.spawnButton(
            this.player,
            buttonId,
            spawnInfo
        );
    }

    async giveFakeTasks() {
        await Promise.all([
            this.api.hudService.setTaskInteraction(this.player, false),
            this.api.hudService.setHudStringFor(HudLocation.TaskText, "fake-tasks", Palette.impostorRed.text("Fake tasks:"), Priority.Z, [ this.player ])
        ]);
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
            teamPlayers: this.metadata.alignment === RoleAlignment.Impostor
                ? RoleAlignment.Impostor
                : RoleAlignment.All
        };
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
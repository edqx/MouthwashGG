import {
    Connection,
    EventListener,
    Room,
    RoomPlugin,
    HindenburgPlugin,
    PlayerSendChatEvent,
    PlayerJoinEvent,
    PlayerLeaveEvent,
    PlayerData,
    PlayerCheckNameEvent,
    RoomSelectImpostorsEvent,
    RoomGameStartEvent,
    GameMap,
    sleep,
    PlayerMurderEvent,
    RoomFixedUpdateEvent,
    PlayerDieEvent
} from "@skeldjs/hindenburg";

import {
    AnyGameOptions,
    GameOption,
    EnumValue,
    NumberValue,
    BooleanValue,
    FetchResponseType,
    HudLocation,
    Palette
} from "mouthwash-types";

import {
    AnimationService,
    AssetLoaderService,
    ButtonService,
    CameraControllerService,
    ChatService,
    DefaultRoomOptionName,
    DefaultRoomCategoryName,
    GameOptionPriority,
    GameOptionsService,
    HudService,
    NameService,
    QrCodeService,
    RoleService,
    SoundService,
    SpoofInfoService,
    AssetBundle
} from "./services";

import { ButtonFixedUpdateEvent, ClientFetchResourceResponseEvent, MouthwashUpdateGameOptionEvent } from "./events";
import { BaseGamemodePlugin, getRegisteredBundles, getRegisteredRoles, isMouthwashGamemode } from "./api";

const mapNameToGameMap = {
    "The Skeld": GameMap.TheSkeld,
    "MiraHQ": GameMap.MiraHQ,
    "Polus": GameMap.Polus,
    "Airship": GameMap.Airship,
};

@HindenburgPlugin("hbplugin-mouthwashgg-api", "1.0.0", "last")
export class MouthwashApiPlugin extends RoomPlugin {
    animationService: AnimationService;
    assetLoader: AssetLoaderService;
    buttonService: ButtonService;
    cameraControllers: CameraControllerService;
    chatService: ChatService;
    gameOptions: GameOptionsService;
    hudService: HudService;
    nameService: NameService;
    qrCodeService: QrCodeService;
    roleService: RoleService;
    soundService: SoundService;
    spoofInfo: SpoofInfoService;

    gamemode?: BaseGamemodePlugin;

    allGamemodes: Map<string, typeof BaseGamemodePlugin>;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.animationService = new AnimationService(this);
        this.assetLoader = new AssetLoaderService(this);
        this.buttonService = new ButtonService(this);
        this.cameraControllers = new CameraControllerService(this);
        this.chatService = new ChatService(this);
        this.gameOptions = new GameOptionsService(this);
        this.hudService = new HudService(this);
        this.nameService = new NameService(this);
        this.qrCodeService = new QrCodeService(this);
        this.roleService = new RoleService(this);
        this.soundService = new SoundService(this);
        this.spoofInfo = new SpoofInfoService;

        this.allGamemodes = new Map;
    }
    
    getConnections(players: PlayerData[]|undefined) {
        return players
            ? players
                .map(player => this.room.connections.get(player.clientId))
                .filter(_ => _) as Connection[]
            : undefined;
    }

    async onPluginLoad() {
        if (!this.room.config.serverAsHost)
            this.room.setSaaHEnabled(true);

        for (const [ , importedPlugin ] of this.worker.pluginLoader.roomPlugins) {
            if (isMouthwashGamemode(importedPlugin)) {
                const gamemodePlugin = importedPlugin as typeof BaseGamemodePlugin;
                this.allGamemodes.set(gamemodePlugin.gamemodeMetadata.name, gamemodePlugin);
            }
        }

        await this.assetLoader.loadGlobalAsset();
    }

    createDefaultOptions() {
        return new Map<string, GameOption>([
            [DefaultRoomOptionName.Map, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.Map, new EnumValue([ "The Skeld", "Polus", "Mira HQ", "Airship" ], 0), GameOptionPriority.A)],
            [DefaultRoomOptionName.ImpostorCount, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.ImpostorCount, new NumberValue(2, 1, 1, 3, false, "{0} Impostors"), GameOptionPriority.A + 1)],
            [DefaultRoomOptionName.MaxPlayerCount, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.MaxPlayerCount, new NumberValue(15, 1, 4, 15, false, "{0} Players"), GameOptionPriority.A + 2)],
            [DefaultRoomOptionName.PlayerSpeed, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.PlayerSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), GameOptionPriority.A + 3)],
            [DefaultRoomOptionName.AnonymousVotes, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.AnonymousVotes, new BooleanValue(false), GameOptionPriority.B)],
            [DefaultRoomOptionName.ConfirmEjects, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.ConfirmEjects, new BooleanValue(false), GameOptionPriority.B + 1)],
            [DefaultRoomOptionName.DiscussionTime, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.DiscussionTime, new NumberValue(15, 15, 0, 300, false, "{0}s"), GameOptionPriority.B + 2)],
            [DefaultRoomOptionName.VotingTime, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.VotingTime, new NumberValue(150, 30, 0, 300, true, "{0}s"), GameOptionPriority.B + 3)],
            [DefaultRoomOptionName.EmergencyCooldown, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.EmergencyCooldown, new NumberValue(20, 5, 0, 60, false, "{0}s"), GameOptionPriority.B + 4)],
            [DefaultRoomOptionName.EmergencyMeetings, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.EmergencyMeetings, new NumberValue(1, 1, 0, 9, false, "{0} Buttons"), GameOptionPriority.B + 5)],
            [DefaultRoomOptionName.VisualTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.VisualTasks, new BooleanValue(false), GameOptionPriority.C)],
            [DefaultRoomOptionName.TaskBarUpdates, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.TaskBarUpdates, new EnumValue(["Always", "Meetings", "Never"], 0), GameOptionPriority.C + 1)],
            [DefaultRoomOptionName.CommonTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.CommonTasks, new NumberValue(1, 1, 0, 2, false, "{0} tasks"), GameOptionPriority.C + 2)],
            [DefaultRoomOptionName.LongTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.LongTasks, new NumberValue(2, 1, 0, 3, false, "{0} tasks"), GameOptionPriority.C + 3)],
            [DefaultRoomOptionName.ShortTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.ShortTasks, new NumberValue(3, 1, 0, 5, false, "{0} tasks"), GameOptionPriority.C + 4)],
            [DefaultRoomOptionName.CrewmateVision, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.CrewmateVision, new NumberValue(0.75, 0.25, 0.25, 3, false, "{0}x"), GameOptionPriority.D)],
            [DefaultRoomOptionName.ImpostorVision, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorVision, new NumberValue(0.75, 0.25, 0.25, 3, false, "{0}x"), GameOptionPriority.D + 1)],
            [DefaultRoomOptionName.ImpostorKillCooldown, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorKillCooldown, new NumberValue(30, 2.5, 5, 60, false, "{0}s"), GameOptionPriority.D + 2)],
            [DefaultRoomOptionName.ImpostorKillDistance, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorKillDistance, new EnumValue(["Short", "Normal", "Long"], 0), GameOptionPriority.D + 3)]
        ]);
    }

    async setGamemode(gamemodePluginCtr: typeof BaseGamemodePlugin, doTransition: boolean) {
        if (this.gamemode) {
            this.worker.pluginLoader.unloadPlugin(this.gamemode, this.room);
        }

        const gamemodePlugin = await this.worker.pluginLoader.loadPlugin(gamemodePluginCtr, this.room) as BaseGamemodePlugin;

        const registeredRoles = getRegisteredRoles(gamemodePluginCtr);
        for (const registeredRole of registeredRoles) {
            gamemodePlugin.registeredRoles.push(registeredRole);
        }

        const registeredBundles = getRegisteredBundles(gamemodePluginCtr);
        const promises = [];
        for (const registeredBundle of registeredBundles) {
            promises.push(AssetBundle.loadFromUrl(registeredBundle, false));
        }
        gamemodePlugin.registeredBundles = await Promise.all(promises);

        this.gamemode = gamemodePlugin;
        if (doTransition) {
            await this.doGameOptionTransition();
        }
    }

    async doGameOptionTransition() {
        if (this.gamemode) {
            let help = 0;
            while (true) {
                const newGameOptions = this.gamemode.getGameOptions();

                let i = 0;
                for (const registeredRole of this.gamemode.registeredRoles) {
                    const roleOptions = registeredRole.getGameOptions(this.gameOptions.gameOptions);
                    for (const [ key, option ] of roleOptions) {
                        newGameOptions.set(key, new GameOption(DefaultRoomCategoryName.Config, option.key, option.value, GameOptionPriority.F + i));
                        i++;
                    }
                }

                for (const [ , option ] of newGameOptions) {
                    const cachedValue = this.gameOptions.getCachedValue(option);
                    if (cachedValue) {
                        option.setValue(cachedValue);
                    }
                }

                if (!await this.gameOptions.transitionTo(newGameOptions))
                    break;

                help++;
                if (help >= 5) {
                    this.logger.warn("2 options with the same names in 2 different categories likely have the same name and is causing an infinite loop, breaking..")
                    break;
                }
            }
        }
    }

    @EventListener("player.join")
    async onPlayerJoin(ev: PlayerJoinEvent<Room>) {
        const connection = ev.room.connections.get(ev.player.clientId);

        if (!connection)
            return;
            
        await this.assetLoader.assertLoaded(
            connection,
            this.assetLoader.globalAssets!
        );
    }

    @EventListener("player.leave")
    async onPlayerLeave(ev: PlayerLeaveEvent<Room>) {
        this.cameraControllers.despawnCamera(ev.player);
        this.buttonService.despawnAllButtons(ev.player);
    }

    @EventListener("player.checkname")
    async onCheckName(ev: PlayerCheckNameEvent<Room>) {
        ev.cancel();

        if (ev.player.info) {
            ev.player.info.name = ev.alteredName;
        }

        await this.nameService.updateAllNames();
        
        const connection = ev.room.connections.get(ev.player.clientId);

        if (!connection)
            return;

        if (ev.player.isHost) {
            this.gameOptions.createOption(
                new GameOption(
                    DefaultRoomCategoryName.None,
                    DefaultRoomOptionName.Gamemode,
                    new EnumValue([ ...this.allGamemodes.keys() ], 0),
                    GameOptionPriority.A
                )
            );

            const tempGamemode = [...this.allGamemodes.values()][0];
            this.setGamemode(tempGamemode, true);
        } else {
            this.gameOptions.syncFor(connection);
        }
        
        await this.cameraControllers.spawnCameraFor(ev.player);
        
        if (this.room["actingHostWaitingFor"] === ev.player) {
            if (this.room.actingHostsEnabled) {
                for (const actingHostId of this.room.actingHostIds) {
                    const actingHostConn = this.room.connections.get(actingHostId);
                    if (actingHostConn) {
                        await this.room.updateHost(actingHostId, actingHostConn);
                    }
                }
            }
            this.room["actingHostWaitingFor"] = undefined;
        }
    }

    @EventListener("room.fixedupdate")
    async onRoomFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        const players = [];
        for (const [ , player ] of this.room.players) {
            players.push(player);
        }
        await this.room.emit(new ButtonFixedUpdateEvent(players));
    }

    @EventListener("mwgg.gameoption.update")
    async onGameOptionUpdate(ev: MouthwashUpdateGameOptionEvent) {
        if (ev.optionKey === DefaultRoomOptionName.Gamemode) {
            const newValue = ev.getNewValue<EnumValue<string>>().selectedOption;
            if (ev.getOldValue<EnumValue<string>>().selectedOption !== newValue) {
                await this.setGamemode(this.allGamemodes.get(newValue)!, false);
            }
        }

        if (this.gamemode) {
            await this.doGameOptionTransition();
        }
    }

    @EventListener("mwgg.client.fetchresponse")
    onFetchResponse(ev: ClientFetchResourceResponseEvent) {
        const assetBundle = this.assetLoader.getWaitingFor(ev.client).get(ev.resourceId);

        if (!assetBundle)
            return;

        if (ev.response.responseType === FetchResponseType.Failed) {
            this.logger.warn("Failed to load asset bundle %s for %s (%s)",
                assetBundle.url, ev.client, ev.response.reason);
            return ev.client.disconnect("Failed to load asset bundle: " + assetBundle.url + " (" + ev.response.reason + ")"); // todo: report these somehow
        }

        if (ev.response.responseType === FetchResponseType.Invalid) {
            this.logger.warn("Invalid asset bundle hash for %s for %s (%s)",
                assetBundle.url, ev.client, assetBundle.fileHash);
            return ev.client.disconnect("Invalid asset bundle hash: " + assetBundle.url + " (" + assetBundle.fileHash + ")");
        }

        if (ev.response.responseType === FetchResponseType.Ended) {
            this.assetLoader.onLoaded(ev.client, assetBundle);
        }
    }

    @EventListener("player.chat")
    async onPlayerChat(ev: PlayerSendChatEvent<Room>) {
        if (ev.message?.canceled)
            return;

        ev.message?.cancel();

        const recipients = this.chatService.getStandardRecipients(ev.player);
        const appearance = this.chatService.getStandardAppearance(ev.player, false);
        const chatMessage = this.chatService.createMessageFor(ev.chatMessage, appearance, ev.player, recipients);

        await this.chatService.broadcastMessage(chatMessage);
    }

    @EventListener("room.selectimpostors")
    async onSelectImpostors(ev: RoomSelectImpostorsEvent<Room>) {
        ev.setImpostors([]);
    }

    @EventListener("room.gamestart")
    async onGameStart(ev: RoomGameStartEvent<Room>) {
        const mapGameOption = this.gameOptions.gameOptions.get(DefaultRoomOptionName.Map);
        const selectedMap = mapGameOption?.getValue<EnumValue<keyof typeof mapNameToGameMap>>().selectedOption;
    
        this.room.settings.map = mapNameToGameMap[selectedMap || "The Skeld"];

        if (this.gamemode) {
            const promises = [];
            for (const [ , connection ] of this.room.connections) {
                for (const assetBundle of this.gamemode.registeredBundles) {
                    await this.assetLoader.assertLoaded(connection, assetBundle);
                    promises.push(this.assetLoader.waitForLoaded(connection, assetBundle));
                }
            }
            await Promise.all(promises);
        }

        sleep(500).then(async () => {
            const roleAssignments = this.roleService.getRoleAssignments(this.gamemode?.getRoleCounts() || []);
            await this.roleService.assignAllRoles(roleAssignments);
        });
    }

    @EventListener("player.die")
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        this.hudService.addHudStringFor(
            HudLocation.TaskText,
            "you-died-text",
            Palette.impostorRed().text("You died"),
            [ ev.player ]
        );
    }
}